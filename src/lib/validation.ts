import { z } from "zod";

// ─── Reusable field types ───
// Use these everywhere to ensure consistent handling of form data.
// z.coerce automatically converts strings/null to the correct type.

/** Number field — converts strings & null to number. Use for price, stock, IDs, etc. */
const num = z.coerce.number();

/** Optional nullable number */
const numOpt = z.coerce.number().nullable().optional();

/** Integer field */
const int = z.coerce.number().int();

/** Optional integer with default */
const intDef = (def: number) => z.coerce.number().int().default(def);

/** Optional nullable string */
const strOpt = z.string().nullable().optional();

/** Boolean with default */
const boolDef = (def: boolean) => z.boolean().default(def);

// ─── Auth ───
export const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8),
  password_confirmation: z.string().min(8),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  password: z.string().min(8),
  password_confirmation: z.string().min(8),
});

export const updateProfileSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
});

export const updatePasswordSchema = z.object({
  current_password: z.string().min(1),
  password: z.string().min(8),
  password_confirmation: z.string().min(8),
});

// ─── Orders ───
export const createOrderSchema = z.object({
  customer_name: z.string().min(1, "নাম আবশ্যক"),
  customer_phone: z.string().min(1, "ফোন নম্বর আবশ্যক").optional().or(z.literal("")),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_address: z.string().min(1, "ঠিকানা আবশ্যক").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  zip_code: z.string().optional(),
  subtotal: z.coerce.number(),
  shipping_cost: z.coerce.number().optional(),
  coupon_code: z.string().optional(),
  discount: z.coerce.number().optional(),
  total: z.coerce.number(),
  payment_method: z.enum(["cod", "bkash", "nagad", "bank"]).default("cod"),
  transaction_id: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      product_id: z.coerce.number(),
      product_name: z.string().optional(),
      variant_id: z.coerce.number().optional(),
      variant_label: z.string().optional(),
      quantity: z.coerce.number().int().min(1),
      price: z.coerce.number(),
    })
  ).min(1),
});

// ─── Reviews ───
export const createReviewSchema = z.object({
  product_id: z.coerce.number(),
  customer_name: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  review: z.string().min(1),
});

// ─── Coupons ───
export const applyCouponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.coerce.number(),
});

// ─── Shipping ───
export const calculateShippingSchema = z.object({
  city: z.string().min(1),
});

// ─── Addresses ───
export const addressSchema = z.object({
  label: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  zip_code: z.string().optional(),
  is_default: z.boolean().optional(),
});

// ─── Contact ───
export const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1),
});

// ─── Admin: Products ───
export const productSchema = z.object({
  // ── Required ──
  name: z.string().min(1, "পণ্যের নাম দিন"),
  price: z.coerce.number().min(1, "দাম দিন"),
  // ── Optional ──
  slug: strOpt,
  category_id: numOpt,
  brand_id: numOpt,
  description: strOpt,
  original_price: numOpt,
  image: strOpt,
  images: z.array(z.string()).nullable().optional(),
  badge: strOpt,
  badge_color: strOpt,
  weight: strOpt,
  stock: intDef(0),
  unlimited_stock: z.boolean().optional(),
  sold_count: int.optional(),
  is_active: boolDef(true),
  is_featured: boolDef(false),
  has_variations: z.boolean().optional(),
  variation_type: strOpt,
  custom_shipping: z.boolean().optional(),
  shipping_cost: numOpt,
  variants: z.array(z.object({
    label: z.string().min(1),
    price: z.coerce.number(),
    original_price: z.coerce.number().optional().nullable(),
    sku: z.string().optional().nullable(),
    stock: z.coerce.number().optional(),
    unlimited_stock: z.boolean().optional(),
    image: z.string().optional().nullable(),
    sort_order: z.coerce.number().optional(),
    is_active: z.boolean().optional(),
  })).optional(),
  sort_order: intDef(0),
});

// ─── Admin: Categories ───
export const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  image: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

// ─── Admin: Brands ───
export const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  logo: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

// ─── Admin: Flash Sales ───
export const flashSaleSchema = z.object({
  title: z.string().min(1),
  starts_at: z.string(),
  ends_at: z.string(),
  is_active: z.boolean().default(true),
  products: z.array(z.object({
    id: z.coerce.number(),
    sale_price: z.coerce.number(),
  })).optional(),
});

// ─── Admin: Coupons ───
export const couponSchema = z.object({
  code: z.string().min(1),
  type: z.enum(["fixed", "percentage"]),
  value: z.coerce.number(),
  min_order_amount: z.coerce.number().default(0),
  max_uses: z.coerce.number().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

// ─── Admin: Banners ───
export const bannerSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  button_text: z.string().nullable().optional(),
  button_url: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  gradient: z.string().nullable().optional(),
  emoji: z.string().nullable().optional(),
  position: z.string().default("hero"),
  sort_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
});

// ─── Admin: Nav Menus ───
export const menuSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
  sort_order: z.coerce.number().int().default(0),
  parent_id: z.coerce.number().nullable().optional(),
  is_active: z.boolean().default(true),
});

// ─── Admin: Blog ───
export const blogPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().min(1),
  image: z.string().nullable().optional(),
  is_published: z.boolean().default(false),
  published_at: z.string().nullable().optional(),
});

// ─── Admin: Shipping Zones ───
export const shippingZoneSchema = z.object({
  name: z.string().min(1),
  cities: z.array(z.string()),
  rate: z.coerce.number(),
  estimated_days: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
});

// ─── Admin: Landing Pages ───
export const landingPageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  is_active: z.boolean().default(true),
  hero_headline: strOpt,
  hero_subheadline: strOpt,
  hero_image: strOpt,
  hero_cta: strOpt,
  hero_trust_text: strOpt,
  hero_badge: strOpt,
  problem_title: strOpt,
  problem_points: strOpt, // JSON string
  products_title: strOpt,
  products_subtitle: strOpt,
  features_title: strOpt,
  features_image: strOpt,
  features: strOpt,
  testimonials_title: strOpt,
  testimonials_mode: strOpt, // "all_site" | "select" | "custom"
  testimonials: strOpt,
  how_it_works_title: strOpt,
  how_it_works_subtitle: strOpt,
  how_it_works: strOpt,
  faq_title: strOpt,
  faq: strOpt,
  products: strOpt,
  checkout_title: strOpt,
  checkout_subtitle: strOpt,
  checkout_btn_text: strOpt,
  custom_shipping: z.boolean().optional(),
  shipping_cost: z.coerce.number().optional(),
  show_email: z.boolean().optional(),
  show_city: z.boolean().optional(),
  guarantee_text: strOpt,
  success_message: strOpt,
  meta_title: strOpt,
  meta_description: strOpt,
  whatsapp: strOpt,
  section_visibility: strOpt,
  primary_color: strOpt,
});

// ─── Admin: Users ───
export const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  role: z.enum(["customer", "admin"]).default("customer"),
});

// ─── Admin: Orders status ───
export const orderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "on_hold", "confirmed", "shipped", "delivered", "cancelled", "trashed"]),
  payment_status: z.enum(["unpaid", "paid"]).optional(),
});
