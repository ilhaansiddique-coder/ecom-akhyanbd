<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FlashSale;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

class FlashSaleController extends Controller
{
    public function active(): JsonResponse
    {
        $flashSale = Cache::remember('flash_sale_active', 120, function () {
            return FlashSale::active()
                ->with(['products' => function ($query) {
                    $query->where('is_active', true)->withPivot('sale_price');
                }])
                ->first()
                ?->toArray();
        });

        return response()->json($flashSale);
    }
}
