import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ShortlinkAnalyticsClient from "./ShortlinkAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function ShortlinkAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");

  const { id } = await params;
  const idNum = Number(id);
  if (!idNum) notFound();
  const link = await prisma.shortlink.findUnique({ where: { id: idNum } });
  if (!link) notFound();

  return (
    <ShortlinkAnalyticsClient
      id={link.id}
      slug={link.slug}
      targetUrl={link.targetUrl}
    />
  );
}
