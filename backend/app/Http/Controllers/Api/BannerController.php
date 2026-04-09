<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class BannerController extends Controller
{
    public function index(): JsonResponse
    {
        $banners = Cache::remember('banners_active', 600, function () {
            return Banner::where('is_active', true)
                ->orderBy('sort_order', 'asc')
                ->get()
                ->groupBy('position')
                ->map(fn ($group) => $group->toArray())
                ->toArray();
        });

        return response()->json($banners);
    }
}
