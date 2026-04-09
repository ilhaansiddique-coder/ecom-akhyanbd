<x-mail::message>
# অর্ডার নিশ্চিতকরণ

প্রিয় {{ $order->customer_name }},

আপনার অর্ডার সফলভাবে গ্রহণ করা হয়েছে।

**অর্ডার নম্বর:** #{{ $order->id }}
**তারিখ:** {{ $order->created_at->format('d/m/Y') }}
**মোট:** ৳{{ number_format($order->total, 0) }}
**পেমেন্ট:** {{ $order->payment_method === 'cod' ? 'ক্যাশ অন ডেলিভারি' : $order->payment_method }}

## অর্ডার আইটেম

@foreach($order->items as $item)
- {{ $item->product_name }} × {{ $item->quantity }} — ৳{{ number_format($item->price * $item->quantity, 0) }}
@endforeach

---

**সাবটোটাল:** ৳{{ number_format($order->subtotal, 0) }}
**শিপিং:** ৳{{ number_format($order->shipping_cost, 0) }}
**সর্বমোট:** ৳{{ number_format($order->total, 0) }}

আমরা শীঘ্রই আপনার অর্ডার প্রসেস করব এবং ডেলিভারি সম্পর্কে আপনাকে জানাব।

ধন্যবাদ,
**মা ভেষজ বাণিজ্যালয়**
</x-mail::message>
