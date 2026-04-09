<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Mail\OrderConfirmation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class OrderController extends Controller
{
    public function cancel(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            abort(403);
        }

        if ($order->status !== 'pending') {
            return response()->json([
                'message' => 'শুধুমাত্র পেন্ডিং অর্ডার বাতিল করা যাবে।',
            ], 422);
        }

        DB::transaction(function () use ($order) {
            $items = $order->items()->whereNotNull('product_id')->get();
            $productIds = $items->pluck('product_id')->filter()->unique();

            if ($productIds->isNotEmpty()) {
                $products = Product::whereIn('id', $productIds)->get()->keyBy('id');
                foreach ($items as $item) {
                    $product = $products->get($item->product_id);
                    if ($product) {
                        $product->increment('stock', $item->quantity);
                        $product->decrement('sold_count', $item->quantity);
                    }
                }
            }

            $order->update(['status' => 'cancelled']);
        });

        return response()->json([
            'message' => 'অর্ডার বাতিল করা হয়েছে।',
            'order'   => $order->fresh(),
        ]);
    }

    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,confirmed,processing,shipped,delivered,cancelled',
        ]);

        $order->update(['status' => $validated['status']]);

        return response()->json([
            'message' => 'অর্ডার স্ট্যাটাস আপডেট করা হয়েছে।',
            'order'   => $order->fresh(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()
            ->orders()
            ->with('items')
            ->latest()
            ->paginate(10);

        return response()->json($orders);
    }

    public function show(Request $request, Order $order): JsonResponse
    {
        if ($order->user_id !== $request->user()->id) {
            abort(403);
        }

        return response()->json($order->load('items'));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name'    => 'required|string',
            'customer_phone'   => 'required|string',
            'customer_email'   => 'nullable|email',
            'customer_address' => 'required|string',
            'city'             => 'required|string',
            'zip_code'         => 'nullable|string',
            'subtotal'         => 'required|numeric|min:0',
            'shipping_cost'    => 'nullable|numeric|min:0',
            'total'            => 'required|numeric|min:0',
            'payment_method'   => 'nullable|string|in:cod,bkash,nagad,bank',
            'notes'            => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.product_name' => 'nullable|string',
            'items.*.quantity'   => 'required|integer|min:1',
            'items.*.price'      => 'required|numeric|min:0',
        ]);

        // Load all products in ONE query instead of N queries
        $productIds = collect($validated['items'])->pluck('product_id')->unique()->filter();
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        // Validate stock
        $stockErrors = [];
        foreach ($validated['items'] as $item) {
            $product = $products->get($item['product_id']);
            if (! $product) {
                $stockErrors[] = "পণ্য #{$item['product_id']} পাওয়া যায়নি।";
            } elseif ($product->stock < $item['quantity']) {
                $stockErrors[] = "{$product->name} — স্টকে মাত্র {$product->stock}টি আছে, কিন্তু {$item['quantity']}টি অর্ডার করা হয়েছে।";
            }
        }
        if (! empty($stockErrors)) {
            return response()->json(['message' => 'স্টক অপর্যাপ্ত', 'errors' => ['stock' => $stockErrors]], 422);
        }

        $order = DB::transaction(function () use ($validated, $request, $products) {
            $order = Order::create([
                'user_id'          => $request->user()?->id,
                'customer_name'    => $validated['customer_name'],
                'customer_phone'   => $validated['customer_phone'],
                'customer_email'   => $validated['customer_email'] ?? null,
                'customer_address' => $validated['customer_address'],
                'city'             => $validated['city'],
                'zip_code'         => $validated['zip_code'] ?? null,
                'subtotal'         => $validated['subtotal'],
                'shipping_cost'    => $validated['shipping_cost'] ?? 0,
                'total'            => $validated['total'],
                'payment_method'   => $validated['payment_method'] ?? 'cod',
                'notes'            => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $product = $products->get($item['product_id']);

                $order->items()->create([
                    'product_id'   => $item['product_id'],
                    'product_name' => $product?->name ?? $item['product_name'] ?? 'পণ্য #' . $item['product_id'],
                    'price'        => $item['price'],
                    'quantity'     => $item['quantity'],
                ]);

                if ($product) {
                    $product->decrement('stock', $item['quantity']);
                    $product->increment('sold_count', $item['quantity']);
                }
            }

            return $order;
        });

        $order->load('items');

        // Send order confirmation email (non-blocking)
        if ($order->customer_email) {
            try { Mail::to($order->customer_email)->queue(new OrderConfirmation($order)); } catch (\Throwable) {}
        }

        return response()->json($order, 201);
    }
}
