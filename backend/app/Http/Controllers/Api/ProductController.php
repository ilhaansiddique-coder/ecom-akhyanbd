<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProductController extends Controller
{
    /**
     * Cache version – incremented by AdminController on every product change.
     * Old versioned keys simply expire via TTL; new requests hit fresh data.
     */
    private function cachePrefix(): string
    {
        $v = Cache::get('product_cache_version', 0);
        return "pv{$v}_";
    }

    public function index(Request $request): JsonResponse
    {
        $cacheKey = $this->cachePrefix() . 'products_' . md5(serialize($request->query()));

        $data = Cache::remember($cacheKey, 300, function () use ($request) {
            $query = Product::with(['category', 'brand'])
                ->where('is_active', true);

            if ($request->filled('category_id')) {
                $query->where('category_id', $request->category_id);
            }

            if ($request->filled('brand_id')) {
                $query->where('brand_id', $request->brand_id);
            }

            if ($request->filled('is_featured')) {
                $query->where('is_featured', (bool) $request->is_featured);
            }

            $sortBy = $request->input('sort_by', 'sort_order');
            $sortDir = $request->input('sort_dir', 'asc');

            if (in_array($sortBy, ['price', 'sold_count', 'created_at'])) {
                $query->orderBy($sortBy, $sortDir);
            } else {
                $query->orderBy('sort_order', 'asc');
            }

            return $query->paginate(12)->toArray();
        });

        return response()->json($data);
    }

    public function show(string $slug): JsonResponse
    {
        $cacheKey = $this->cachePrefix() . "product_{$slug}";

        $product = Cache::remember($cacheKey, 300, function () use ($slug) {
            return Product::with(['category', 'brand', 'landingPage'])
                ->where('slug', $slug)
                ->where('is_active', true)
                ->firstOrFail()
                ->toArray();
        });

        return response()->json($product);
    }

    public function search(Request $request): JsonResponse
    {
        $q = $request->input('q', '');
        $results = Product::search($q)
            ->query(fn ($query) => $query->with(['category', 'brand'])->where('is_active', true))
            ->paginate(12);

        return response()->json($results);
    }

    public function topRated(): JsonResponse
    {
        $cacheKey = $this->cachePrefix() . 'products_top_rated';

        $products = Cache::remember($cacheKey, 300, function () {
            return Product::with(['category', 'brand'])
                ->where('is_active', true)
                ->orderBy('sold_count', 'desc')
                ->limit(6)
                ->get()
                ->toArray();
        });

        return response()->json($products);
    }
}
