<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Models\BlogPost;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Coupon;
use App\Models\FlashSale;
use App\Models\LandingPage;
use App\Models\NavMenu;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\ShippingZone;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Events\BrandChanged;
use App\Events\CategoryChanged;
use App\Events\OrderChanged;
use App\Events\ProductChanged;
use App\Helpers\BanglaSlug;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminController extends Controller
{
    /** Trigger Next.js on-demand revalidation (fire-and-forget) */
    private function revalidateFrontend(): void
    {
        try {
            $url = rtrim(config('app.frontend_url', 'http://localhost:3000'), '/') . '/api/revalidate';
            \Illuminate\Support\Facades\Http::timeout(3)
                ->withHeaders(['x-revalidate-secret' => 'mabheshoj-revalidate-2024'])
                ->post($url);
        } catch (\Throwable) {}
    }

    /** Clear all product-related caches by bumping the version number.
     *  Old versioned keys expire naturally via TTL; new requests get fresh data. */
    private function clearProductCaches(): void
    {
        Cache::increment('product_cache_version');
        Cache::forget('flash_sale_active');
    }

    /** Clear category caches */
    private function clearCategoryCaches(): void
    {
        Cache::forget('categories_active');
    }

    /** Clear banner caches */
    private function clearBannerCaches(): void
    {
        Cache::forget('banners_active');
    }

    /** Clear menu caches */
    private function clearMenuCaches(): void
    {
        Cache::forget('nav_menus');
    }

    // ============ DASHBOARD (single call) ============
    public function dashboard(): JsonResponse
    {
        $data = Cache::remember('admin_dashboard', 30, function () {
            return [
                'stats' => [
                    'total_orders' => Order::count(),
                    'today_orders' => Order::whereDate('created_at', today())->count(),
                    'total_revenue' => Order::sum('total'),
                    'total_customers' => User::where('role', 'customer')->count(),
                    'total_products' => Product::count(),
                    'active_products' => Product::where('is_active', true)->count(),
                    'pending_orders' => Order::where('status', 'pending')->count(),
                    'low_stock_count' => Product::where('stock', '<=', 10)->where('is_active', true)->count(),
                ],
                'recent_orders' => Order::with('items')->latest()->limit(10)->get()->toArray(),
                'top_products' => Product::where('sold_count', '>', 0)->orderByDesc('sold_count')->limit(10)->get()->toArray(),
                'low_stock' => Product::where('stock', '<=', 10)->where('is_active', true)->orderBy('stock')->get()->toArray(),
            ];
        });

        return response()->json($data);
    }

    // Keep individual endpoints for backward compat
    public function stats(): JsonResponse
    {
        return response()->json([
            'total_orders' => Order::count(),
            'today_orders' => Order::whereDate('created_at', today())->count(),
            'total_revenue' => Order::sum('total'),
            'total_customers' => User::where('role', 'customer')->count(),
            'total_products' => Product::count(),
            'pending_orders' => Order::where('status', 'pending')->count(),
            'low_stock_count' => Product::where('stock', '<=', 10)->where('is_active', true)->count(),
        ]);
    }

    public function recentOrders(): JsonResponse
    {
        return response()->json(Order::with('items')->latest()->limit(10)->get());
    }

    public function topProducts(): JsonResponse
    {
        return response()->json(Product::where('sold_count', '>', 0)->orderByDesc('sold_count')->limit(10)->get());
    }

    public function lowStock(): JsonResponse
    {
        return response()->json(Product::where('stock', '<=', 10)->where('is_active', true)->orderBy('stock')->get());
    }

    // ============ PRODUCTS ============
    public function productIndex(Request $request): JsonResponse
    {
        $q = Product::with('category', 'brand')->latest();
        if ($request->search) $q->where('name', 'like', "%{$request->search}%");
        if ($request->category_id) $q->where('category_id', $request->category_id);
        return response()->json($q->paginate($request->per_page ?? 15));
    }

    public function productStore(Request $request): JsonResponse
    {
        $v = $request->validate([
            'name' => 'required|string', 'slug' => 'nullable|string|unique:products',
            'category_id' => 'nullable|integer', 'brand_id' => 'nullable|integer',
            'description' => 'nullable|string', 'price' => 'required|numeric', 'original_price' => 'nullable|numeric',
            'image' => 'nullable|string', 'images' => 'nullable|array', 'badge' => 'nullable|string',
            'badge_color' => 'nullable|string', 'weight' => 'nullable|string', 'stock' => 'nullable|integer',
            'is_active' => 'nullable|boolean', 'is_featured' => 'nullable|boolean', 'sort_order' => 'nullable|integer',
        ]);
        if (empty($v['slug'])) {
            $v['slug'] = BanglaSlug::make($v['name']);
        }
        if (empty($v['image'])) {
            $v['image'] = '/placeholder.png';
        }
        $product = Product::create($v);
        ProductChanged::dispatch('created', $product->toArray());
        $this->clearProductCaches();
        $this->revalidateFrontend();
        return response()->json($product, 201);
    }

    public function productShow(Product $product): JsonResponse
    {
        return response()->json($product->load('category', 'brand', 'reviews'));
    }

    public function productUpdate(Request $request, Product $product): JsonResponse
    {
        $v = $request->validate([
            'name' => 'sometimes|string', 'slug' => 'nullable|string|unique:products,slug,' . $product->id,
            'category_id' => 'nullable|integer', 'brand_id' => 'nullable|integer',
            'description' => 'nullable|string', 'price' => 'sometimes|numeric', 'original_price' => 'nullable|numeric',
            'image' => 'nullable|string', 'images' => 'nullable|array', 'badge' => 'nullable|string',
            'badge_color' => 'nullable|string', 'weight' => 'nullable|string', 'stock' => 'nullable|integer',
            'is_active' => 'nullable|boolean', 'is_featured' => 'nullable|boolean', 'sort_order' => 'nullable|integer',
        ]);
        $product->update($v);
        $fresh = $product->fresh();
        ProductChanged::dispatch('updated', $fresh->toArray());
        $this->clearProductCaches();
        $this->revalidateFrontend();
        return response()->json($fresh);
    }

    public function productDestroy(Product $product): JsonResponse
    {
        $data = $product->toArray();
        $product->delete();
        ProductChanged::dispatch('deleted', $data);
        $this->clearProductCaches();
        $this->revalidateFrontend();
        return response()->json(['message' => 'পণ্য মুছে ফেলা হয়েছে।']);
    }

    // ============ CATEGORIES ============
    public function categoryIndex(): JsonResponse
    {
        return response()->json(Category::withCount('products')->orderBy('sort_order')->get());
    }

    public function categoryStore(Request $request): JsonResponse
    {
        $v = $request->validate(['name' => 'required|string', 'slug' => 'nullable|string|unique:categories', 'image' => 'nullable|string', 'description' => 'nullable|string', 'sort_order' => 'nullable|integer', 'is_active' => 'nullable|boolean']);
        if (empty($v['slug'])) $v['slug'] = BanglaSlug::make($v['name']) ?: 'cat-' . time();
        $category = Category::create($v);
        CategoryChanged::dispatch('created', $category->toArray());
        $this->clearCategoryCaches();
        $this->revalidateFrontend();
        return response()->json($category, 201);
    }

    public function categoryUpdate(Request $request, Category $category): JsonResponse
    {
        $v = $request->validate(['name' => 'sometimes|string', 'slug' => 'sometimes|string|unique:categories,slug,' . $category->id, 'image' => 'nullable|string', 'description' => 'nullable|string', 'sort_order' => 'nullable|integer', 'is_active' => 'nullable|boolean']);
        $category->update($v);
        $fresh = $category->fresh();
        CategoryChanged::dispatch('updated', $fresh->toArray());
        $this->clearCategoryCaches();
        $this->revalidateFrontend();
        return response()->json($fresh);
    }

    public function categoryDestroy(Category $category): JsonResponse
    {
        $data = $category->toArray();
        $category->delete();
        CategoryChanged::dispatch('deleted', $data);
        $this->clearCategoryCaches();
        $this->revalidateFrontend();
        return response()->json(['message' => 'ক্যাটাগরি মুছে ফেলা হয়েছে।']);
    }

    // ============ BRANDS ============
    public function brandIndex(): JsonResponse
    {
        return response()->json(Brand::withCount('products')->get());
    }

    public function brandStore(Request $request): JsonResponse
    {
        $v = $request->validate(['name' => 'required|string', 'slug' => 'nullable|string|unique:brands', 'logo' => 'nullable|string', 'is_active' => 'nullable|boolean']);
        if (empty($v['slug'])) $v['slug'] = BanglaSlug::make($v['name']) ?: 'brand-' . time();
        $brand = Brand::create($v);
        BrandChanged::dispatch('created', $brand->toArray());
        $this->revalidateFrontend();
        return response()->json($brand, 201);
    }

    public function brandUpdate(Request $request, Brand $brand): JsonResponse
    {
        $v = $request->validate(['name' => 'sometimes|string', 'slug' => 'sometimes|string|unique:brands,slug,' . $brand->id, 'logo' => 'nullable|string', 'is_active' => 'nullable|boolean']);
        $brand->update($v);
        $fresh = $brand->fresh();
        BrandChanged::dispatch('updated', $fresh->toArray());
        $this->revalidateFrontend();
        return response()->json($fresh);
    }

    public function brandDestroy(Brand $brand): JsonResponse
    {
        $data = $brand->toArray();
        $brand->delete();
        BrandChanged::dispatch('deleted', $data);
        $this->revalidateFrontend();
        return response()->json(['message' => 'ব্র্যান্ড মুছে ফেলা হয়েছে।']);
    }

    // ============ ORDERS ============
    public function orderIndex(Request $request): JsonResponse
    {
        $q = Order::with('items')->latest();
        if ($request->status) $q->where('status', $request->status);
        if ($request->search) $q->where(function ($q2) use ($request) {
            $q2->where('customer_name', 'like', "%{$request->search}%")->orWhere('customer_phone', 'like', "%{$request->search}%");
        });
        return response()->json($q->paginate($request->per_page ?? 15));
    }

    public function orderShow(Order $order): JsonResponse
    {
        return response()->json($order->load('items', 'user'));
    }

    public function orderUpdateStatus(Request $request, Order $order): JsonResponse
    {
        $v = $request->validate(['status' => 'required|in:pending,confirmed,processing,shipped,delivered,cancelled', 'payment_status' => 'nullable|in:unpaid,paid']);
        $order->update($v);
        $fresh = $order->fresh()->load('items');
        OrderChanged::dispatch('updated', $fresh->toArray());
        return response()->json($fresh);
    }

    public function orderDestroy(Order $order): JsonResponse
    {
        $data = $order->toArray();
        $order->items()->delete();
        $order->delete();
        OrderChanged::dispatch('deleted', $data);
        return response()->json(['message' => 'অর্ডার মুছে ফেলা হয়েছে।']);
    }

    // ============ USERS ============
    public function userIndex(Request $request): JsonResponse
    {
        $q = User::latest();
        if ($request->search) $q->where('name', 'like', "%{$request->search}%")->orWhere('email', 'like', "%{$request->search}%");
        if ($request->role) $q->where('role', $request->role);
        return response()->json($q->paginate($request->per_page ?? 15));
    }

    public function userStore(Request $request): JsonResponse
    {
        $v = $request->validate(['name' => 'required|string', 'email' => 'required|email|unique:users', 'password' => 'required|string|min:8', 'phone' => 'nullable|string', 'role' => 'nullable|in:admin,customer']);
        $v['password'] = Hash::make($v['password']);
        return response()->json(User::create($v), 201);
    }

    public function userUpdate(Request $request, User $user): JsonResponse
    {
        $v = $request->validate(['name' => 'sometimes|string', 'email' => 'sometimes|email|unique:users,email,' . $user->id, 'phone' => 'nullable|string', 'role' => 'nullable|in:admin,customer']);
        if ($request->password) $v['password'] = Hash::make($request->password);
        $user->update($v);
        return response()->json($user->fresh());
    }

    public function userDestroy(User $user): JsonResponse
    {
        $user->delete();
        return response()->json(['message' => 'ইউজার মুছে ফেলা হয়েছে।']);
    }

    // ============ REVIEWS ============
    public function reviewIndex(Request $request): JsonResponse
    {
        $q = Review::with('product')->latest();
        if ($request->has('is_approved')) $q->where('is_approved', $request->boolean('is_approved'));
        return response()->json($q->paginate($request->per_page ?? 15));
    }

    public function reviewUpdate(Request $request, Review $review): JsonResponse
    {
        $review->update($request->validate(['is_approved' => 'required|boolean']));
        return response()->json($review->fresh());
    }

    public function reviewDestroy(Review $review): JsonResponse
    {
        $review->delete();
        return response()->json(['message' => 'রিভিউ মুছে ফেলা হয়েছে।']);
    }

    // ============ FLASH SALES ============
    public function flashSaleIndex(): JsonResponse
    {
        return response()->json(FlashSale::withCount('products')->latest()->get());
    }

    public function flashSaleStore(Request $request): JsonResponse
    {
        $v = $request->validate(['title' => 'required|string', 'starts_at' => 'required|date', 'ends_at' => 'required|date', 'is_active' => 'nullable|boolean', 'product_ids' => 'nullable|array', 'product_ids.*.id' => 'exists:products,id', 'product_ids.*.sale_price' => 'numeric']);
        $sale = FlashSale::create($v);
        if ($request->product_ids) {
            foreach ($request->product_ids as $p) {
                $sale->products()->attach($p['id'], ['sale_price' => $p['sale_price']]);
            }
        }
        Cache::forget('flash_sale_active');
        return response()->json($sale->load('products'), 201);
    }

    public function flashSaleUpdate(Request $request, FlashSale $flashSale): JsonResponse
    {
        $v = $request->validate(['title' => 'sometimes|string', 'starts_at' => 'sometimes|date', 'ends_at' => 'sometimes|date', 'is_active' => 'nullable|boolean']);
        $flashSale->update($v);
        if ($request->has('product_ids')) {
            $sync = [];
            foreach ($request->product_ids as $p) { $sync[$p['id']] = ['sale_price' => $p['sale_price']]; }
            $flashSale->products()->sync($sync);
        }
        Cache::forget('flash_sale_active');
        return response()->json($flashSale->fresh()->load('products'));
    }

    public function flashSaleDestroy(FlashSale $flashSale): JsonResponse
    {
        $flashSale->products()->detach();
        $flashSale->delete();
        Cache::forget('flash_sale_active');
        return response()->json(['message' => 'ফ্ল্যাশ সেল মুছে ফেলা হয়েছে।']);
    }

    // ============ COUPONS ============
    public function couponIndex(): JsonResponse { return response()->json(Coupon::latest()->get()); }
    public function couponStore(Request $request): JsonResponse
    {
        $v = $request->validate(['code' => 'required|string|unique:coupons', 'type' => 'required|in:fixed,percentage', 'value' => 'required|numeric', 'min_order_amount' => 'nullable|numeric', 'max_uses' => 'nullable|integer', 'starts_at' => 'nullable|date', 'expires_at' => 'nullable|date', 'is_active' => 'nullable|boolean']);
        return response()->json(Coupon::create($v), 201);
    }
    public function couponUpdate(Request $request, Coupon $coupon): JsonResponse
    {
        $coupon->update($request->validate(['code' => 'sometimes|string|unique:coupons,code,' . $coupon->id, 'type' => 'sometimes|in:fixed,percentage', 'value' => 'sometimes|numeric', 'min_order_amount' => 'nullable|numeric', 'max_uses' => 'nullable|integer', 'starts_at' => 'nullable|date', 'expires_at' => 'nullable|date', 'is_active' => 'nullable|boolean']));
        return response()->json($coupon->fresh());
    }
    public function couponDestroy(Coupon $coupon): JsonResponse { $coupon->delete(); return response()->json(['message' => 'কুপন মুছে ফেলা হয়েছে।']); }

    // ============ BANNERS ============
    public function bannerIndex(): JsonResponse { return response()->json(Banner::orderBy('sort_order')->get()); }
    public function bannerStore(Request $request): JsonResponse
    {
        $v = $request->validate(['title' => 'required|string', 'subtitle' => 'nullable|string', 'description' => 'nullable|string', 'button_text' => 'nullable|string', 'button_url' => 'nullable|string', 'image' => 'nullable|string', 'gradient' => 'nullable|string', 'emoji' => 'nullable|string', 'position' => 'nullable|string', 'sort_order' => 'nullable|integer', 'is_active' => 'nullable|boolean']);
        $this->clearBannerCaches();
        return response()->json(Banner::create($v), 201);
    }
    public function bannerUpdate(Request $request, Banner $banner): JsonResponse { $banner->update($request->all()); $this->clearBannerCaches(); return response()->json($banner->fresh()); }
    public function bannerDestroy(Banner $banner): JsonResponse { $banner->delete(); $this->clearBannerCaches(); return response()->json(['message' => 'ব্যানার মুছে ফেলা হয়েছে।']); }

    // ============ NAV MENUS ============
    public function menuIndex(): JsonResponse { return response()->json(NavMenu::with('children')->whereNull('parent_id')->orderBy('sort_order')->get()); }
    public function menuStore(Request $request): JsonResponse
    {
        $v = $request->validate(['label' => 'required|string', 'url' => 'required|string', 'sort_order' => 'nullable|integer', 'parent_id' => 'nullable|exists:nav_menus,id', 'is_active' => 'nullable|boolean']);
        $this->clearMenuCaches();
        return response()->json(NavMenu::create($v), 201);
    }
    public function menuUpdate(Request $request, NavMenu $menu): JsonResponse { $menu->update($request->all()); $this->clearMenuCaches(); return response()->json($menu->fresh()); }
    public function menuDestroy(NavMenu $menu): JsonResponse { $menu->delete(); $this->clearMenuCaches(); return response()->json(['message' => 'মেনু মুছে ফেলা হয়েছে।']); }

    // ============ BLOG ============
    public function blogIndex(): JsonResponse { return response()->json(BlogPost::with('author')->latest()->paginate(15)); }
    public function blogStore(Request $request): JsonResponse
    {
        $v = $request->validate(['title' => 'required|string', 'slug' => 'required|string|unique:blog_posts', 'excerpt' => 'nullable|string', 'content' => 'required|string', 'image' => 'nullable|string', 'is_published' => 'nullable|boolean', 'published_at' => 'nullable|date']);
        $v['author_id'] = $request->user()->id;
        return response()->json(BlogPost::create($v), 201);
    }
    public function blogUpdate(Request $request, BlogPost $post): JsonResponse { $post->update($request->all()); return response()->json($post->fresh()); }
    public function blogDestroy(BlogPost $post): JsonResponse { $post->delete(); return response()->json(['message' => 'পোস্ট মুছে ফেলা হয়েছে।']); }

    // ============ SHIPPING ZONES ============
    public function shippingIndex(): JsonResponse { return response()->json(ShippingZone::all()); }
    public function shippingStore(Request $request): JsonResponse
    {
        $v = $request->validate(['name' => 'required|string', 'cities' => 'required|array', 'rate' => 'required|numeric', 'estimated_days' => 'nullable|string', 'is_active' => 'nullable|boolean']);
        return response()->json(ShippingZone::create($v), 201);
    }
    public function shippingUpdate(Request $request, ShippingZone $zone): JsonResponse { $zone->update($request->all()); return response()->json($zone->fresh()); }
    public function shippingDestroy(ShippingZone $zone): JsonResponse { $zone->delete(); return response()->json(['message' => 'শিপিং জোন মুছে ফেলা হয়েছে।']); }

    // ============ SETTINGS ============
    public function settingsIndex(): JsonResponse
    {
        $settings = SiteSetting::all()->pluck('value', 'key');
        return response()->json($settings);
    }

    public function settingsUpdate(Request $request): JsonResponse
    {
        foreach ($request->all() as $key => $value) {
            SiteSetting::set($key, $value);
        }
        return response()->json(['message' => 'সেটিংস আপডেট হয়েছে।']);
    }

    // ============ LANDING PAGES ============
    public function landingIndex(): JsonResponse { return response()->json(LandingPage::with('product')->get()); }
    public function landingStore(Request $request): JsonResponse
    {
        $v = $request->validate(['product_id' => 'required|exists:products,id', 'slug' => 'required|string|unique:landing_pages', 'custom_title' => 'nullable|string', 'custom_description' => 'nullable|string', 'is_active' => 'nullable|boolean']);
        return response()->json(LandingPage::create($v), 201);
    }
    public function landingUpdate(Request $request, LandingPage $landing): JsonResponse { $landing->update($request->all()); return response()->json($landing->fresh()); }
    public function landingDestroy(LandingPage $landing): JsonResponse { $landing->delete(); return response()->json(['message' => 'ল্যান্ডিং পেজ মুছে ফেলা হয়েছে।']); }

    // ============ FILE UPLOAD ============
    public function upload(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|max:5120']);
        $path = $request->file('file')->store('uploads', 'public');
        $relativePath = '/storage/' . $path;
        return response()->json(['url' => $relativePath, 'path' => $relativePath]);
    }
}
