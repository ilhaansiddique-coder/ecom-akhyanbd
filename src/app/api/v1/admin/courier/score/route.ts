import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonResponse, errorResponse, notFound } from "@/lib/api-response";
import { requireStaff } from "@/lib/auth-helpers";
import { isSteadfastEnabled, checkCourierScore as steadfastScore, formatPhone } from "@/lib/steadfast";
import { isPathaoEnabled } from "@/lib/pathao";

/**
 * Unified courier fraud-score check.
 *
 * POST /api/v1/admin/courier/score  { order_id } | { phone }
 *
 * Calls every enabled courier in parallel and returns per-courier breakdown
 * plus a combined aggregate (sum of parcels/delivered, weighted ratio).
 * Steadfast → /fraud_check, Pathao → merchant panel /user/success.
 *
 * Each courier degrades independently — one failing won't kill the others.
 * Combined success_ratio is what we persist on the order.
 */

interface ProviderResult {
  provider: "steadfast" | "pathao";
  ok: boolean;
  total_parcels: number;
  total_delivered: number;
  total_cancelled: number;
  success_ratio: string;
  rating?: string;
  error?: string;
}

async function scoreSteadfast(phone: string): Promise<ProviderResult> {
  try {
    const r = await steadfastScore(phone);
    const total = Number(r.total_parcels || 0);
    const delivered = Number(r.total_delivered || 0);
    return {
      provider: "steadfast",
      ok: true,
      total_parcels: total,
      total_delivered: delivered,
      total_cancelled: Math.max(0, total - delivered),
      success_ratio: r.success_ratio || (total > 0 ? `${((delivered / total) * 100).toFixed(1)}%` : "0.0%"),
    };
  } catch (e) {
    return { provider: "steadfast", ok: false, total_parcels: 0, total_delivered: 0, total_cancelled: 0, success_ratio: "0.0%", error: e instanceof Error ? e.message : "Steadfast failed" };
  }
}

async function scorePathao(phone: string): Promise<ProviderResult> {
  // Pathao Aladdin doesn't expose a fraud endpoint — use merchant panel
  // /user/success which returns total + successful delivery counts + rating.
  const tokenRow = await prisma.siteSetting.findUnique({ where: { key: "pathao_web_token" } });
  const token = tokenRow?.value?.trim();
  if (!token) {
    return { provider: "pathao", ok: false, total_parcels: 0, total_delivered: 0, total_cancelled: 0, success_ratio: "0.0%", error: "Pathao web token missing" };
  }
  try {
    const upstream = await fetch("https://merchant.pathao.com/api/v1/user/success", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://merchant.pathao.com",
        "Referer": "https://merchant.pathao.com/courier/orders/create",
      },
      body: JSON.stringify({ phone: formatPhone(phone) }),
      signal: AbortSignal.timeout(15000),
    });
    if (upstream.status === 401) {
      return { provider: "pathao", ok: false, total_parcels: 0, total_delivered: 0, total_cancelled: 0, success_ratio: "0.0%", error: "Pathao web token expired" };
    }
    const json = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return { provider: "pathao", ok: false, total_parcels: 0, total_delivered: 0, total_cancelled: 0, success_ratio: "0.0%", error: (json as { message?: string })?.message || `HTTP ${upstream.status}` };
    }
    const c = (json as { data?: { customer?: { total_delivery?: number; successful_delivery?: number }; customer_rating?: string } }).data;
    const total = Number(c?.customer?.total_delivery || 0);
    const delivered = Number(c?.customer?.successful_delivery || 0);
    return {
      provider: "pathao",
      ok: true,
      total_parcels: total,
      total_delivered: delivered,
      total_cancelled: Math.max(0, total - delivered),
      success_ratio: total > 0 ? `${((delivered / total) * 100).toFixed(1)}%` : "0.0%",
      rating: c?.customer_rating,
    };
  } catch (e) {
    return { provider: "pathao", ok: false, total_parcels: 0, total_delivered: 0, total_cancelled: 0, success_ratio: "0.0%", error: e instanceof Error ? e.message : "Pathao failed" };
  }
}

export async function POST(req: NextRequest) {
  try { await requireStaff(); } catch (e) { return e as Response; }

  const body = await req.json().catch(() => ({}));
  let phone: string | undefined = body.phone;
  let order: { id: number; customerPhone: string } | null = null;

  if (body.order_id) {
    order = await prisma.order.findUnique({ where: { id: Number(body.order_id) }, select: { id: true, customerPhone: true } });
    if (!order) return notFound("Order not found");
    phone = order.customerPhone;
  }

  if (!phone) return errorResponse("phone or order_id required", 400);

  const [stEnabled, pxEnabled] = await Promise.all([isSteadfastEnabled(), isPathaoEnabled()]);
  if (!stEnabled && !pxEnabled) {
    return errorResponse("No courier configured. Go to Settings → Courier.", 400);
  }

  const tasks: Promise<ProviderResult>[] = [];
  if (stEnabled) tasks.push(scoreSteadfast(phone));
  if (pxEnabled) tasks.push(scorePathao(phone));
  const providers = await Promise.all(tasks);

  // Combined aggregate (sum across successful providers)
  const okProviders = providers.filter(p => p.ok && p.total_parcels > 0);
  const total = okProviders.reduce((s, p) => s + p.total_parcels, 0);
  const delivered = okProviders.reduce((s, p) => s + p.total_delivered, 0);
  const cancelled = Math.max(0, total - delivered);
  const ratio = total > 0 ? `${((delivered / total) * 100).toFixed(1)}%` : "0.0%";

  // Persist combined ratio on the order (when order_id given and any provider succeeded)
  if (order && total > 0) {
    await prisma.order.update({ where: { id: order.id }, data: { courierScore: ratio } });
  }

  // Surface a useful error if every provider failed
  const allFailed = providers.length > 0 && providers.every(p => !p.ok);
  const message = allFailed ? providers.map(p => `${p.provider}: ${p.error}`).join(" · ") : undefined;

  return jsonResponse({
    success: !allFailed,
    message,
    total_parcels: total,
    total_delivered: delivered,
    total_cancelled: cancelled,
    success_ratio: ratio,
    providers,
  });
}

