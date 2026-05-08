/**
 * Canonical admin nav tree, server-side.
 *
 * Mirrors the structure currently hard-coded in
 * `src/components/DashboardLayout.tsx → buildNavGroups()` so web + Flutter
 * stay in lock-step. Icons are stored as STRING NAMES (e.g. `"shoppingBag"`)
 * so the same payload can drive a React `react-icons/fi` lookup on the web
 * AND a Flutter `IconData` lookup on the app — the wire format never carries
 * widget instances, only identifiers.
 *
 * `mobileRoute` is the route the Flutter app's go_router knows about. When
 * a web route has no Flutter equivalent yet, set it to `null` — the Flutter
 * sidebar still renders the item (so the menu structure matches the web)
 * but greys it out and shows a "Coming soon" toast on tap. Once the screen
 * lands in Flutter, just fill in the route here and it lights up.
 */

export interface NavLeaf {
  /** i18n key the dashboard uses; Flutter uses it for translation lookups too. */
  i18nKey: string;
  /** Hard-coded English label, used as a fallback if the i18n key is missing. */
  label: string;
  /** Lucide-style icon name. Both clients map this string to their icon set. */
  icon: string;
  /** Web route (Next.js dashboard). */
  webRoute: string;
  /** Flutter go_router route, or `null` if the screen isn't built yet. */
  mobileRoute: string | null;
}

export interface NavGroup {
  i18nKey: string;
  label: string;
  icon: string;
  /** Top-level items have a single route; groups have nested `items`. */
  webRoute?: string;
  mobileRoute?: string | null;
  items?: NavLeaf[];
}

