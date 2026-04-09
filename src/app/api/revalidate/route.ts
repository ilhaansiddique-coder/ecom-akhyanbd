import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== (process.env.REVALIDATE_SECRET || "mabheshoj-revalidate-2024")) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  // "layout" type revalidates the page AND all fetch data cache under it
  revalidatePath("/", "layout");

  return NextResponse.json({ revalidated: true, now: Date.now() });
}
