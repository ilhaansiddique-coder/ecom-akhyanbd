<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    public function index(): JsonResponse
    {
        $categories = Cache::remember('categories_active', 600, function () {
            return Category::withCount('products')
                ->where('is_active', true)
                ->orderBy('sort_order', 'asc')
                ->get()
                ->toArray();
        });

        return response()->json($categories);
    }
}
