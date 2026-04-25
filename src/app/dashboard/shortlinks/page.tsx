import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import ShortlinksClient from "./ShortlinksClient";

export const dynamic = "force-dynamic";

export default async function ShortlinksPage() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");
  return <ShortlinksClient />;
}
