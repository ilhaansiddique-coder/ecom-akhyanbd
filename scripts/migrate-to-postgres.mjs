/**
 * SQLite → PostgreSQL migration script
 * Reads all data from local SQLite db and writes to Neon PostgreSQL.
 * Run with: node scripts/migrate-to-postgres.mjs
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from "url";
import path from "path";
import { existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../prisma/mavesoj.db");

if (!existsSync(dbPath)) {
  console.error("❌ SQLite database not found at:", dbPath);
  process.exit(1);
}

const sqlite = new Database(dbPath, { readonly: true });
const prisma = new PrismaClient();

function all(table) {
  return sqlite.prepare(`SELECT * FROM "${table}"`).all();
}

async function clearPostgres() {
  console.log("🧹 Clearing PostgreSQL...");
  // Delete in FK-safe order
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE
    form_submissions,
    order_fingerprints,
    device_fingerprints,
    blocked_ips,
    order_items,
    orders,
    flash_sale_product,
    flash_sales,
    product_variants,
    wishlists,
    reviews,
    addresses,
    coupons,
    shipping_zones,
    blog_posts,
    products,
    categories,
    brands,
    banners,
    nav_menus,
    landing_pages,
    site_settings,
    password_reset_tokens,
    users
    RESTART IDENTITY CASCADE`);
  console.log("✅ PostgreSQL cleared\n");
}

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  return new Date(v);
}

function toBool(v) {
  if (v === null || v === undefined) return null;
  return v === 1 || v === true || v === "1";
}

async function migrateTable(name, rows, transform) {
  if (!rows.length) { console.log(`⏭  ${name}: 0 rows`); return; }
  let ok = 0, fail = 0;
  for (const row of rows) {
    try {
      await transform(row);
      ok++;
    } catch (e) {
      fail++;
      console.warn(`  ⚠ ${name} id=${row.id}: ${e.message}`);
    }
  }
  console.log(`✅ ${name}: ${ok} migrated${fail ? `, ${fail} skipped` : ""}`);
}

async function main() {
  console.log("🚀 Starting SQLite → PostgreSQL migration\n");

  await clearPostgres();

  // ── Users ──
  const users = all("users");
  await migrateTable("users", users, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO users (id,name,email,email_verified_at,password,phone,address,role,avatar,provider,provider_id,remember_token,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      r.id, r.name, r.email, toDate(r.email_verified_at), r.password,
      r.phone, r.address, r.role || "customer", r.avatar,
      r.provider, r.provider_id, r.remember_token,
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Password Reset Tokens ──
  const prt = all("password_reset_tokens");
  await migrateTable("password_reset_tokens", prt, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO password_reset_tokens (email,token,created_at) VALUES ($1,$2,$3)`,
      r.email, r.token, toDate(r.created_at)
    )
  );

  // ── Categories ──
  const categories = all("categories");
  await migrateTable("categories", categories, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO categories (id,name,slug,image,description,sort_order,is_active,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      r.id, r.name, r.slug, r.image, r.description,
      r.sort_order || 0, toBool(r.is_active) ?? true,
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Brands ──
  const brands = all("brands");
  await migrateTable("brands", brands, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO brands (id,name,slug,logo,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      r.id, r.name, r.slug, r.logo, toBool(r.is_active) ?? true,
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Products ──
  const products = all("products");
  await migrateTable("products", products, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO products (id,name,slug,category_id,brand_id,description,price,original_price,image,images,badge,badge_color,weight,stock,unlimited_stock,sold_count,version,is_active,is_featured,has_variations,variation_type,custom_shipping,shipping_cost,sort_order,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)`,
      r.id, r.name, r.slug, r.category_id, r.brand_id,
      r.description, r.price, r.original_price, r.image, r.images,
      r.badge, r.badge_color, r.weight, r.stock || 0,
      toBool(r.unlimited_stock) ?? false, r.sold_count || 0, r.version || 0,
      toBool(r.is_active) ?? true, toBool(r.is_featured) ?? false,
      toBool(r.has_variations) ?? false, r.variation_type,
      toBool(r.custom_shipping) ?? false, r.shipping_cost,
      r.sort_order || 0, toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Product Variants ──
  const variants = all("product_variants");
  await migrateTable("product_variants", variants, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO product_variants (id,product_id,label,price,original_price,sku,stock,unlimited_stock,image,sort_order,is_active,version,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      r.id, r.product_id, r.label, r.price, r.original_price,
      r.sku, r.stock || 0, toBool(r.unlimited_stock) ?? false,
      r.image, r.sort_order || 0, toBool(r.is_active) ?? true,
      r.version || 0, toDate(r.created_at)
    )
  );

  // ── Flash Sales ──
  const flashSales = all("flash_sales");
  await migrateTable("flash_sales", flashSales, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO flash_sales (id,title,starts_at,ends_at,is_active,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      r.id, r.title, toDate(r.starts_at), toDate(r.ends_at),
      toBool(r.is_active) ?? true, toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Flash Sale Products ──
  const fsp = all("flash_sale_product");
  await migrateTable("flash_sale_product", fsp, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO flash_sale_product (id,flash_sale_id,product_id,sale_price,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      r.id, r.flash_sale_id, r.product_id, r.sale_price,
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Orders ──
  const orders = all("orders");
  await migrateTable("orders", orders, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO orders (id,user_id,customer_name,customer_phone,customer_email,customer_address,city,zip_code,subtotal,shipping_cost,discount,total,status,payment_method,payment_status,transaction_id,order_token,notes,courier_sent,consignment_id,courier_status,courier_score,tracking_data,fp_hash,risk_score,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)`,
      r.id, r.user_id, r.customer_name, r.customer_phone,
      r.customer_email, r.customer_address, r.city, r.zip_code,
      r.subtotal, r.shipping_cost || 0, r.discount || 0, r.total,
      r.status || "pending", r.payment_method || "cod",
      r.payment_status || "unpaid", r.transaction_id, r.order_token,
      r.notes, toBool(r.courier_sent) ?? false, r.consignment_id,
      r.courier_status, r.courier_score, r.tracking_data,
      r.fp_hash, r.risk_score, toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Order Items ──
  const orderItems = all("order_items");
  await migrateTable("order_items", orderItems, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO order_items (id,order_id,product_id,product_name,variant_id,variant_label,price,quantity,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      r.id, r.order_id, r.product_id, r.product_name,
      r.variant_id, r.variant_label, r.price, r.quantity,
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Device Fingerprints ──
  const dfs = all("device_fingerprints");
  await migrateTable("device_fingerprints", dfs, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO device_fingerprints (id,fp_hash,canvas_hash,webgl_hash,audio_hash,screen_resolution,platform,timezone,languages,cpu_cores,memory_gb,touch_points,user_agent,last_ip,risk_score,status,seen_count,block_reason,blocked_at,last_seen_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      r.id, r.fp_hash, r.canvas_hash, r.webgl_hash, r.audio_hash,
      r.screen_resolution, r.platform, r.timezone, r.languages,
      r.cpu_cores, r.memory_gb, r.touch_points, r.user_agent,
      r.last_ip, r.risk_score || 0, r.status || "active",
      r.seen_count || 1, r.block_reason, toDate(r.blocked_at),
      toDate(r.last_seen_at), toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Order Fingerprints ──
  const ofs = all("order_fingerprints");
  await migrateTable("order_fingerprints", ofs, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO order_fingerprints (id,order_id,fp_hash,ip_address,device_fingerprint_id,fill_duration_ms,mouse_movements,paste_detected,honeypot_triggered,tab_switches,risk_score,risk_flags,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      r.id, r.order_id, r.fp_hash, r.ip_address, r.device_fingerprint_id,
      r.fill_duration_ms, r.mouse_movements,
      toBool(r.paste_detected) ?? false, toBool(r.honeypot_triggered) ?? false,
      r.tab_switches, r.risk_score || 0, r.risk_flags, toDate(r.created_at)
    )
  );

  // ── Blocked IPs ──
  const bips = all("blocked_ips");
  await migrateTable("blocked_ips", bips, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO blocked_ips (id,ip_address,reason,created_at) VALUES ($1,$2,$3,$4)`,
      r.id, r.ip_address, r.reason, toDate(r.created_at)
    )
  );

  // ── Reviews ──
  const reviews = all("reviews");
  await migrateTable("reviews", reviews, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO reviews (id,product_id,user_id,customer_name,rating,review,image,is_approved,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      r.id, r.product_id, r.user_id, r.customer_name,
      r.rating, r.review, r.image, toBool(r.is_approved) ?? false,
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Wishlists ──
  const wishlists = all("wishlists");
  await migrateTable("wishlists", wishlists, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO wishlists (id,user_id,product_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5)`,
      r.id, r.user_id, r.product_id, toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Coupons ──
  const coupons = all("coupons");
  await migrateTable("coupons", coupons, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO coupons (id,code,type,value,min_order_amount,max_uses,used_count,starts_at,expires_at,is_active,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      r.id, r.code, r.type, r.value, r.min_order_amount || 0,
      r.max_uses, r.used_count || 0, toDate(r.starts_at),
      toDate(r.expires_at), toBool(r.is_active) ?? true,
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Shipping Zones ──
  const zones = all("shipping_zones");
  await migrateTable("shipping_zones", zones, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO shipping_zones (id,name,cities,rate,estimated_days,is_active,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      r.id, r.name, r.cities, r.rate, r.estimated_days,
      toBool(r.is_active) ?? true, toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Addresses ──
  const addresses = all("addresses");
  await migrateTable("addresses", addresses, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO addresses (id,user_id,label,name,phone,address,city,zip_code,is_default,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      r.id, r.user_id, r.label, r.name, r.phone,
      r.address, r.city, r.zip_code, toBool(r.is_default) ?? false,
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Banners ──
  const banners = all("banners");
  await migrateTable("banners", banners, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO banners (id,title,subtitle,description,button_text,button_url,image,gradient,emoji,position,sort_order,is_active,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      r.id, r.title, r.subtitle, r.description, r.button_text,
      r.button_url, r.image, r.gradient, r.emoji,
      r.position || "hero", r.sort_order || 0, toBool(r.is_active) ?? true,
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Nav Menus ──
  const navMenus = all("nav_menus");
  await migrateTable("nav_menus", navMenus, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO nav_menus (id,label,url,sort_order,parent_id,is_active,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      r.id, r.label, r.url, r.sort_order || 0, r.parent_id,
      toBool(r.is_active) ?? true, toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Landing Pages ──
  const lps = all("landing_pages");
  await migrateTable("landing_pages", lps, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO landing_pages (id,slug,title,is_active,hero_headline,hero_subheadline,hero_image,hero_cta,hero_trust_text,hero_badge,problem_title,problem_points,products_title,products_subtitle,features_title,features_image,features,testimonials_title,testimonials_mode,testimonials,how_it_works_title,how_it_works_subtitle,how_it_works,faq_title,faq,products,checkout_title,checkout_subtitle,checkout_btn_text,custom_shipping,shipping_cost,show_email,show_city,guarantee_text,success_message,meta_title,meta_description,whatsapp,section_visibility,primary_color,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42)`,
      r.id, r.slug, r.title, toBool(r.is_active) ?? true,
      r.hero_headline, r.hero_subheadline, r.hero_image, r.hero_cta,
      r.hero_trust_text, r.hero_badge, r.problem_title, r.problem_points,
      r.products_title, r.products_subtitle, r.features_title,
      r.features_image, r.features, r.testimonials_title,
      r.testimonials_mode || "custom", r.testimonials,
      r.how_it_works_title, r.how_it_works_subtitle, r.how_it_works,
      r.faq_title, r.faq, r.products, r.checkout_title, r.checkout_subtitle,
      r.checkout_btn_text, toBool(r.custom_shipping) ?? false,
      r.shipping_cost ?? 60, toBool(r.show_email) ?? false,
      toBool(r.show_city) ?? true, r.guarantee_text, r.success_message,
      r.meta_title, r.meta_description, r.whatsapp, r.section_visibility,
      r.primary_color || "#0f5931", toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Blog Posts ──
  const blogs = all("blog_posts");
  await migrateTable("blog_posts", blogs, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO blog_posts (id,title,slug,excerpt,content,image,author_id,is_published,published_at,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      r.id, r.title, r.slug, r.excerpt, r.content, r.image,
      r.author_id, toBool(r.is_published) ?? false,
      toDate(r.published_at), toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Site Settings ──
  const settings = all("site_settings");
  await migrateTable("site_settings", settings, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO site_settings (id,key,value,"group",created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      r.id, r.key, r.value, r.group || "general",
      toDate(r.created_at), toDate(r.updated_at)
    )
  );

  // ── Form Submissions ──
  const forms = all("form_submissions");
  await migrateTable("form_submissions", forms, (r) =>
    prisma.$executeRawUnsafe(
      `INSERT INTO form_submissions (id,name,email,phone,subject,message,status,notes,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      r.id, r.name, r.email, r.phone, r.subject, r.message,
      r.status || "unread", r.notes, toDate(r.created_at)
    )
  );

  // Fix sequences so next inserts get correct IDs
  console.log("\n🔧 Resetting PostgreSQL sequences...");
  const tables = [
    "users","categories","brands","products","product_variants",
    "flash_sales","flash_sale_product","orders","order_items",
    "device_fingerprints","order_fingerprints","blocked_ips",
    "reviews","wishlists","coupons","shipping_zones","addresses",
    "banners","nav_menus","landing_pages","blog_posts","site_settings","form_submissions"
  ];
  for (const t of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${t}"', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 1))`
      );
    } catch (_) {}
  }
  console.log("✅ Sequences reset\n");

  console.log("🎉 Migration complete!");
}

main()
  .catch((e) => { console.error("❌ Migration failed:", e); process.exit(1); })
  .finally(() => { sqlite.close(); prisma.$disconnect(); });
