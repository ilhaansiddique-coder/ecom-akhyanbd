import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import LanguageClient from "./LanguageClient";

export const dynamic = "force-dynamic";

export default async function LanguageSettingsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const rows = await prisma.siteSetting.findMany();
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value ?? ""]));
    return <LanguageClient initialData={settings} />;
  } catch {
    return <LanguageClient />;
  }
}
