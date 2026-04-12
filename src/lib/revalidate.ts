import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Revalidate all cached pages and data when admin makes changes.
 * Ensures frontend reflects changes instantly.
 */
export function revalidateAll(...tags: string[]) {
  // Revalidate specific data tags
  for (const tag of tags) {
    try { revalidateTag(tag, "max"); } catch {}
  }

  // Revalidate all pages (clears full route cache)
  try { revalidatePath("/", "layout"); } catch {}
}
