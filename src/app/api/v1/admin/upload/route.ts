import { NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { jsonResponse, errorResponse } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  let admin;
  try { admin = await requireAdmin(); } catch (e) { return e as Response; }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return errorResponse("No file provided", 422);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = path.extname(file.name);
    const basename = path.basename(file.name, ext);
    const uniqueName = `${basename}-${Date.now()}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, uniqueName);
    await writeFile(filePath, buffer);

    const url = `/uploads/${uniqueName}`;

    return jsonResponse({ url, path: url }, 201);
  } catch (error) {
    return errorResponse("Failed to upload file", 500);
  }
}
