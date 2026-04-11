import { prisma } from "./prisma";
import { makeBanglaSlug } from "./bangla-slug";

/**
 * Generate a unique slug for any model with a `slug` field.
 * If the slug already exists, appends -2, -3, etc.
 */
export async function uniqueSlug(
  name: string,
  model: "product" | "category" | "brand" | "blogPost" | "landingPage",
  existingSlug?: string | null,
  excludeId?: number
): Promise<string> {
  let slug = existingSlug || makeBanglaSlug(name);
  if (!slug) slug = `item-${Date.now()}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = prisma[model] as any;

  // Check if slug is already taken (excluding current record for updates)
  let existing = await db.findFirst({
    where: {
      slug,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (!existing) return slug;

  // Append number to make unique
  let counter = 2;
  while (existing) {
    const candidate = `${slug}-${counter}`;
    existing = await db.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (!existing) return candidate;
    counter++;
  }

  return slug;
}
