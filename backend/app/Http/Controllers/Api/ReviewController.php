<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function index(int $product): JsonResponse
    {
        $reviews = Review::where('product_id', $product)
            ->where('is_approved', true)
            ->latest()
            ->get();

        return response()->json($reviews);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'customer_name' => 'required|string|max:255',
            'rating' => 'required|integer|min:1|max:5',
            'review' => 'required|string',
        ]);

        $review = Review::create([
            ...$validated,
            'user_id' => $request->user()?->id,
            'is_approved' => false,
        ]);

        return response()->json(['message' => 'আপনার রিভিউ জমা হয়েছে। অনুমোদনের পর প্রকাশিত হবে।', 'review' => $review], 201);
    }
}
