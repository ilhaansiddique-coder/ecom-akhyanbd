<?php

use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BannerController;
use App\Http\Controllers\Api\BlogController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\CouponController;
use App\Http\Controllers\Api\FlashSaleController;
use App\Http\Controllers\Api\LandingPageController;
use App\Http\Controllers\Api\NavMenuController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\ShippingController;
use App\Http\Controllers\Api\SiteSettingController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Middleware\AdminMiddleware;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Utility: generate slug from Bengali/English text
    Route::post('generate-slug', function (\Illuminate\Http\Request $request) {
        $request->validate(['name' => 'required|string|max:255']);
        $name = $request->input('name');

        $slug = '';
        if (function_exists('transliterator_transliterate')) {
            $trans = transliterator_transliterate('Bengali-Latin; Latin-ASCII; Lower()', $name);
            if ($trans) {
                $slug = trim(preg_replace('/[^a-z0-9]+/', '-', $trans), '-');
            }
        }

        // Fallback: use Laravel's Str::slug (handles Latin chars)
        if (empty($slug)) {
            $slug = \Illuminate\Support\Str::slug($name);
        }

        // Final fallback
        if (empty($slug)) {
            $slug = 'item-' . time();
        }

        return response()->json(['slug' => $slug]);
    });

    // Public routes
    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/top-rated', [ProductController::class, 'topRated']);
    Route::get('products/search', [ProductController::class, 'search']);
    Route::get('products/{slug}', [ProductController::class, 'show']);
    Route::get('categories', [CategoryController::class, 'index']);
    Route::get('flash-sales/active', [FlashSaleController::class, 'active']);
    Route::get('banners', [BannerController::class, 'index']);
    Route::get('settings', [SiteSettingController::class, 'index']);
    Route::get('menus', [NavMenuController::class, 'index']);
    Route::get('landing-pages/{slug}', [LandingPageController::class, 'show']);
    Route::get('products/{product}/reviews', [ReviewController::class, 'index']);

    // Coupons (public)
    Route::post('coupons/apply', [CouponController::class, 'apply']);

    // Shipping (public)
    Route::post('shipping/calculate', [ShippingController::class, 'calculate']);
    Route::get('shipping/zones', [ShippingController::class, 'zones']);

    // Blog (public)
    Route::get('blog', [BlogController::class, 'index']);
    Route::get('blog/{slug}', [BlogController::class, 'show']);

    // Contact form (rate limited)
    Route::post('contact', function (\Illuminate\Http\Request $request) {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'phone' => 'nullable|string|max:20',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:5000',
        ]);
        // Store or email — for now log it
        \Illuminate\Support\Facades\Log::info('Contact form submission', $request->only('name', 'email', 'phone', 'subject', 'message'));
        return response()->json(['message' => 'বার্তা সফলভাবে পাঠানো হয়েছে।']);
    })->middleware('throttle:3,1');

    // Auth routes (rate limited)
    Route::middleware('throttle:5,1')->group(function () {
        Route::post('auth/register', [AuthController::class, 'register']);
        Route::post('auth/login', [AuthController::class, 'login']);
        Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);
    });

    // Guest checkout (no auth required)
    Route::post('orders', [OrderController::class, 'store']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/user', [AuthController::class, 'user']);
        Route::put('auth/profile', [AuthController::class, 'updateProfile']);
        Route::put('auth/password', [AuthController::class, 'updatePassword']);
        Route::post('reviews', [ReviewController::class, 'store']);
        Route::get('orders', [OrderController::class, 'index']);
        Route::get('orders/{order}', [OrderController::class, 'show']);
        Route::post('orders/{order}/cancel', [OrderController::class, 'cancel']);
        Route::put('orders/{order}/status', [OrderController::class, 'updateStatus']);

        // Wishlist (protected)
        Route::get('wishlist', [WishlistController::class, 'index']);
        Route::post('wishlist/toggle', [WishlistController::class, 'toggle']);

        // Address book (protected)
        Route::apiResource('addresses', AddressController::class)->except(['show']);
    });

    // ============ ADMIN ROUTES ============
    Route::prefix('admin')->middleware(['auth:sanctum', AdminMiddleware::class])->group(function () {
        // Dashboard (single combined call)
        Route::get('dashboard', [AdminController::class, 'dashboard']);
        // Individual endpoints (kept for flexibility)
        Route::get('stats', [AdminController::class, 'stats']);
        Route::get('recent-orders', [AdminController::class, 'recentOrders']);
        Route::get('top-products', [AdminController::class, 'topProducts']);
        Route::get('low-stock', [AdminController::class, 'lowStock']);

        // Products CRUD
        Route::get('products', [AdminController::class, 'productIndex']);
        Route::post('products', [AdminController::class, 'productStore']);
        Route::get('products/{product}', [AdminController::class, 'productShow']);
        Route::put('products/{product}', [AdminController::class, 'productUpdate']);
        Route::delete('products/{product}', [AdminController::class, 'productDestroy']);

        // Categories CRUD
        Route::get('categories', [AdminController::class, 'categoryIndex']);
        Route::post('categories', [AdminController::class, 'categoryStore']);
        Route::put('categories/{category}', [AdminController::class, 'categoryUpdate']);
        Route::delete('categories/{category}', [AdminController::class, 'categoryDestroy']);

        // Brands CRUD
        Route::get('brands', [AdminController::class, 'brandIndex']);
        Route::post('brands', [AdminController::class, 'brandStore']);
        Route::put('brands/{brand}', [AdminController::class, 'brandUpdate']);
        Route::delete('brands/{brand}', [AdminController::class, 'brandDestroy']);

        // Orders
        Route::get('orders', [AdminController::class, 'orderIndex']);
        Route::get('orders/{order}', [AdminController::class, 'orderShow']);
        Route::put('orders/{order}/status', [AdminController::class, 'orderUpdateStatus']);
        Route::delete('orders/{order}', [AdminController::class, 'orderDestroy']);

        // Users CRUD
        Route::get('users', [AdminController::class, 'userIndex']);
        Route::post('users', [AdminController::class, 'userStore']);
        Route::put('users/{user}', [AdminController::class, 'userUpdate']);
        Route::delete('users/{user}', [AdminController::class, 'userDestroy']);

        // Reviews
        Route::get('reviews', [AdminController::class, 'reviewIndex']);
        Route::put('reviews/{review}', [AdminController::class, 'reviewUpdate']);
        Route::delete('reviews/{review}', [AdminController::class, 'reviewDestroy']);

        // Flash Sales
        Route::get('flash-sales', [AdminController::class, 'flashSaleIndex']);
        Route::post('flash-sales', [AdminController::class, 'flashSaleStore']);
        Route::put('flash-sales/{flashSale}', [AdminController::class, 'flashSaleUpdate']);
        Route::delete('flash-sales/{flashSale}', [AdminController::class, 'flashSaleDestroy']);

        // Coupons
        Route::get('coupons', [AdminController::class, 'couponIndex']);
        Route::post('coupons', [AdminController::class, 'couponStore']);
        Route::put('coupons/{coupon}', [AdminController::class, 'couponUpdate']);
        Route::delete('coupons/{coupon}', [AdminController::class, 'couponDestroy']);

        // Banners
        Route::get('banners', [AdminController::class, 'bannerIndex']);
        Route::post('banners', [AdminController::class, 'bannerStore']);
        Route::put('banners/{banner}', [AdminController::class, 'bannerUpdate']);
        Route::delete('banners/{banner}', [AdminController::class, 'bannerDestroy']);

        // Nav Menus
        Route::get('menus', [AdminController::class, 'menuIndex']);
        Route::post('menus', [AdminController::class, 'menuStore']);
        Route::put('menus/{menu}', [AdminController::class, 'menuUpdate']);
        Route::delete('menus/{menu}', [AdminController::class, 'menuDestroy']);

        // Blog
        Route::get('blog', [AdminController::class, 'blogIndex']);
        Route::post('blog', [AdminController::class, 'blogStore']);
        Route::put('blog/{post}', [AdminController::class, 'blogUpdate']);
        Route::delete('blog/{post}', [AdminController::class, 'blogDestroy']);

        // Shipping Zones
        Route::get('shipping', [AdminController::class, 'shippingIndex']);
        Route::post('shipping', [AdminController::class, 'shippingStore']);
        Route::put('shipping/{zone}', [AdminController::class, 'shippingUpdate']);
        Route::delete('shipping/{zone}', [AdminController::class, 'shippingDestroy']);

        // Settings
        Route::get('settings', [AdminController::class, 'settingsIndex']);
        Route::put('settings', [AdminController::class, 'settingsUpdate']);

        // Landing Pages
        Route::get('landing-pages', [AdminController::class, 'landingIndex']);
        Route::post('landing-pages', [AdminController::class, 'landingStore']);
        Route::put('landing-pages/{landing}', [AdminController::class, 'landingUpdate']);
        Route::delete('landing-pages/{landing}', [AdminController::class, 'landingDestroy']);

        // File upload
        Route::post('upload', [AdminController::class, 'upload']);
    });
});
