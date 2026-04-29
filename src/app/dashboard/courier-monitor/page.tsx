import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import CourierMonitorClient from "./CourierMonitorClient";

export const dynamic = "force-dynamic";

export default async function CourierMonitorPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/dashboard");
  return <CourierMonitorClient />;
}
