<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NavMenu;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class NavMenuController extends Controller
{
    public function index(): JsonResponse
    {
        $menus = Cache::remember('nav_menus', 600, function () {
            return NavMenu::with(['children' => function ($query) {
                $query->where('is_active', true)->orderBy('sort_order', 'asc');
            }])
                ->where('is_active', true)
                ->whereNull('parent_id')
                ->orderBy('sort_order', 'asc')
                ->get()
                ->toArray();
        });

        return response()->json($menus);
    }
}
