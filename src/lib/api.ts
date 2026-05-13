const API_URL = "/api/v1";

class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(status: number, body: Record<string, unknown> = {}) {
    super((body.message as string) || `API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    if (body.errors) this.errors = body.errors as Record<string, string[]>;
  }
}

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = `${API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("Request timeout after 30s")), 30000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new ApiError(res.status, error);
    }

    // Handle 204 No Content and empty responses
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return {};
    }

    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  // Products
  getProducts: (params?: string) => fetchAPI(`/products${params ? `?${params}` : ""}`),
  getProduct: (slug: string) => fetchAPI(`/products/${slug}`),
  searchProducts: (q: string) => fetchAPI(`/products/search?q=${encodeURIComponent(q)}`),
  getTopRated: () => fetchAPI("/products/top-rated"),

  // Categories
  getCategories: () => fetchAPI("/categories"),

  // Flash Sales
  getActiveFlashSale: () => fetchAPI("/flash-sales/active"),

  // Banners
  getBanners: () => fetchAPI("/banners"),

  // Settings
  getSettings: () => fetchAPI("/settings"),

  // Menus
  getMenus: () => fetchAPI("/menus"),

  // Blog
  getBlogPosts: () => fetchAPI("/blog"),
  getBlogPost: (slug: string) => fetchAPI(`/blog/${slug}`),

  // Auth
  register: (data: { name: string; email: string; password: string; password_confirmation: string; phone?: string }) =>
    fetchAPI("/auth/register", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    fetchAPI("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  logout: () => fetchAPI("/auth/logout", { method: "POST" }),

  forgotPassword: (email: string) =>
    fetchAPI("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  resetPassword: (data: { email: string; code: string; password: string; password_confirmation: string }) =>
    fetchAPI("/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),

  getUser: () => fetchAPI("/auth/user"),

  updateProfile: (data: { name?: string; email?: string; phone?: string }) =>
    fetchAPI("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),

  updatePassword: (data: { current_password: string; password: string; password_confirmation: string }) =>
    fetchAPI("/auth/password", { method: "PUT", body: JSON.stringify(data) }),

  // Reviews
  getProductReviews: (productId: number) => fetchAPI(`/products/${productId}/reviews`),
  submitReview: (data: { product_id: number; customer_name: string; rating: number; review: string }) =>
    fetchAPI("/reviews", { method: "POST", body: JSON.stringify(data) }),

  // Orders
  getOrders: (page = 1) => fetchAPI(`/orders?page=${page}`),
  getOrder: (id: number) => fetchAPI(`/orders/${id}`),
  createOrder: (data: Record<string, unknown>) =>
    fetchAPI("/orders", { method: "POST", body: JSON.stringify(data) }),

  // ============ ADMIN API ============
  admin: {
    dashboard: (params?: string) => fetchAPI(`/admin/dashboard${params ? `?${params}` : ""}`),
    stats: () => fetchAPI("/admin/dashboard"),
    recentOrders: () => fetchAPI("/admin/dashboard"),
    topProducts: () => fetchAPI("/admin/dashboard"),
    lowStock: () => fetchAPI("/admin/dashboard"),

    // Products
    getProducts: (params?: string) => fetchAPI(`/admin/products${params ? `?${params}` : ""}`),
    createProduct: (data: Record<string, unknown>) => fetchAPI("/admin/products", { method: "POST", body: JSON.stringify(data) }),
    getProduct: (id: number) => fetchAPI(`/admin/products/${id}`),
    updateProduct: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteProduct: (id: number, force = false) => fetchAPI(`/admin/products/${id}${force ? "?force=1" : ""}`, { method: "DELETE" }),
    restoreProduct: (id: number) => fetchAPI(`/admin/products/${id}`, { method: "PATCH" }),

    // Categories
    getCategories: () => fetchAPI("/admin/categories"),
    createCategory: (data: Record<string, unknown>) => fetchAPI("/admin/categories", { method: "POST", body: JSON.stringify(data) }),
    updateCategory: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCategory: (id: number) => fetchAPI(`/admin/categories/${id}`, { method: "DELETE" }),

    // Brands
    getBrands: () => fetchAPI("/admin/brands"),
    createBrand: (data: Record<string, unknown>) => fetchAPI("/admin/brands", { method: "POST", body: JSON.stringify(data) }),
    updateBrand: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/brands/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteBrand: (id: number) => fetchAPI(`/admin/brands/${id}`, { method: "DELETE" }),

    // Orders
    getOrders: (params?: string) => fetchAPI(`/admin/orders${params ? `?${params}` : ""}`),
    getOrder: (id: number) => fetchAPI(`/admin/orders/${id}`),
    updateOrder: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/orders/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    updateOrderStatus: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify(data) }),
    deleteOrder: (id: number, force = false) => fetchAPI(`/admin/orders/${id}${force ? "?force=1" : ""}`, { method: "DELETE" }),

    // Users
    getUsers: (params?: string) => fetchAPI(`/admin/users${params ? `?${params}` : ""}`),
    createUser: (data: Record<string, unknown>) => fetchAPI("/admin/users", { method: "POST", body: JSON.stringify(data) }),
    updateUser: (id: string, data: Record<string, unknown>) => fetchAPI(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteUser: (id: string) => fetchAPI(`/admin/users/${id}`, { method: "DELETE" }),
    bulkUsers: (action: "delete" | "update_role", ids: string[], role?: "customer" | "staff" | "admin") =>
      fetchAPI(`/admin/users/bulk`, {
        method: "POST",
        body: JSON.stringify(role ? { action, ids, role } : { action, ids }),
      }),
    searchCustomers: (q: string) => fetchAPI(`/admin/customers/search?q=${encodeURIComponent(q)}`),

    // Reviews
    getReviews: (params?: string) => fetchAPI(`/admin/reviews${params ? `?${params}` : ""}`),
    updateReview: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/reviews/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteReview: (id: number) => fetchAPI(`/admin/reviews/${id}`, { method: "DELETE" }),

    // Flash Sales
    getFlashSales: () => fetchAPI("/admin/flash-sales"),
    createFlashSale: (data: Record<string, unknown>) => fetchAPI("/admin/flash-sales", { method: "POST", body: JSON.stringify(data) }),
    updateFlashSale: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/flash-sales/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteFlashSale: (id: number) => fetchAPI(`/admin/flash-sales/${id}`, { method: "DELETE" }),

    // Coupons
    getCoupons: () => fetchAPI("/admin/coupons"),
    createCoupon: (data: Record<string, unknown>) => fetchAPI("/admin/coupons", { method: "POST", body: JSON.stringify(data) }),
    updateCoupon: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/coupons/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteCoupon: (id: number) => fetchAPI(`/admin/coupons/${id}`, { method: "DELETE" }),

    // Banners
    getBanners: () => fetchAPI("/admin/banners"),
    createBanner: (data: Record<string, unknown>) => fetchAPI("/admin/banners", { method: "POST", body: JSON.stringify(data) }),
    updateBanner: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/banners/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteBanner: (id: number) => fetchAPI(`/admin/banners/${id}`, { method: "DELETE" }),

    // Menus
    getMenus: () => fetchAPI("/admin/menus"),
    createMenu: (data: Record<string, unknown>) => fetchAPI("/admin/menus", { method: "POST", body: JSON.stringify(data) }),
    updateMenu: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/menus/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteMenu: (id: number) => fetchAPI(`/admin/menus/${id}`, { method: "DELETE" }),

    // Blog
    getBlogPosts: () => fetchAPI("/admin/blog"),
    createBlogPost: (data: Record<string, unknown>) => fetchAPI("/admin/blog", { method: "POST", body: JSON.stringify(data) }),
    updateBlogPost: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/blog/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteBlogPost: (id: number) => fetchAPI(`/admin/blog/${id}`, { method: "DELETE" }),

    // Shipping
    getShippingZones: () => fetchAPI("/admin/shipping"),
    createShippingZone: (data: Record<string, unknown>) => fetchAPI("/admin/shipping", { method: "POST", body: JSON.stringify(data) }),
    updateShippingZone: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/shipping/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteShippingZone: (id: number) => fetchAPI(`/admin/shipping/${id}`, { method: "DELETE" }),

    // Settings
    getSettings: () => fetchAPI("/admin/settings"),
    updateSettings: (data: Record<string, unknown>) => fetchAPI("/admin/settings", { method: "PUT", body: JSON.stringify(data) }),

    // Landing Pages
    getLandingPages: () => fetchAPI("/admin/landing-pages"),
    createLandingPage: (data: Record<string, unknown>) => fetchAPI("/admin/landing-pages", { method: "POST", body: JSON.stringify(data) }),
    updateLandingPage: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/landing-pages/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteLandingPage: (id: number) => fetchAPI(`/admin/landing-pages/${id}`, { method: "DELETE" }),

    // Upload
    upload: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return fetch(`${API_URL}/admin/upload`, {
        method: "POST",
        credentials: "include",
        headers: { Accept: "application/json" },
        body: formData,
      }).then(async (r) => {
        if (!r.ok) {
          const error = await r.json().catch(() => ({}));
          throw new ApiError(r.status, error);
        }
        return r.json();
      });
    },

    // Spam Detection
    getSpamDevices: (params?: string) => fetchAPI(`/admin/spam/devices${params ? `?${params}` : ""}`),
    getSpamDevice: (id: number) => fetchAPI(`/admin/spam/devices/${id}`),
    updateSpamDevice: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/spam/devices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    getSpamFlaggedOrders: (params?: string) => fetchAPI(`/admin/spam/flagged-orders${params ? `?${params}` : ""}`),
    getBlockedIps: () => fetchAPI("/admin/spam/blocked-ips"),
    addBlockedIp: (data: Record<string, unknown>) => fetchAPI("/admin/spam/blocked-ips", { method: "POST", body: JSON.stringify(data) }),
    deleteBlockedIp: (id: number) => fetchAPI(`/admin/spam/blocked-ips/${id}`, { method: "DELETE" }),
    getBlockedPhones: () => fetchAPI("/admin/spam/blocked-phones"),
    addBlockedPhone: (data: Record<string, unknown>) => fetchAPI("/admin/spam/blocked-phones", { method: "POST", body: JSON.stringify(data) }),
    deleteBlockedPhone: (id: number) => fetchAPI(`/admin/spam/blocked-phones/${id}`, { method: "DELETE" }),
    // Customer-centric spam endpoints (new)
    getSpamCustomers: (params?: string) => fetchAPI(`/admin/spam/customers${params ? `?${params}` : ""}`),
    getSpamCustomerTrace: (phone: string) => fetchAPI(`/admin/spam/customer-trace?phone=${encodeURIComponent(phone)}`),
    blockOrderCustomer: (orderId: number, reason?: string) =>
      fetchAPI(`/admin/orders/${orderId}/block`, { method: "POST", body: JSON.stringify({ reason }) }),

    // Courier (Steadfast | Pathao). `provider` defaults to "steadfast".
    listActiveCouriers: () =>
      fetchAPI("/admin/courier/active") as Promise<{ couriers: { id: "steadfast" | "pathao"; label: string }[] }>,
    courierBalance: (provider: "steadfast" | "pathao" = "steadfast") =>
      fetchAPI(provider === "pathao" ? "/admin/courier/pathao?action=balance" : "/admin/courier?action=balance"),
    courierStatus: (consignmentId: string, provider: "steadfast" | "pathao" = "steadfast") =>
      fetchAPI(provider === "pathao"
        ? `/admin/courier/pathao?action=status&consignment_id=${consignmentId}`
        : `/admin/courier?action=status&consignment_id=${consignmentId}`),
    courierScore: (phone: string) => fetchAPI(`/admin/courier?action=score&phone=${phone}`),
    sendToCourier: (orderId: number, provider: "steadfast" | "pathao" = "steadfast") =>
      fetchAPI(provider === "pathao" ? "/admin/courier/pathao" : "/admin/courier",
        { method: "POST", body: JSON.stringify({ order_id: orderId }) }),
    sendToPathaoWithPayload: (orderId: number, payload: Record<string, unknown>) =>
      fetchAPI("/admin/courier/pathao",
        { method: "POST", body: JSON.stringify({ order_id: orderId, payload }) }),
    pathaoBulkPreview: (orderIds: number[]) =>
      fetchAPI("/admin/courier/pathao", { method: "POST", body: JSON.stringify({ action: "bulk_preview", order_ids: orderIds }) }) as Promise<{
        items: Array<{
          order_id: number;
          customer_name: string;
          customer_phone: string;
          valid_phone: boolean;
          address: string;
          amount: number;
          item_quantity: number;
          item_description: string;
          special_instruction: string;
          matched: { city_id: number; city_name: string; zone_id: number; zone_name: string; area_id: number | null; area_name: string | null; score?: number } | null;
        }>;
      }>,
    pathaoBulkSendWithOverrides: (orderIds: number[], overrides: Record<number, { recipient_city: number; recipient_zone: number; recipient_area?: number }>) =>
      fetchAPI("/admin/courier/pathao", { method: "POST", body: JSON.stringify({ action: "bulk_send", order_ids: orderIds, overrides }) }),
    pathaoCities: () => fetchAPI("/admin/courier/pathao?action=cities") as Promise<{ items: { city_id: number; city_name: string }[] }>,
    pathaoZones: (cityId: number) => fetchAPI(`/admin/courier/pathao?action=zones&city_id=${cityId}`) as Promise<{ items: { zone_id: number; zone_name: string }[] }>,
    pathaoAreas: (zoneId: number) => fetchAPI(`/admin/courier/pathao?action=areas&zone_id=${zoneId}`) as Promise<{ items: { area_id: number; area_name: string }[] }>,
    pathaoParseAddress: (address: string, phone: string) =>
      fetchAPI("/admin/courier/pathao/parse", { method: "POST", body: JSON.stringify({ address, phone }) }) as Promise<{
        data?: {
          area_id?: number | null; area_name?: string | null; zone_id?: number; zone_name?: string;
          district_id?: number; district_name?: string; hub_id?: number; hub_name?: string;
          score?: number; source?: string; is_implicit?: boolean
        };
      }>,
    pathaoCustomerHistory: (phone: string) =>
      fetchAPI("/admin/courier/pathao/customer-history", { method: "POST", body: JSON.stringify({ phone }) }) as Promise<{
        data?: {
          address_book?: Array<{
            customer_name?: string; customer_address?: string;
            customer_city_id?: number; customer_city_name?: string;
            customer_zone_id?: number; customer_zone_name?: string;
            customer_area_id?: number | null; customer_area_name?: string | null;
          }>;
          customer_rating?: string;
          customer?: { total_delivery?: number; successful_delivery?: number };
        };
      }>,
    bulkSendToCourier: (orderIds: number[], provider: "steadfast" | "pathao" = "steadfast") =>
      fetchAPI(provider === "pathao" ? "/admin/courier/pathao" : "/admin/courier",
        { method: "POST", body: JSON.stringify({ order_ids: orderIds }) }),
    checkCourierStatus: (orderId: number, provider?: "steadfast" | "pathao") =>
      fetchAPI(provider === "pathao" ? "/admin/courier/pathao" : "/admin/courier",
        { method: "POST", body: JSON.stringify({ action: "check_status", order_id: orderId }) }),
    // Unified score check — calls every enabled courier and returns combined + per-provider breakdown.
    checkCourierScore: (orderId: number) => fetchAPI("/admin/courier/score", { method: "POST", body: JSON.stringify({ order_id: orderId }) }) as Promise<{
      success: boolean;
      message?: string;
      total_parcels: number;
      total_delivered: number;
      total_cancelled: number;
      success_ratio: string;
      providers: Array<{
        provider: "steadfast" | "pathao";
        ok: boolean;
        total_parcels: number;
        total_delivered: number;
        total_cancelled: number;
        success_ratio: string;
        rating?: string;
        error?: string;
      }>;
    }>,
  },
};
