/**
 * Steadfast Courier API Integration
 * API Base: https://portal.packzy.com/api/v1
 *
 * Keys are read from:
 * 1. Database (site_settings table) — set via Settings dashboard
 * 2. .env fallback (STEADFAST_API_KEY, STEADFAST_SECRET_KEY)
 */

import { prisma } from "./prisma";

const API_BASE = "https://portal.packzy.com/api/v1";

// ─── Key cache (5 min TTL) ───
let cachedKeys: { apiKey: string; secretKey: string } | null = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function getKeys(): Promise<{ apiKey: string; secretKey: string }> {
  if (cachedKeys && Date.now() < cacheExpiry) return cachedKeys;
  try {
    const [apiKeySetting, secretKeySetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: "steadfast_api_key" } }),
      prisma.siteSetting.findUnique({ where: { key: "steadfast_secret_key" } }),
    ]);
    const apiKey = apiKeySetting?.value || process.env.STEADFAST_API_KEY || "";
    const secretKey = secretKeySetting?.value || process.env.STEADFAST_SECRET_KEY || "";
    cachedKeys = { apiKey, secretKey };
    cacheExpiry = Date.now() + CACHE_TTL;
    return cachedKeys;
  } catch {
    return { apiKey: process.env.STEADFAST_API_KEY || "", secretKey: process.env.STEADFAST_SECRET_KEY || "" };
  }
}

export function clearKeyCache() { cachedKeys = null; cacheExpiry = 0; }

async function apiHeaders() {
  const { apiKey, secretKey } = await getKeys();
  return { "Content-Type": "application/json", "Api-Key": apiKey, "Secret-Key": secretKey };
}

export async function isSteadfastConfigured(): Promise<boolean> {
  const { apiKey, secretKey } = await getKeys();
  return !!(apiKey && secretKey);
}

export async function isSteadfastEnabled(): Promise<boolean> {
  try {
    const s = await prisma.siteSetting.findUnique({ where: { key: "steadfast_enabled" } });
    if (s?.value === "false" || s?.value === "0") return false;
    return await isSteadfastConfigured();
  } catch { return false; }
}

export async function isAutoSendEnabled(): Promise<boolean> {
  try {
    const s = await prisma.siteSetting.findUnique({ where: { key: "steadfast_auto_send" } });
    return s?.value === "true" || s?.value === "1";
  } catch { return false; }
}

// ─── API Functions ───

export interface SteadfastOrder {
  invoice: string; recipient_name: string; recipient_phone: string;
  recipient_address: string; cod_amount: number; note?: string;
  item_description?: string;
}

export interface SteadfastCreateResponse {
  status: number; message?: string;
  consignment?: { consignment_id: string; tracking_code?: string; status?: string };
  errors?: Record<string, string[]>;
}

export async function sendToSteadfast(order: SteadfastOrder): Promise<SteadfastCreateResponse> {
  const { apiKey, secretKey } = await getKeys();
  // Steadfast API accepts both JSON and form-data — use form-data for better compatibility
  const formData = new URLSearchParams();
  formData.append("invoice", order.invoice);
  formData.append("recipient_name", order.recipient_name);
  formData.append("recipient_phone", order.recipient_phone);
  formData.append("recipient_address", order.recipient_address);
  formData.append("cod_amount", String(order.cod_amount));
  if (order.note) formData.append("note", order.note);
  if (order.item_description) formData.append("item_description", order.item_description);

  const res = await fetch(`${API_BASE}/create_order`, {
    method: "POST",
    headers: { "Api-Key": apiKey, "Secret-Key": secretKey, "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });
  return res.json();
}

export interface SteadfastBulkResponse {
  status: number; message?: string;
  data?: Array<{
    invoice: string; recipient_name: string; recipient_phone: string;
    recipient_address: string; cod_amount: string; note: string | null;
    consignment_id: number | null; tracking_code: string | null; status: string;
  }>;
}

export async function sendBulkToSteadfast(orders: SteadfastOrder[]): Promise<SteadfastBulkResponse> {
  const { apiKey, secretKey } = await getKeys();
  const res = await fetch(`${API_BASE}/create_order/bulk-order`, {
    method: "POST",
    headers: { "Api-Key": apiKey, "Secret-Key": secretKey, "Content-Type": "application/json" },
    body: JSON.stringify(orders),
  });
  return res.json();
}

export interface SteadfastStatusResponse {
  status: number; delivery_status?: string;
  consignment?: { consignment_id: string; tracking_code?: string; status?: string; recipient_name?: string; recipient_phone?: string; recipient_address?: string; cod_amount?: number };
}

export async function checkDeliveryStatus(consignmentId: string): Promise<SteadfastStatusResponse> {
  const res = await fetch(`${API_BASE}/status_by_cid/${consignmentId}`, { method: "GET", headers: await apiHeaders() });
  return res.json();
}

export interface SteadfastBalanceResponse { status: number; current_balance?: number; }

export async function checkBalance(): Promise<SteadfastBalanceResponse> {
  const res = await fetch(`${API_BASE}/get_balance`, { method: "GET", headers: await apiHeaders() });
  return res.json();
}

export interface SteadfastFraudResponse { status: number | string; total_parcels?: number; total_delivered?: number; success_ratio?: string; }

export async function checkCourierScore(phone: string): Promise<SteadfastFraudResponse> {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const res = await fetch(`${API_BASE}/fraud_check/${cleanPhone}`, { method: "GET", headers: await apiHeaders() });
  const data = await res.json();
  const totalParcels = data.total_parcels || 0;
  const totalDelivered = data.total_delivered || 0;
  const successRatio = totalParcels > 0 ? `${((totalDelivered / Math.max(1, totalParcels)) * 100).toFixed(1)}%` : "0.0%";
  return { ...data, success_ratio: successRatio };
}

export function formatPhone(phone: string): string {
  let digits = phone.replace(/[^0-9]/g, "");
  // Handle +880 prefix
  if (digits.startsWith("880")) digits = digits.slice(3);
  // Handle 0088 prefix
  if (digits.startsWith("0088")) digits = digits.slice(4);
  // Ensure starts with 01
  if (digits.length === 10 && !digits.startsWith("0")) digits = "0" + digits;
  if (digits.length === 11 && digits.startsWith("01")) return digits;
  // Last resort — take last 10 digits, add 0
  const last10 = digits.slice(-10);
  if (last10.startsWith("1")) return "0" + last10;
  return digits;
}

export function isValidBDPhone(phone: string): boolean {
  const formatted = formatPhone(phone);
  return /^01[3-9]\d{8}$/.test(formatted);
}

export function generateInvoice(orderId: number): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${orderId}`;
}
