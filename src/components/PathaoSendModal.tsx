"use client";

/**
 * Prefill modal for sending a single order to Pathao.
 *
 * Pathao requires city/zone/area IDs that we don't store on the order, so we
 * surface a review form: name/phone/address are prefilled from the order, and
 * city → zone → area cascade dropdowns let the user pick the right destination
 * before submission. Submit posts the full payload to /admin/courier/pathao
 * via api.admin.sendToPathaoWithPayload (which the route merges over its
 * auto-built payload).
 */

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import InlineSelect from "@/components/InlineSelect";
import { api } from "@/lib/api";

interface OrderLite {
  id: number;
  customer_name?: string;
  customer_phone?: string;
  phone?: string;
  customer_address?: string;
  city?: string;
  zip_code?: string;
  total?: number | string;
  notes?: string;
  items?: { product_name?: string; productName?: string; variant_label?: string; variantLabel?: string; quantity?: number }[];
}

interface City { city_id: number; city_name: string }
interface Zone { zone_id: number; zone_name: string }
interface Area { area_id: number; area_name: string }

export default function PathaoSendModal({
  open,
  order,
  onClose,
  onSent,
}: {
  open: boolean;
  order: OrderLite | null;
  onClose: () => void;
  onSent: (consignmentId: string) => void;
}) {
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Auto-match (Pathao address parser via merchant panel token)
  const [autoMatching, setAutoMatching] = useState(false);
  const [autoMatchInfo, setAutoMatchInfo] = useState<{ score?: number; source?: string; city?: string; zone?: string; area?: string } | null>(null);
  const [autoMatchError, setAutoMatchError] = useState<string | null>(null);

  // Customer history (past Pathao deliveries for this phone)
  const [history, setHistory] = useState<Array<{ name?: string; address?: string; city_id?: number; city_name?: string; zone_id?: number; zone_name?: string; area_id?: number | null; area_name?: string | null }>>([]);
  const [customerRating, setCustomerRating] = useState<{ rating?: string; total?: number; success?: number } | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // When auto-match or history-pick sets city/zone/area together, skip the
  // cascade-reset effects below (they normally wipe child selects on parent change).
  const skipCascadeRef = useRef(false);

  const [form, setForm] = useState({
    recipient_name: "",
    recipient_phone: "",
    recipient_address: "",
    recipient_city: 0,
    recipient_zone: 0,
    recipient_area: 0,
    item_quantity: 1,
    item_weight: 0.5,
    amount_to_collect: 0,
    item_description: "",
    special_instruction: "",
    delivery_type: 48, // 48 = normal, 12 = on-demand
    item_type: 2,      // 1 = document, 2 = parcel
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from order whenever modal opens
  useEffect(() => {
    if (!open || !order) return;
    setError(null);
    const items = order.items || [];
    const itemsDesc = items.map((i) => {
      const name = i.productName || i.product_name || "";
      const variant = i.variantLabel || i.variant_label;
      const label = variant ? `${name} – ${variant}` : name;
      return `${label} x ${i.quantity || 1}`;
    }).join(" / ");
    const totalQty = items.reduce((s, i) => s + Number(i.quantity || 1), 0) || 1;
    // Address: customer-typed address only. Don't append `order.city` (shipping
    // zone label like "ঢাকার ভিতরে") or zip — Pathao parses city/zone from its
    // own city/zone selectors below, and the courier label muddies the address.

    setForm((p) => ({
      ...p,
      recipient_name: order.customer_name || "",
      recipient_phone: order.customer_phone || order.phone || "",
      recipient_address: order.customer_address || "",
      item_quantity: totalQty,
      amount_to_collect: Math.round(Number(order.total || 0)),
      item_description: itemsDesc,
      special_instruction: order.notes || "",
    }));
  }, [open, order]);

  // Load cities once on first open
  useEffect(() => {
    if (!open || cities.length > 0) return;
    setLoadingCities(true);
    api.admin.pathaoCities()
      .then((r) => setCities(r.items || []))
      .catch(() => setError("Failed to load cities"))
      .finally(() => setLoadingCities(false));
  }, [open, cities.length]);

  // Auto-match: debounced address parser. Pathao's address-parser endpoint
  // returns district_id (= city_id), zone_id, area_id directly — apply them.
  // Triggers only when phone is set (parser API requires recipient_identifier)
  // and address is non-trivial.
  useEffect(() => {
    if (!open) return;
    const addr = form.recipient_address.trim();
    const phone = form.recipient_phone.trim();
    if (addr.length < 8 || phone.length < 10) return;

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setAutoMatching(true);
      setAutoMatchError(null);
      try {
        const res = await api.admin.pathaoParseAddress(addr, phone);
        if (ctrl.signal.aborted) return;
        const d = res.data;
        if (d?.district_id && d?.zone_id) {
          skipCascadeRef.current = true;
          setForm((p) => ({
            ...p,
            recipient_city: d.district_id!,
            recipient_zone: d.zone_id!,
            recipient_area: d.area_id || 0,
          }));
          setAutoMatchInfo({
            score: d.score,
            source: d.source,
            city: d.district_name || undefined,
            zone: d.zone_name || undefined,
            area: d.area_name || undefined,
          });
        } else {
          setAutoMatchInfo(null);
        }
      } catch (err) {
        if (!ctrl.signal.aborted) {
          setAutoMatchInfo(null);
          setAutoMatchError(err instanceof Error ? err.message : "Auto-match failed");
        }
      } finally {
        if (!ctrl.signal.aborted) setAutoMatching(false);
      }
    }, 700);

    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [open, form.recipient_address, form.recipient_phone]);

  // Customer history: fetch past Pathao deliveries for this phone (loads once
  // per phone change). Lets user click a previous address to fill the form.
  useEffect(() => {
    if (!open) return;
    const phone = form.recipient_phone.trim();
    if (phone.length < 10) { setHistory([]); setCustomerRating(null); return; }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await api.admin.pathaoCustomerHistory(phone);
        if (ctrl.signal.aborted) return;
        const ab = res.data?.address_book || [];
        // De-duplicate by address text — same address often appears multiple times
        const seen = new Set<string>();
        const dedup = ab.filter((e) => {
          const key = (e.customer_address || "").trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setHistory(dedup.map((e) => ({
          name: e.customer_name,
          address: e.customer_address,
          city_id: e.customer_city_id,
          city_name: e.customer_city_name,
          zone_id: e.customer_zone_id,
          zone_name: e.customer_zone_name,
          area_id: e.customer_area_id,
          area_name: e.customer_area_name,
        })));
        const c = res.data?.customer;
        setCustomerRating({
          rating: res.data?.customer_rating,
          total: c?.total_delivery,
          success: c?.successful_delivery,
        });
      } catch {
        if (!ctrl.signal.aborted) { setHistory([]); setCustomerRating(null); }
      }
    }, 600);

    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [open, form.recipient_phone]);

  // Cascade: load zones when city changes. Skip the reset when the change
  // came from auto-match / history pick (zone+area were set in the same tick).
  useEffect(() => {
    if (!form.recipient_city) { setZones([]); setAreas([]); return; }
    setLoadingZones(true);
    if (!skipCascadeRef.current) {
      setForm((p) => ({ ...p, recipient_zone: 0, recipient_area: 0 }));
      setAreas([]);
    }
    api.admin.pathaoZones(form.recipient_city)
      .then((r) => setZones(r.items || []))
      .catch(() => setZones([]))
      .finally(() => setLoadingZones(false));
  }, [form.recipient_city]);

  // Cascade: load areas when zone changes (areas are optional in Pathao)
  useEffect(() => {
    if (!form.recipient_zone) { setAreas([]); return; }
    setLoadingAreas(true);
    if (!skipCascadeRef.current) {
      setForm((p) => ({ ...p, recipient_area: 0 }));
    }
    api.admin.pathaoAreas(form.recipient_zone)
      .then((r) => setAreas(r.items || []))
      .catch(() => setAreas([]))
      .finally(() => {
        setLoadingAreas(false);
        // Reset the skip flag after both cascades have processed.
        skipCascadeRef.current = false;
      });
  }, [form.recipient_zone]);

  const handleSubmit = async () => {
    if (!order) return;
    if (!form.recipient_city || !form.recipient_zone) {
      setError("City and Zone are required");
      return;
    }
    if (!form.recipient_name || !form.recipient_phone || !form.recipient_address) {
      setError("Name, phone and address are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        recipient_name: form.recipient_name,
        recipient_phone: form.recipient_phone,
        recipient_address: form.recipient_address,
        recipient_city: Number(form.recipient_city),
        recipient_zone: Number(form.recipient_zone),
        item_quantity: Number(form.item_quantity) || 1,
        item_weight: Number(form.item_weight) || 0.5,
        amount_to_collect: Number(form.amount_to_collect) || 0,
        item_description: form.item_description,
        special_instruction: form.special_instruction,
        delivery_type: Number(form.delivery_type),
        item_type: Number(form.item_type),
      };
      if (form.recipient_area) payload.recipient_area = Number(form.recipient_area);

      const res = await api.admin.sendToPathaoWithPayload(order.id, payload);
      const cid = res.consignment_id || res.order?.consignment_id;
      if (cid) {
        onSent(String(cid));
        onClose();
      } else {
        setError(res.message || "Failed to send");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fld = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]";
  const lbl = "block text-xs font-semibold text-gray-600 mb-1";

  return (
    <Modal open={open} onClose={() => !submitting && onClose()} title="Send to Pathao" size="lg">
      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Recipient Name *</label>
            <input className={fld} value={form.recipient_name}
              onChange={(e) => setForm((p) => ({ ...p, recipient_name: e.target.value }))} />
          </div>
          <div>
            <label className={lbl}>Phone *</label>
            <input className={fld} value={form.recipient_phone}
              onChange={(e) => setForm((p) => ({ ...p, recipient_phone: e.target.value }))} />
          </div>
        </div>

        {/* Customer rating + history (from Pathao past deliveries) */}
        {(customerRating?.total ?? 0) > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs">
            <div className="flex items-center gap-3">
              <span className={`px-2 py-0.5 rounded font-semibold ${
                customerRating?.rating === "excellent_customer" ? "bg-green-100 text-green-700" :
                customerRating?.rating === "good_customer" ? "bg-blue-100 text-blue-700" :
                "bg-yellow-100 text-yellow-700"
              }`}>
                {customerRating?.rating?.replace(/_/g, " ") || "rated"}
              </span>
              <span className="text-gray-600">
                {customerRating?.success}/{customerRating?.total} delivered
              </span>
            </div>
            {history.length > 0 && (
              <button type="button" onClick={() => setShowHistory((v) => !v)}
                className="text-[var(--primary)] font-medium hover:underline">
                {showHistory ? "Hide" : `${history.length} past address${history.length > 1 ? "es" : ""}`}
              </button>
            )}
          </div>
        )}
        {showHistory && history.length > 0 && (
          <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
            {history.map((h, i) => (
              <button key={i} type="button"
                onClick={() => {
                  skipCascadeRef.current = true;
                  setForm((p) => ({
                    ...p,
                    recipient_name: h.name || p.recipient_name,
                    recipient_address: h.address || p.recipient_address,
                    recipient_city: h.city_id || 0,
                    recipient_zone: h.zone_id || 0,
                    recipient_area: h.area_id || 0,
                  }));
                  setAutoMatchInfo({ city: h.city_name, zone: h.zone_name, area: h.area_name || undefined, source: "history" });
                  setShowHistory(false);
                }}
                className="w-full text-left p-2.5 hover:bg-gray-50 transition-colors">
                <div className="text-xs font-medium text-gray-800 truncate">{h.name || "—"}</div>
                <div className="text-xs text-gray-500 truncate">{h.address}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{h.city_name} → {h.zone_name}{h.area_name ? ` → ${h.area_name}` : ""}</div>
              </button>
            ))}
          </div>
        )}

        <div>
          <label className={lbl}>
            Address *
            {autoMatching && <span className="ml-2 text-gray-400">(auto-matching…)</span>}
          </label>
          <textarea className={fld} rows={2} value={form.recipient_address}
            onChange={(e) => setForm((p) => ({ ...p, recipient_address: e.target.value }))} />
          {autoMatchInfo && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1.5">
              <span>✓ Auto-matched:</span>
              <span className="font-medium">{autoMatchInfo.city} → {autoMatchInfo.zone}{autoMatchInfo.area ? ` → ${autoMatchInfo.area}` : ""}</span>
              {typeof autoMatchInfo.score === "number" && (
                <span className="ml-auto text-gray-500">score {autoMatchInfo.score.toFixed(1)}</span>
              )}
            </div>
          )}
          {autoMatchError && (
            <div className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              {autoMatchError}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={lbl}>City * {loadingCities && <span className="text-gray-400">(loading…)</span>}</label>
            <InlineSelect
              fullWidth
              placeholder="Select city"
              value={String(form.recipient_city || "")}
              options={[
                { value: "", label: "Select city" },
                ...cities.map((c) => ({ value: String(c.city_id), label: c.city_name })),
              ]}
              onChange={(v) => setForm((p) => ({ ...p, recipient_city: Number(v) || 0 }))}
            />
          </div>
          <div>
            <label className={lbl}>Zone * {loadingZones && <span className="text-gray-400">(loading…)</span>}</label>
            {form.recipient_city ? (
              <InlineSelect
                fullWidth
                placeholder="Select zone"
                value={String(form.recipient_zone || "")}
                options={[
                  { value: "", label: "Select zone" },
                  ...zones.map((z) => ({ value: String(z.zone_id), label: z.zone_name })),
                ]}
                onChange={(v) => setForm((p) => ({ ...p, recipient_zone: Number(v) || 0 }))}
              />
            ) : (
              <button type="button" disabled
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed">
                <span>Pick city first</span>
              </button>
            )}
          </div>
          <div>
            <label className={lbl}>Area {loadingAreas && <span className="text-gray-400">(loading…)</span>}</label>
            {form.recipient_zone ? (
              <InlineSelect
                fullWidth
                placeholder="Optional"
                value={String(form.recipient_area || "")}
                options={[
                  { value: "", label: "Optional" },
                  ...areas.map((a) => ({ value: String(a.area_id), label: a.area_name })),
                ]}
                onChange={(v) => setForm((p) => ({ ...p, recipient_area: Number(v) || 0 }))}
              />
            ) : (
              <button type="button" disabled
                className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed">
                <span>Pick zone first</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={lbl}>Quantity</label>
            <input type="number" min={1} className={fld} value={form.item_quantity}
              onChange={(e) => setForm((p) => ({ ...p, item_quantity: Number(e.target.value) }))} />
          </div>
          <div>
            <label className={lbl}>Weight (kg)</label>
            <input type="number" step="0.1" min={0.1} className={fld} value={form.item_weight}
              onChange={(e) => setForm((p) => ({ ...p, item_weight: Number(e.target.value) }))} />
          </div>
          <div>
            <label className={lbl}>COD (৳)</label>
            <input type="number" min={0} className={fld} value={form.amount_to_collect}
              onChange={(e) => setForm((p) => ({ ...p, amount_to_collect: Number(e.target.value) }))} />
          </div>
          <div>
            <label className={lbl}>Type</label>
            <InlineSelect
              fullWidth
              value={String(form.delivery_type)}
              options={[
                { value: "48", label: "Normal" },
                { value: "12", label: "On-demand" },
              ]}
              onChange={(v) => setForm((p) => ({ ...p, delivery_type: Number(v) }))}
            />
          </div>
        </div>

        <div>
          <label className={lbl}>Item Description</label>
          <input className={fld} value={form.item_description}
            onChange={(e) => setForm((p) => ({ ...p, item_description: e.target.value }))} />
        </div>

        <div>
          <label className={lbl}>Special Instruction</label>
          <textarea className={fld} rows={2} value={form.special_instruction}
            onChange={(e) => setForm((p) => ({ ...p, special_instruction: e.target.value }))} />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={submitting}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={submitting}
            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-semibold hover:bg-[var(--primary-light)] disabled:opacity-50">
            {submitting ? "Sending…" : "Send to Pathao"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
