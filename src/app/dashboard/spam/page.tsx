import { getSessionUser } from "@/lib/auth";
import { isStaffOrAdmin } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";
import SpamClient from "./SpamClient";

export const dynamic = "force-dynamic";

// Spam page is now fully client-driven (tabs / search / drawer / filters).
// SSR pre-fetch dropped because the new aggregation endpoint runs JS-side
// reduce that's hard to mirror in SSR without duplicating the Prisma calls.
// Initial render shows skeleton; first tab fetches on mount.
export default async function SpamPage() {
  const user = await getSessionUser();
  if (!user || !isStaffOrAdmin(user.role)) redirect("/cdlogin");
  return <SpamClient />;
}