/** The full admin nav tree. Edit this list, redeploy, both clients update. */
export const NAV_TREE: NavGroup[] = [
  {
    i18nKey: "dash.dashboard",
    label: "Dashboard",
    icon: "home",
    webRoute: "/dashboard",
    mobileRoute: "/dashboard",
  },
  {
    i18nKey: "dash.productMgmt",
    label: "Product Management",
    icon: "box",
    items: [
      { i18nKey: "dash.products", label: "Products", icon: "box", webRoute: "/dashboard/products", mobileRoute: "/products" },
      { i18nKey: "dash.categories", label: "Categories", icon: "tag", webRoute: "/dashboard/categories", mobileRoute: "/categories" },
      { i18nKey: "dash.brands", label: "Brands", icon: "award", webRoute: "/dashboard/brands", mobileRoute: "/brands" },
      { i18nKey: "dash.inventory", label: "Inventory", icon: "package", webRoute: "/dashboard/products", mobileRoute: "/inventory" },
    ],
  },
  {
    i18nKey: "dash.orderMgmt",
    label: "Order Management",
    icon: "shoppingBag",
    items: [
      { i18nKey: "dash.orders", label: "Orders", icon: "shoppingBag", webRoute: "/dashboard/orders", mobileRoute: "/orders" },
      { i18nKey: "dash.incompleteOrders", label: "Incomplete Orders", icon: "shoppingBag", webRoute: "/dashboard/orders/incomplete", mobileRoute: "/orders/incomplete" },
      { i18nKey: "dash.courierMonitor", label: "Courier Monitor", icon: "truck", webRoute: "/dashboard/courier-monitor", mobileRoute: "/courier" },
      { i18nKey: "dash.spamDetection", label: "Spam Detection", icon: "shield", webRoute: "/dashboard/spam", mobileRoute: "/fraud-security" },
    ],
  },
  {
    i18nKey: "dash.customer",
    label: "Customer",
    icon: "users",
    items: [
      { i18nKey: "dash.users", label: "Users", icon: "users", webRoute: "/dashboard/users", mobileRoute: "/customers" },
      { i18nKey: "dash.staff", label: "Staff", icon: "users", webRoute: "/dashboard/users", mobileRoute: "/staff" },
      { i18nKey: "dash.reviews", label: "Reviews", icon: "star", webRoute: "/dashboard/reviews", mobileRoute: null },
      { i18nKey: "dash.formSubmissions", label: "Form Submissions", icon: "mail", webRoute: "/dashboard/form-submissions", mobileRoute: null },
    ],
  },
  {
    i18nKey: "dash.marketing",
    label: "Marketing",
    icon: "zap",
    items: [
      { i18nKey: "dash.marketingHome", label: "Marketing", icon: "zap", webRoute: "/dashboard/flash-sales", mobileRoute: "/marketing" },
      { i18nKey: "dash.flashSales", label: "Flash Sales", icon: "zap", webRoute: "/dashboard/flash-sales", mobileRoute: "/flash-sales" },
      { i18nKey: "dash.coupons", label: "Coupons", icon: "percent", webRoute: "/dashboard/coupons", mobileRoute: "/coupons" },
      { i18nKey: "dash.shortlinks", label: "Shortlinks", icon: "link", webRoute: "/dashboard/shortlinks", mobileRoute: "/shortlinks" },
    ],
  },
  {
    i18nKey: "dash.content",
    label: "Content",
    icon: "layout",
    items: [
      { i18nKey: "dash.headerFooter", label: "Header & Footer", icon: "layout", webRoute: "/dashboard/content/header-footer", mobileRoute: null },
      { i18nKey: "dash.home", label: "Home", icon: "home", webRoute: "/dashboard/homepage", mobileRoute: null },
      { i18nKey: "dash.shop", label: "Shop", icon: "shoppingBag", webRoute: "/dashboard/content/shop", mobileRoute: null },
      { i18nKey: "dash.about", label: "About Us", icon: "info", webRoute: "/dashboard/content/about", mobileRoute: null },
      { i18nKey: "dash.contact", label: "Contact Us", icon: "mail", webRoute: "/dashboard/content/contact", mobileRoute: null },
      { i18nKey: "dash.blog", label: "Blog", icon: "fileText", webRoute: "/dashboard/blog", mobileRoute: null },
      { i18nKey: "dash.email", label: "Email", icon: "mail", webRoute: "/dashboard/content/email", mobileRoute: null },
      { i18nKey: "dash.privacy", label: "Privacy", icon: "shield", webRoute: "/dashboard/content/privacy", mobileRoute: null },
      { i18nKey: "dash.terms", label: "Terms", icon: "fileText", webRoute: "/dashboard/content/terms", mobileRoute: null },
      { i18nKey: "dash.refund", label: "Refund", icon: "refreshCw", webRoute: "/dashboard/content/refund", mobileRoute: null },
    ],
  },
  { i18nKey: "dash.banners", label: "Banners", icon: "image", webRoute: "/dashboard/banners", mobileRoute: null },
  { i18nKey: "dash.menus", label: "Menus", icon: "menu", webRoute: "/dashboard/menus", mobileRoute: null },
  { i18nKey: "dash.landingPages", label: "Landing Pages", icon: "layout", webRoute: "/dashboard/landing-pages", mobileRoute: "/landing-pages" },
  { i18nKey: "dash.feeds", label: "Product Feeds", icon: "rss", webRoute: "/dashboard/feeds", mobileRoute: "/feeds" },
  { i18nKey: "dash.analytics", label: "Analytics", icon: "barChart", webRoute: "/dashboard", mobileRoute: "/analytics" },
  { i18nKey: "dash.notifications", label: "Notifications", icon: "bell", webRoute: "/dashboard", mobileRoute: "/notifications" },
  {
    i18nKey: "dash.settings",
    label: "Settings",
    icon: "settings",
    items: [
      { i18nKey: "dash.customizer", label: "Customizer", icon: "droplet", webRoute: "/dashboard/customizer", mobileRoute: "/settings/customizer" },
      { i18nKey: "dash.shippingZones", label: "Shipping Zones", icon: "truck", webRoute: "/dashboard/shipping", mobileRoute: "/settings/shipping" },
      { i18nKey: "dash.siteSettings", label: "Site Settings", icon: "settings", webRoute: "/dashboard/settings", mobileRoute: "/settings" },
      { i18nKey: "dash.checkoutSettings", label: "Checkout Settings", icon: "shoppingCart", webRoute: "/dashboard/settings/checkout", mobileRoute: "/settings/checkout" },
      { i18nKey: "dash.courierSettings", label: "Courier Settings", icon: "truck", webRoute: "/dashboard/settings/courier", mobileRoute: "/settings/courier" },
      { i18nKey: "dash.emailSettings", label: "Email Settings", icon: "mail", webRoute: "/dashboard/settings/email", mobileRoute: "/settings/email" },
      { i18nKey: "dash.languageSettings", label: "Language Settings", icon: "globe", webRoute: "/dashboard/settings/language", mobileRoute: "/settings/language" },
    ],
  },
];
