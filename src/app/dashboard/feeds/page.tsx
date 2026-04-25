import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import FeedsClient from "./FeedsClient";

export const dynamic = "force-dynamic";

export default async function FeedsPage() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");
  return <FeedsClient />;
}
