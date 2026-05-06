import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import FormSubmissionsClient from "./FormSubmissionsClient";

export const dynamic = "force-dynamic";

export default async function FormSubmissionsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") redirect("/cdlogin");

  try {
    const data = await prisma.formSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const items = data.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone ?? undefined,
      subject: s.subject ?? undefined,
      message: s.message,
      status: s.status,
      notes: s.notes ?? undefined,
      created_at: s.createdAt?.toISOString() ?? "",
    }));

    return <FormSubmissionsClient initialData={{ items }} />;
  } catch {
    return <FormSubmissionsClient initialData={{ items: [] }} />;
  }
}


