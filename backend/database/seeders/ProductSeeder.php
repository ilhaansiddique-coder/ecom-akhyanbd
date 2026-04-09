<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $catMap = Category::pluck('id', 'slug')->toArray();

        $products = [
            [
                'name' => 'হাফ কেজি রোজেলা চা',
                'slug' => 'half-kg-rosella-tea',
                'price' => 750,
                'image' => 'https://mavesoj.com/wp-content/uploads/2025/11/WhatsApp-Image-2025-10-29-at-22.48.14_2455e583.jpg',
                'category_id' => $catMap['herbal-tea'],
                'badge' => 'জনপ্রিয়',
                'badge_color' => 'bg-primary',
                'weight' => '৫০০ গ্রাম',
                'stock' => 50,
                'sort_order' => 1,
            ],
            [
                'name' => '৪০০ গ্রাম বিটরুট + ৪০০ গ্রাম চিয়া সীড কম্বো',
                'slug' => '400g-beetroot-400g-chia-seed-combo',
                'price' => 850,
                'original_price' => 1100,
                'image' => 'https://mavesoj.com/wp-content/uploads/2026/02/1000194546.jpg',
                'category_id' => $catMap['combo-pack'],
                'badge' => 'কম্বো',
                'badge_color' => 'bg-amber-500',
                'weight' => '৮০০ গ্রাম',
                'stock' => 30,
                'sort_order' => 2,
            ],
            [
                'name' => 'পঞ্চভূত কাঁচা উপাদান',
                'slug' => 'panchbhut-raw-ingredients',
                'price' => 850,
                'image' => 'https://mavesoj.com/wp-content/uploads/2025/07/Ponchovut-768x767-1.jpg',
                'category_id' => $catMap['herbal-mix'],
                'badge' => 'সর্বাধিক বিক্রিত',
                'badge_color' => 'bg-primary',
                'stock' => 40,
                'sort_order' => 3,
            ],
            [
                'name' => '১ কেজি রোজেলা চা',
                'slug' => '1-kg-rosella-tea',
                'price' => 1350,
                'original_price' => 1500,
                'image' => 'https://mavesoj.com/wp-content/uploads/2025/11/WhatsApp-Image-2025-10-29-at-22.48.14_2455e583.jpg',
                'category_id' => $catMap['herbal-tea'],
                'badge' => 'ভ্যালু প্যাক',
                'badge_color' => 'bg-badge-green',
                'weight' => '১ কেজি',
                'stock' => 25,
                'sort_order' => 4,
            ],
            [
                'name' => 'স্প্রে ড্রাইড বিটরুট ২০০ গ্রাম',
                'slug' => 'spray-dried-beetroot-200g',
                'price' => 750,
                'image' => 'https://mavesoj.com/wp-content/uploads/2025/08/Beetroot-scaled-1.jpg',
                'category_id' => $catMap['herbal-powder'],
                'description' => 'নাইট্রেট রক্তচাপ নিয়ন্ত্রণ ও রক্তে শর্করা কমায়। বেটালাইন প্রদাহ কমায়। আয়রন নতুন লোহিত রক্তকণিকা তৈরি করে। ফাইবার হজমে সাহায্য করে। লুটেইন চোখের স্বাস্থ্য রক্ষা করে।',
                'weight' => '২০০ গ্রাম',
                'stock' => 35,
                'sort_order' => 5,
            ],
            [
                'name' => '৫০০ গ্রাম সজনে পাতা গুঁড়ো',
                'slug' => '500g-moringa-leaf-powder',
                'price' => 350,
                'image' => 'https://mavesoj.com/wp-content/uploads/2025/05/moringa-powder-1-1.jpg',
                'category_id' => $catMap['herbal-powder'],
                'badge' => 'সর্বোচ্চ রেটেড',
                'badge_color' => 'bg-primary',
                'description' => 'ডায়াবেটিস নিয়ন্ত্রণ, কোলেস্টেরল কমায়, হজম বাড়ায়, কোষ্ঠকাঠিন্য দূর করে। ১৪% প্রোটিন, ৪৬% ক্যালসিয়াম, ২৩% আয়রন ও ভিটামিন সমৃদ্ধ।',
                'weight' => '৫০০ গ্রাম',
                'stock' => 60,
                'is_featured' => true,
                'sort_order' => 6,
            ],
            [
                'name' => '৪০০ গ্রাম বিটরুট পাউডার',
                'slug' => '400g-beetroot-powder',
                'price' => 550,
                'image' => 'https://mavesoj.com/wp-content/uploads/2025/08/Beetroot-scaled-1.jpg',
                'category_id' => $catMap['herbal-powder'],
                'description' => 'নাইট্রেট সমৃদ্ধ, রক্তচাপ নিয়ন্ত্রণ করে। বেটালাইন প্রদাহ কমায়। আয়রন রক্তকণিকা তৈরিতে সাহায্য করে। ফাইবার হজমে সহায়ক।',
                'weight' => '৪০০ গ্রাম',
                'stock' => 45,
                'sort_order' => 7,
            ],
            [
                'name' => '১ কেজি বিটরুট পাউডার',
                'slug' => '1-kg-beetroot-powder',
                'price' => 950,
                'original_price' => 1100,
                'image' => 'https://mavesoj.com/wp-content/uploads/2025/05/1000198888.png',
                'category_id' => $catMap['herbal-powder'],
                'badge' => 'ভ্যালু প্যাক',
                'badge_color' => 'bg-badge-green',
                'description' => 'রক্তচাপ নিয়ন্ত্রণ, অ্যান্টিঅক্সিডেন্ট সাপোর্ট। নাইট্রেট ও বেটালাইন সমৃদ্ধ।',
                'weight' => '১ কেজি',
                'stock' => 20,
                'sort_order' => 8,
            ],
            [
                'name' => 'অর্জুন হার্ট কেয়ার রেমেডি ৫০০ গ্রাম',
                'slug' => 'arjun-heart-care-remedy-500g',
                'price' => 590,
                'image' => 'https://mavesoj.com/wp-content/uploads/2025/01/Arjun-Heart-Care.jpg',
                'category_id' => $catMap['heart-care'],
                'badge' => 'হার্ট কেয়ার',
                'badge_color' => 'bg-sale-red',
                'weight' => '৫০০ গ্রাম',
                'stock' => 30,
                'sort_order' => 9,
            ],
            [
                'name' => 'মেহেদী মিক্স হেয়ার প্যাক',
                'slug' => 'mehedi-mix-hair-pack',
                'price' => 450,
                'image' => 'https://mavesoj.com/wp-content/uploads/2024/10/Mehedi-Mix-scaled.jpg',
                'category_id' => $catMap['hair-care'],
                'badge' => 'চুলের যত্ন',
                'badge_color' => 'bg-purple-500',
                'stock' => 40,
                'sort_order' => 10,
            ],
            [
                'name' => '৯০০ গ্রাম নিম সজনে পাউডার',
                'slug' => '900g-neem-moringa-powder',
                'price' => 550,
                'image' => 'https://mavesoj.com/wp-content/uploads/2024/02/Sojne-scaled.jpg',
                'category_id' => $catMap['herbal-powder'],
                'description' => 'ডায়াবেটিস নিয়ন্ত্রণ, কোলেস্টেরল কমায়, হজম বাড়ায়। মিরাকল ট্রি — ১৪% প্রোটিন, ৪০% ক্যালসিয়াম, ২৩% আয়রন। কিডনি ও লিভার সুরক্ষা।',
                'weight' => '৯০০ গ্রাম (জার সহ ১ কেজি)',
                'stock' => 35,
                'sort_order' => 11,
            ],
            [
                'name' => 'মেথির যাদু',
                'slug' => 'methir-jadu',
                'price' => 500,
                'image' => 'https://mavesoj.com/wp-content/uploads/2024/02/Methi-Jadu-scaled.jpg',
                'category_id' => $catMap['herbal-mix'],
                'badge' => 'জনপ্রিয়',
                'badge_color' => 'bg-amber-500',
                'description' => '১০০% প্রাকৃতিক মেথি ভিত্তিক ভেষজ। গ্যাস্ট্রিক ও বুক জ্বালা বন্ধ করে, কোষ্ঠকাঠিন্য দূর করে, রোগ প্রতিরোধ ক্ষমতা বাড়ায়, হজমশক্তি বৃদ্ধি করে।',
                'stock' => 50,
                'is_featured' => true,
                'sort_order' => 12,
            ],
        ];

        foreach ($products as $p) {
            Product::create($p);
        }
    }
}
