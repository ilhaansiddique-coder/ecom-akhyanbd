import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import SpamClient from "./SpamClient";

export const dynamic = "force-dynamic";

export default async function SpamPage() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");

  try {
    const [flaggedData, flaggedTotal, blockedIpsData] = await Promise.all([
      prisma.order.findMany({
        where: { riskScore: { gte: 30 } },
        include: { fingerprint: true },
        orderBy: { riskScore: "desc" },
        take: 20,
      }),
      prisma.order.count({ where: { riskScore: { gte: 30 } } }),
      prisma.blockedIp.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

    const flaggedOrders = flaggedData.map((o) => ({
      id: o.id,
      customer_name: o.customerName,
      customer_phone: o.customerPhone ?? "",
      customer_address: o.customerAddress ?? "",
      city: o.city ?? "",
      total: Number(o.total),
      status: o.status,
      fp_hash: o.fpHash ?? "",
      risk_score: o.riskScore ?? 0,
      created_at: o.createdAt?.toISOString() ?? "",
      fingerprint: o.fingerprint ? {
        risk_flags: (o.fingerprint as any).riskFlags ?? "",
        fill_duration_ms: (o.fingerprint as any).fillDurationMs ?? 0,
        mouse_movements: (o.fingerprint as any).mouseMovements ?? 0,
        paste_detected: (o.fingerprint as any).pasteDetected ?? false,
        honeypot_triggered: (o.fingerprint as any).honeypotTriggered ?? false,
        ip_address: (o.fingerprint as any).ipAddress ?? "",
      } : undefined,
    }));

    const blockedIps = blockedIpsData.map((ip) => ({
      id: ip.id,
      ip_address: ip.ipAddress,
      reason: ip.reason ?? "",
      created_at: ip.createdAt?.toISOString() ?? "",
    }));

    return <SpamClient initialData={{ flaggedOrders, flaggedTotal, blockedIps }} />;
  } catch {
    return <SpamClient initialData={{ flaggedOrders: [], flaggedTotal: 0, blockedIps: [] }} />;
  }
}
