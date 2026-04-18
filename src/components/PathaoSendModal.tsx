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

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
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
      const label = variant ? `${name} (${variant})` : name;
      return `${label} x${i.quantity || 1}`;
    }).join(" / ");
    const totalQty = items.reduce((s, i) => s + Number(i.quantity || 1), 0) || 1;
    const addressParts = [order.customer_address, order.city, order.zip_code].filter(Boolean);

    setForm((p) => ({
      ...p,
      recipient_name: order.customer_name || "",
      recipient_phone: order.customer_phone || order.phone || "",
      recipient_address: addressParts.join(", ") || order.customer_address || "",
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

  // Cascade: load zones when city changes
  useEffect(() => {
    if (!form.recipient_city) { setZones([]); setAreas([]); return; }
    setLoadingZones(true);
    setForm((p) => ({ ...p, recipient_zone: 0, recipient_area: 0 }));
    setAreas([]);
    api.admin.pathaoZones(form.recipient_city)
      .then((r) => setZones(r.items || []))
      .catch(() => setZones([]))
      .finally(() => setLoadingZones(false));
  }, [form.recipient_city]);

  // Cascade: load areas when zone changes (areas are optional in Pathao)
  useEffect(() => {
    if (!form.recipient_zone) { setAreas([]); return; }
    setLoadingAreas(true);
    setForm((p) => ({ ...p, recipient_area: 0 }));
    api.admin.pathaoAreas(form.recipient_zone)
      .then((r) => setAreas(r.items || []))
      .catch(() => setAreas([]))
      .finally(() => setLoadingAreas(false));
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

        <div>
          <label className={lbl}>Address *</label>
          <textarea className={fld} rows={2} value={form.recipient_address}
            onChange={(e) => setForm((p) => ({ ...p, recipient_address: e.target.value }))} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={lbl}>City * {loadingCities && <span className="text-gray-400">(loading…)</span>}</label>
            <select className={fld} value={form.recipient_city}
              onChange={(e) => setForm((p) => ({ ...p, recipient_city: Number(e.target.value) }))}>
              <option value={0}>Select city</option>
              {cities.map((c) => <option key={c.city_id} value={c.city_id}>{c.city_name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Zone * {loadingZones && <span className="text-gray-400">(loading…)</span>}</label>
            <select className={fld} value={form.recipient_zone} disabled={!form.recipient_city}
              onChange={(e) => setForm((p) => ({ ...p, recipient_zone: Number(e.target.value) }))}>
              <option value={0}>Select zone</option>
              {zones.map((z) => <option key={z.zone_id} value={z.zone_id}>{z.zone_name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Area {loadingAreas && <span className="text-gray-400">(loading…)</span>}</label>
            <select className={fld} value={form.recipient_area} disabled={!form.recipient_zone}
              onChange={(e) => setForm((p) => ({ ...p, recipient_area: Number(e.target.value) }))}>
              <option value={0}>Optional</option>
              {areas.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
            </select>
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
            <select className={fld} value={form.delivery_type}
              onChange={(e) => setForm((p) => ({ ...p, delivery_type: Number(e.target.value) }))}>
              <option value={48}>Normal</option>
              <option value={12}>On-demand</option>
            </select>
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
