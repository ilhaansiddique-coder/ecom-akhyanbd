<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CouponController extends Controller
{
    public function apply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code'     => 'required|string',
            'subtotal' => 'required|numeric|min:0',
        ]);

        $coupon = Coupon::where('code', $validated['code'])->first();

        if (! $coupon) {
            return response()->json([
                'message' => 'কুপন কোড পাওয়া যায়নি।',
            ], 404);
        }

        if (! $coupon->isValid()) {
            return response()->json([
                'message' => 'কুপন কোডটি বৈধ নয় বা মেয়াদ শেষ হয়ে গেছে।',
            ], 422);
        }

        if ((float) $validated['subtotal'] < (float) $coupon->min_order_amount) {
            return response()->json([
                'message' => 'ন্যূনতম অর্ডার পরিমাণ ৳' . number_format($coupon->min_order_amount, 2) . ' হতে হবে।',
            ], 422);
        }

        $discount = $coupon->calculateDiscount((float) $validated['subtotal']);

        return response()->json([
            'discount' => $discount,
            'coupon'   => [
                'id'               => $coupon->id,
                'code'             => $coupon->code,
                'type'             => $coupon->type,
                'value'            => $coupon->value,
                'min_order_amount' => $coupon->min_order_amount,
            ],
        ]);
    }
}
