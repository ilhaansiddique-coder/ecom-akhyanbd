// Shared helpers for the mobile banner routes. Lives outside route.ts so Next
// doesn't treat the extra exports as route handlers.

export type BannerRow = {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  image: string | null;
  gradient: string | null;
  emoji: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
};

export function toAdminBanner(b: BannerRow) {
  return {
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    description: b.description,
    buttonText: b.buttonText,
    buttonUrl: b.buttonUrl,
    image: b.image,
    gradient: b.gradient,
    emoji: b.emoji,
    position: b.position,
    sortOrder: b.sortOrder,
    isActive: b.isActive,
  };
}

// Accepts both camelCase (Flutter mobile clients) and snake_case (legacy admin).
export function pickBannerFields(body: Record<string, unknown>) {
  const get = (camel: string, snake: string) =>
    body[camel] !== undefined ? body[camel] : body[snake];
  return {
    title: get("title", "title") as string | undefined,
    subtitle: get("subtitle", "subtitle") as string | null | undefined,
    description: get("description", "description") as string | null | undefined,
    buttonText: get("buttonText", "button_text") as string | null | undefined,
    buttonUrl: get("buttonUrl", "button_url") as string | null | undefined,
    image: get("image", "image") as string | null | undefined,
    gradient: get("gradient", "gradient") as string | null | undefined,
    emoji: get("emoji", "emoji") as string | null | undefined,
    position: get("position", "position") as string | undefined,
    sortOrder: get("sortOrder", "sort_order") as number | undefined,
    isActive: get("isActive", "is_active") as boolean | undefined,
  };
}
