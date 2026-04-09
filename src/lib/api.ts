const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api/v1";

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
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  // Landing Pages
  getLandingPage: (slug: string) => fetchAPI(`/landing-pages/${slug}`),

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
    dashboard: () => fetchAPI("/admin/dashboard"),
    stats: () => fetchAPI("/admin/stats"),
    recentOrders: () => fetchAPI("/admin/recent-orders"),
    topProducts: () => fetchAPI("/admin/top-products"),
    lowStock: () => fetchAPI("/admin/low-stock"),

    // Products
    getProducts: (params?: string) => fetchAPI(`/admin/products${params ? `?${params}` : ""}`),
    createProduct: (data: Record<string, unknown>) => fetchAPI("/admin/products", { method: "POST", body: JSON.stringify(data) }),
    getProduct: (id: number) => fetchAPI(`/admin/products/${id}`),
    updateProduct: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteProduct: (id: number) => fetchAPI(`/admin/products/${id}`, { method: "DELETE" }),

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
    updateOrderStatus: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/orders/${id}/status`, { method: "PUT", body: JSON.stringify(data) }),
    deleteOrder: (id: number) => fetchAPI(`/admin/orders/${id}`, { method: "DELETE" }),

    // Users
    getUsers: (params?: string) => fetchAPI(`/admin/users${params ? `?${params}` : ""}`),
    createUser: (data: Record<string, unknown>) => fetchAPI("/admin/users", { method: "POST", body: JSON.stringify(data) }),
    updateUser: (id: number, data: Record<string, unknown>) => fetchAPI(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteUser: (id: number) => fetchAPI(`/admin/users/${id}`, { method: "DELETE" }),

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
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      return fetch(`${API_URL}/admin/upload`, {
        method: "POST",
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      }).then(async (r) => {
        if (!r.ok) {
          const error = await r.json().catch(() => ({}));
          throw new ApiError(r.status, error);
        }
        return r.json();
      });
    },
  },
};
