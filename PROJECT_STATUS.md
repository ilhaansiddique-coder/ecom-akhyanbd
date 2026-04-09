# মা ভেষজ বাণিজ্যালয় — Project Status

## Architecture

```
c:\laragon\www\mabheshoj\
├── backend/                  ← Laravel API (PHP)
│   ├── app/
│   │   ├── Models/           ← 17 models
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   │   ├── AdminController.php    ← Full CRUD for all entities
│   │   │   │   ├── AuthController.php     ← Login/Register/Reset
│   │   │   │   ├── ProductController.php  ← Public product endpoints
│   │   │   │   ├── OrderController.php    ← Order creation/management
│   │   │   │   ├── ReviewController.php
│   │   │   │   ├── CategoryController.php
│   │   │   │   ├── FlashSaleController.php
│   │   │   │   ├── BannerController.php
│   │   │   │   ├── BlogController.php
│   │   │   │   ├── CouponController.php
│   │   │   │   ├── ShippingController.php
│   │   │   │   ├── WishlistController.php
│   │   │   │   ├── AddressController.php
│   │   │   │   ├── NavMenuController.php
│   │   │   │   ├── SiteSettingController.php
│   │   │   │   └── LandingPageController.php
│   │   │   └── Middleware/
│   │   │       └── AdminMiddleware.php    ← Protects admin routes
│   │   └── Filament/         ← EXISTS but NOT USED (we use Next.js dashboard)
│   ├── database/
│   │   ├── migrations/       ← 23 migrations
│   │   └── seeders/
│   │       ├── SiteSettingsSeeder.php
│   │       └── ShippingZoneSeeder.php
│   ├── routes/
│   │   ├── api.php           ← All API routes under /api/v1
│   │   └── web.php           ← Returns JSON (API-only, no web UI)
│   └── .env                  ← DB: mabhesojdb, MySQL root, no password
│
├── src/                      ← Next.js Frontend (React + TypeScript)
│   ├── app/
│   │   ├── page.tsx                    ← Homepage
│   │   ├── layout.tsx                  ← Root layout (Hind Siliguri font)
│   │   ├── not-found.tsx               ← Custom 404 page
│   │   ├── shop/page.tsx               ← Shop with filters/search/sort
│   │   ├── products/[slug]/page.tsx    ← Single product + reviews
│   │   ├── checkout/page.tsx           ← Checkout + invoice (PDF/print)
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── refund/page.tsx
│   │   └── dashboard/
│   │       ├── page.tsx                ← Admin stats OR customer profile
│   │       ├── products/page.tsx       ← Product CRUD
│   │       ├── categories/page.tsx     ← Category CRUD
│   │       ├── brands/page.tsx         ← Brand CRUD
│   │       ├── orders/page.tsx         ← Order management
│   │       ├── users/page.tsx          ← User CRUD
│   │       ├── reviews/page.tsx        ← Review moderation
│   │       ├── flash-sales/page.tsx    ← Flash sale CRUD
│   │       ├── coupons/page.tsx        ← Coupon CRUD
│   │       ├── banners/page.tsx        ← Banner CRUD
│   │       ├── menus/page.tsx          ← Nav menu CRUD
│   │       ├── blog/page.tsx           ← Blog post CRUD
│   │       ├── landing-pages/page.tsx  ← Landing page CRUD
│   │       ├── shipping/page.tsx       ← Shipping zone CRUD
│   │       └── settings/page.tsx       ← Site settings form
│   ├── components/
│   │   ├── Navbar.tsx          ← Main navigation (no dropdown on Shop)
│   │   ├── Hero.tsx            ← Hero banner
│   │   ├── Categories.tsx      ← Category grid (API-connected)
│   │   ├── FlashSale.tsx       ← Flash sale countdown (API-connected)
│   │   ├── LatestProducts.tsx  ← Latest products (API-connected)
│   │   ├── TopRatedProducts.tsx← Top rated (API-connected)
│   │   ├── ProductCard.tsx     ← Product card (links to /products/[slug], adds to cart)
│   │   ├── CartDrawer.tsx      ← Cart sidebar (real cart from CartContext)
│   │   ├── AuthModal.tsx       ← Login/Register/Forgot Password modal
│   │   ├── SearchModal.tsx     ← Search overlay
│   │   ├── DashboardLayout.tsx ← Admin sidebar layout (green theme)
│   │   ├── Toast.tsx           ← Success/error toast
│   │   ├── ConfirmDialog.tsx   ← Delete confirmation dialog
│   │   ├── ClientLayout.tsx    ← Wraps with AuthProvider + CartProvider
│   │   ├── Footer.tsx
│   │   ├── FooterBottom.tsx
│   │   ├── FloatingWidgets.tsx ← WhatsApp/Phone/Social buttons
│   │   ├── AdBanners.tsx
│   │   ├── CustomerReviews.tsx
│   │   └── Features.tsx
│   ├── lib/
│   │   ├── api.ts              ← API client (public + admin endpoints, 5s timeout)
│   │   ├── AuthContext.tsx     ← Auth state (login/register/logout/user)
│   │   └── CartContext.tsx     ← Cart state (localStorage, add/remove/clear)
│   ├── utils/
│   │   └── toBn.ts             ← English→Bangla digit converter
│   └── data/
│       └── products.ts         ← Static product data (fallback when API is down)
│
├── public/
│   ├── fonts/
│   │   └── LiAbuJMAkkas.ttf   ← Bangla numeral font (auto via CSS unicode-range)
│   └── logo.svg
│
├── .env.local                  ← NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
└── package.json                ← Next.js 16, React 19, Framer Motion, Swiper
```

