"use client";

/**
 * Bulk review modal for Pathao.
 *
 * Loads `bulk_preview` for the selected orders — server runs the address
 * parser per order and returns the auto-matched city/zone/area along with
 * the prefilled payload. User can edit any row's destination via cascading
 * city → zone → area dropdowns. Submit posts `bulk_send` with per-order
 * `overrides` so edited rows skip auto-match and use the chosen IDs.
 *
 * Rows with invalid phones or no match are highlighted; defaults from
 * Settings → Courier kick in for unmatched/unedited rows on the server.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/Modal";
import InlineSelect from "@/components/InlineSelect";
import { api } from "@/lib/api";

interface City { city_id: number; city_name: string }
interface Zone { zone_id: number; zone_name: string }
interface Area { area_id: number; area_name: string }

interface PreviewItem {
  order_id: number;
  customer_name: string;
  customer_phone: string;
  valid_phone: boolean;
  address: string;
  amount: number;
  item_quantity: number;
  item_description: string;
  special_instruction: string;
  matched: { city_id: number; city_name: string; zone_id: number; zone_name: string; area_id: number | null; area_name: string | null; score?: number } | null;
}

interface RowState {
  city_id: number;
  city_name: string;
  zone_id: number;
  zone_name: string;
  area_id: number;
  area_name: string;
  edited: boolean;
  zones?: Zone[];
  areas?: Area[];
  loadingZones?: boolean;
  loadingAreas?: boolean;
}

export default function PathaoBulkReviewModal({
  open,
  orderIds,
  onClose,
  onDone,
}: {
  open: boolean;
  orderIds: number[];
  onClose: () => void;
  onDone: (result: { sent: number; failed: number; results: Array<{ order_id: number; status: string; consignment_id?: string; error?: string }> }) => void;
}) {
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [rows, setRows] = useState<Record<number, RowState>>({});
  const [editing, setEditing] = useState<Record<number, boolean>>({});
  const [cities, setCities] = useState<City[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipCascadeRef = useRef<Record<number, boolean>>({});

  // Load preview + cities when modal opens
  useEffect(() => {
    if (!open || orderIds.length === 0) return;
    setError(null);
    setLoadingPreview(true);
    Promise.all([
      api.admin.pathaoBulkPreview(orderIds),
      cities.length === 0 ? api.admin.pathaoCities() : Promise.resolve({ items: cities }),
    ])
      .then(([prev, cit]) => {
        setItems(prev.items || []);
        if (cit?.items) setCities(cit.items);
        const init: Record<number, RowState> = {};
        for (const it of prev.items || []) {
          if (it.matched) {
            init[it.order_id] = {
              city_id: it.matched.city_id,
              city_name: it.matched.city_name,
              zone_id: it.matched.zone_id,
              zone_name: it.matched.zone_name,
              area_id: it.matched.area_id || 0,
              area_name: it.matched.area_name || "",
              edited: false,
            };
          } else {
            init[it.order_id] = { city_id: 0, city_name: "", zone_id: 0, zone_name: "", area_id: 0, area_name: "", edited: false };
          }
        }
        setRows(init);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load preview"))
      .finally(() => setLoadingPreview(false));
  }, [open, orderIds]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Reset on close
  useEffect(() => {
    if (!open) {
      setItems([]); setRows({}); setEditing({}); setError(null);
    }
  }, [open]);

  const stats = useMemo(() => {
    let matched = 0, unmatched = 0, invalid = 0, edited = 0;
    for (const it of items) {
      if (!it.valid_phone) { invalid++; continue; }
      const r = rows[it.order_id];
      if (r?.edited) edited++;
      if (r?.city_id && r?.zone_id) matched++;
      else unmatched++;
    }
    return { matched, unmatched, invalid, edited };
  }, [items, rows]);

  const updateRow = (orderId: number, patch: Partial<RowState>) => {
    setRows((p) => ({ ...p, [orderId]: { ...p[orderId], ...patch, edited: true } }));
  };

  const setCity = async (orderId: number, cityId: number, cityName: string) => {
    skipCascadeRef.current[orderId] = false;
    updateRow(orderId, { city_id: cityId, city_name: cityName, zone_id: 0, zone_name: "", area_id: 0, area_name: "", zones: [], areas: [], loadingZones: true });
    try {
      const r = await api.admin.pathaoZones(cityId);
      setRows((p) => ({ ...p, [orderId]: { ...p[orderId], zones: r.items || [], loadingZones: false } }));
    } catch {
      setRows((p) => ({ ...p, [orderId]: { ...p[orderId], loadingZones: false } }));
    }
  };

  const setZone = async (orderId: number, zoneId: number, zoneName: string) => {
    updateRow(orderId, { zone_id: zoneId, zone_name: zoneName, area_id: 0, area_name: "", areas: [], loadingAreas: true });
    try {
      const r = await api.admin.pathaoAreas(zoneId);
      setRows((p) => ({ ...p, [orderId]: { ...p[orderId], areas: r.items || [], loadingAreas: false } }));
    } catch {
      setRows((p) => ({ ...p, [orderId]: { ...p[orderId], loadingAreas: false } }));
    }
  };

  const setArea = (orderId: number, areaId: number, areaName: string) => {
    updateRow(orderId, { area_id: areaId, area_name: areaName });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const overrides: Record<number, { recipient_city: number; recipient_zone: number; recipient_area?: number }> = {};
    for (const it of items) {
      if (!it.valid_phone) continue;
      const r = rows[it.order_id];
      if (r?.city_id && r?.zone_id) {
        overrides[it.order_id] = {
          recipient_city: r.city_id,
          recipient_zone: r.zone_id,
          ...(r.area_id ? { recipient_area: r.area_id } : {}),
        };
      }
      // Rows with no city/zone selected → server uses default location.
    }
    try {
      const ids = items.filter((it) => it.valid_phone).map((it) => it.order_id);
      const res: any = await api.admin.pathaoBulkSendWithOverrides(ids, overrides);
      const sent = res.results?.filter((r: any) => r.status === "success").length || 0;
      const failed = res.results?.filter((r: any) => r.status === "error").length || 0;
      onDone({ sent, failed, results: res.results || [] });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleEdit = (orderId: number) => {
    setEditing((p) => ({ ...p, [orderId]: !p[orderId] }));
  };

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} title={`Review ${orderIds.length} orders for Pathao`} size="xl">
      <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {loadingPreview ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading & auto-matching addresses…</div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded font-medium">
                ✓ {stats.matched} matched
              </span>
              {stats.unmatched > 0 && (
                <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded font-medium">
                  ⚠ {stats.unmatched} unmatched (uses default)
                </span>
              )}
              {stats.invalid > 0 && (
                <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded font-medium">
                  ✗ {stats.invalid} invalid phone (skipped)
                </span>
              )}
              {stats.edited > 0 && (
                <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                  ✎ {stats.edited} edited
                </span>
              )}
            </div>

            {/* Rows */}
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {items.map((it) => {
                const r = rows[it.order_id];
                const isEditing = !!editing[it.order_id];
                const matched = r?.city_id && r?.zone_id;
                const rowBg = !it.valid_phone ? "bg-red-50/50" : matched ? "" : "bg-amber-50/40";
                return (
                  <div key={it.order_id} className={`p-3 ${rowBg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-semibold text-gray-800">#{it.order_id}</span>
                          <span className="text-gray-700">{it.customer_name}</span>
                          <span className="text-gray-400">·</span>
                          <span className={it.valid_phone ? "text-gray-600" : "text-red-600 font-medium"}>{it.customer_phone}</span>
                          <span className="text-gray-400">·</span>
                          <span className="text-gray-700">৳{it.amount}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate" title={it.address}>{it.address}</div>
                      </div>
                      <div className="text-right">
                        {!it.valid_phone ? (
                          <span className="text-xs text-red-600 font-medium">invalid phone</span>
                        ) : matched ? (
                          <div className="text-xs">
                            <div className="font-medium text-green-700">
                              {r?.edited ? "✎ " : "✓ "}{r?.city_name} → {r?.zone_name}
                            </div>
                            {r?.area_name && <div className="text-gray-500">{r.area_name}</div>}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-700 font-medium">no match</span>
                        )}
                        {it.valid_phone && (
                          <button type="button" onClick={() => toggleEdit(it.order_id)}
                            className="mt-1 text-[11px] text-[var(--primary)] hover:underline">
                            {isEditing ? "Close" : (matched ? "Edit" : "Pick location")}
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing && it.valid_phone && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <InlineSelect
                          fullWidth
                          placeholder="City"
                          value={String(r?.city_id || "")}
                          options={[
                            { value: "", label: "Select city" },
                            ...cities.map((c) => ({ value: String(c.city_id), label: c.city_name })),
                          ]}
                          onChange={(v) => {
                            const c = cities.find((x) => x.city_id === Number(v));
                            if (c) setCity(it.order_id, c.city_id, c.city_name);
                          }}
                        />
                        {r?.city_id ? (
                          <InlineSelect
                            fullWidth
                            placeholder={r?.loadingZones ? "Loading…" : "Zone"}
                            value={String(r?.zone_id || "")}
                            options={[
                              { value: "", label: "Select zone" },
                              ...(r?.zones || []).map((z) => ({ value: String(z.zone_id), label: z.zone_name })),
                            ]}
                            onChange={(v) => {
                              const z = (r?.zones || []).find((x) => x.zone_id === Number(v));
                              if (z) setZone(it.order_id, z.zone_id, z.zone_name);
                            }}
                          />
                        ) : (
                          <button type="button" disabled className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400">Pick city first</button>
                        )}
                        {r?.zone_id ? (
                          <InlineSelect
                            fullWidth
                            placeholder={r?.loadingAreas ? "Loading…" : "Area (optional)"}
                            value={String(r?.area_id || "")}
                            options={[
                              { value: "", label: "Optional" },
                              ...(r?.areas || []).map((a) => ({ value: String(a.area_id), label: a.area_name })),
                            ]}
                            onChange={(v) => {
                              const a = (r?.areas || []).find((x) => x.area_id === Number(v));
                              setArea(it.order_id, a?.area_id || 0, a?.area_name || "");
                            }}
                          />
                        ) : (
                          <button type="button" disabled className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400">Pick zone first</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {items.length === 0 && !loadingPreview && (
                <div className="p-6 text-center text-sm text-gray-500">No orders to preview.</div>
              )}
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {stats.invalid > 0 && `${stats.invalid} order(s) with invalid phone will be skipped.`}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting || loadingPreview || items.length === 0}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-light)] disabled:opacity-50">
              {submitting ? "Sending…" : `Send ${items.filter((i) => i.valid_phone).length} orders`}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
