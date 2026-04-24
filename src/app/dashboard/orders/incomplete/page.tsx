import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import IncompleteOrdersClient from "./IncompleteOrdersClient";

export const dynamic = "force-dynamic";

export default async function IncompleteOrdersPage() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");
  return <IncompleteOrdersClient />;
}