---

## How to Run

### Terminal 1 — Laravel API
```bash
cd c:\laragon\www\mabheshoj\backend
php artisan serve --port=8000
```

### Terminal 2 — Next.js Frontend
```bash
cd c:\laragon\www\mabheshoj
npm run dev
```

### URLs
- **Frontend:** http://localhost:3000
- **API:** http://localhost:8000/api/v1
- **Admin Dashboard:** http://localhost:3000/dashboard (login as admin)
- **Shop:** http://localhost:3000/shop
- **Checkout:** http://localhost:3000/checkout

### Admin Credentials
- **Email:** admin@mavesoj.com | **Password:** password
- **Email:** elsiddique@gmail.com | **Password:** (your password)

---

## Database

- **Name:** mabhesojdb
- **Host:** 127.0.0.1:3306
- **User:** root (no password)
- **Tables (23):**
  - users, products, categories, brands, orders, order_items
  - reviews, flash_sales, flash_sale_product, landing_pages
  - site_settings, nav_menus, banners, wishlists, coupons
  - shipping_zones, addresses, blog_posts
  - personal_access_tokens, password_reset_tokens
  - cache, jobs, migrations

---

## Fonts

- **Hind Siliguri** — Main Bangla font (Google Fonts via Next.js)
- **LiAbuJMAkkas** — Bangla numerals only (via CSS @font-face + unicode-range U+09E6-09EF, U+09F3)
- All numerals auto-render in LiAbuJMAkkas, no manual classes needed

---

## API Endpoints Summary

### Public (`/api/v1/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /products | List products (paginated, filterable) |
| GET | /products/top-rated | Top 6 by sold_count |
| GET | /products/search?q= | Scout search |
| GET | /products/{slug} | Single product |
| GET | /products/{id}/reviews | Approved reviews |
| GET | /categories | All active categories |
| GET | /flash-sales/active | Current flash sale + products |
| GET | /banners | All banners grouped by position |
| GET | /settings | Site settings key-value |
| GET | /menus | Nav menu tree |
| GET | /landing-pages/{slug} | Landing page by slug |
| GET | /blog | Published blog posts |
| GET | /blog/{slug} | Single blog post |
| GET | /shipping/zones | Shipping zones |
| POST | /shipping/calculate | Calculate shipping by city |
| POST | /coupons/apply | Apply coupon code |
| POST | /reviews | Submit review (pending approval) |
| POST | /orders | Create order (guest or auth) |
| POST | /auth/register | Register |
| POST | /auth/login | Login (returns token) |
| POST | /auth/forgot-password | Send reset code |
| POST | /auth/reset-password | Reset with code |

