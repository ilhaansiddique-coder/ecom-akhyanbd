import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const [data, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.user.count(),
    ]);

    const items = data.map((u) => ({
      id: u.id,
      name: u.fullName ?? "",
      email: u.email,
      phone: u.phone ?? undefined,
      address: u.address ?? undefined,
      role: u.role,
      created_at: u.createdAt?.toISOString() ?? "",
    }));

    return <UsersClient initialData={{ items, total }} />;
  } catch {
    return <UsersClient initialData={{ items: [], total: 0 }} />;
  }
}


