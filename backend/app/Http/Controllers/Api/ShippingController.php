<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ShippingZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShippingController extends Controller
{
    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'city' => 'required|string',
        ]);

        $zone = ShippingZone::where('is_active', true)->get()->first(function ($zone) use ($validated) {
            $cities = $zone->cities ?? [];
            foreach ($cities as $c) {
                if (mb_strtolower($c) === mb_strtolower($validated['city'])) {
                    return true;
                }
            }
            return false;
        });

        $rate          = $zone ? (float) $zone->rate : 60.0;
        $estimatedDays = $zone ? $zone->estimated_days : null;

        return response()->json([
            'city'           => $validated['city'],
            'rate'           => $rate,
            'estimated_days' => $estimatedDays,
        ]);
    }

    public function zones(): JsonResponse
    {
        $zones = ShippingZone::where('is_active', true)->get();

        return response()->json($zones);
    }
}