### Protected (`/api/v1/` + auth:sanctum)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /auth/user | Current user |
| POST | /auth/logout | Logout |
| PUT | /auth/profile | Update profile |
| PUT | /auth/password | Change password |
| GET | /orders | Customer's orders |
| GET | /orders/{id} | Order detail |
| POST | /orders/{id}/cancel | Cancel pending order |
| GET | /wishlist | User's wishlist |
| POST | /wishlist/toggle | Add/remove wishlist |
| GET/POST/PUT/DELETE | /addresses | Address CRUD |

### Admin (`/api/v1/admin/` + auth:sanctum + AdminMiddleware)
| Endpoint Group | Operations |
|----------------|------------|
| /admin/dashboard | Combined stats + orders + products + low stock |
| /admin/products | CRUD (list, create, show, update, delete) |
| /admin/categories | CRUD |
| /admin/brands | CRUD |
| /admin/orders | List, show, update status, delete |
| /admin/users | CRUD |
| /admin/reviews | List, approve/reject, delete |
| /admin/flash-sales | CRUD (with product pivot) |
| /admin/coupons | CRUD |
| /admin/banners | CRUD |
| /admin/menus | CRUD |
| /admin/blog | CRUD |
| /admin/shipping | CRUD |
| /admin/settings | Get all, update all |
| /admin/landing-pages | CRUD |
| /admin/upload | File upload |

---

## What's DONE (✅)

### Backend
- [x] Laravel installed with MySQL
- [x] Sanctum API auth (login/register/forgot/reset)
- [x] 17 Eloquent models with relationships
- [x] 23 database migrations
- [x] AdminController with full CRUD for all entities
- [x] AdminMiddleware for admin-only routes
- [x] Laravel Scout for product search
- [x] Public + Protected + Admin API routes (60+ endpoints)
- [x] Coupon system (fixed/percentage, validation, min order)
- [x] Shipping zones (city-based rates)
- [x] Wishlist toggle
- [x] Customer address book
- [x] Blog system
- [x] Order cancellation + stock restore
- [x] File upload endpoint
- [x] Site settings (key-value store)

### Frontend
- [x] Full Bangla UI with Hind Siliguri + LiAbuJMAkkas fonts
- [x] Homepage with 8 sections (Hero, Categories, FlashSale, LatestProducts, AdBanners, TopRated, Reviews, Features)
- [x] Homepage sections connected to API (fallback to static data)
- [x] Shop page with category filters, search, sort
- [x] Single product page with reviews, related products, add to cart
- [x] Cart system (localStorage, drawer, badge count)
- [x] Checkout with delivery form, payment method, invoice generation
- [x] Invoice with print + PDF download (html2canvas + jsPDF)
- [x] Auth system (login/register/forgot password modal)
- [x] Customer dashboard (profile, orders, password)
- [x] Admin dashboard with green sidebar (14 nav items)
- [x] Admin stats (7 cards, recent orders, top products, low stock)
- [x] Product CRUD, Category CRUD, Brand CRUD, Order management, User CRUD, Review moderation
- [x] Flash Sales, Coupons, Banners, Menus, Blog, Landing Pages, Shipping, Settings CRUD pages
- [x] About, Contact, Privacy, Terms, Refund pages
- [x] Custom 404 page
- [x] Toast notifications, Confirm dialogs
- [x] 5-second API timeout (prevents hanging)
- [x] Static data fallback (works even when API is down)
- [x] Product page loads static data instantly, API in background

---

## What's REMAINING (❌)

### High Priority
- [ ] **Email notifications** — order confirmation, password reset emails (currently only returns codes, doesn't email)
- [ ] **Social login** — Google, Facebook OAuth (User model has provider/provider_id fields ready)
- [ ] **SEO meta tags** — dynamic OG tags per page (product, blog)
- [ ] **Advanced product filters** — price range slider, brand filter, rating filter on shop page
- [ ] **Dedicated search results page** — `/search?q=` page instead of just modal
- [ ] **Blog frontend pages** — `/blog` list page, `/blog/[slug]` detail page (API exists, frontend pages missing)

### Medium Priority
- [ ] **Order tracking timeline UI** — visual timeline showing order status history
- [ ] **Product variants** — size/weight options per product (needs new migration + UI)
- [ ] **Return/exchange system** — return request model, API, dashboard page
- [ ] **Image upload in dashboard** — currently uses URL text input, should upload files
- [ ] **Coupon integration in checkout** — coupon code input field in checkout form
- [ ] **Shipping calculator in checkout** — dynamic shipping cost based on city selection
- [ ] **Wishlist UI on frontend** — heart icon on products, wishlist page

### Low Priority
- [ ] **Customer support/chat** — live chat widget or support ticket system
- [ ] **Analytics/logging** — page view tracking, conversion tracking
- [ ] **Loading skeleton states** — skeleton placeholders instead of spinners
- [ ] **Product image gallery** — multiple images with thumbnails on product page
- [ ] **Order email/SMS notifications** — notify customer when status changes
- [ ] **Inventory history** — track stock changes over time
- [ ] **Multi-language toggle** — switch between Bangla and English

### Deployment
- [ ] **cPanel deployment guide** — Laravel on subdomain (api.domain.com), Next.js static export on main domain
- [ ] **Next.js static export config** — `output: 'export'` in next.config.ts
- [ ] **Laravel production optimization** — OPcache, config/route/view cache, queue worker
- [ ] **SSL setup** — HTTPS for both frontend and API
- [ ] **Environment variables** — production .env values

---

## Key Notes

1. **Filament admin panel exists** in `backend/app/Filament/` but is NOT used. All admin operations go through the Next.js dashboard at `/dashboard`. You can safely ignore or remove Filament.

2. **Static data fallback** — When the Laravel API is down, the frontend shows hardcoded products from `src/data/products.ts`. This means the site always loads, even without the backend running.

3. **Product IDs** — The static data uses IDs 1-12. These may not match DB product IDs. The order system handles this by allowing nullable product_id in order_items.

4. **PHP 8.4 compatibility** — Filament v5 requires specific type declarations (`string | \BackedEnum | null` for `$navigationIcon`, `string | \UnitEnum | null` for `$navigationGroup`). If you need to modify Filament resources, use these exact types.

5. **`php artisan serve`** is single-threaded and stops easily. For stable local development, configure Laragon's Apache to point to `backend/public/` as a virtual host.

6. **API timeout** — All fetch calls have a 5-second AbortController timeout. If the API takes longer, the request is cancelled and fallback data is shown.

---

## Quick Commands

```bash
# Start both servers
cd c:\laragon\www\mabheshoj\backend && php artisan serve --port=8000
cd c:\laragon\www\mabheshoj && npm run dev

# Run migrations
cd backend && php artisan migrate

# Clear all caches
cd backend && php artisan optimize:clear

# Cache for production speed
cd backend && php artisan route:cache && php artisan config:cache && php artisan view:cache

# Build frontend
npm run build

# Create admin user
cd backend && php artisan tinker --execute="App\Models\User::create(['name'=>'Admin','email'=>'admin@test.com','password'=>bcrypt('password'),'role'=>'admin']);"
```

---

*Last updated: April 7, 2026*
