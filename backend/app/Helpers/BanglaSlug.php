<?php

namespace App\Helpers;

use Illuminate\Support\Str;

class BanglaSlug
{
    /**
     * Bangla → English word translation dictionary.
     * Covers common herbal/e-commerce product terms.
     * Add more entries as your catalog grows.
     */
    private static array $dictionary = [
        // ─── Weights & Measures ───
        'কেজি'       => 'kg',
        'গ্রাম'      => 'gram',
        'লিটার'      => 'liter',
        'মিলি'       => 'ml',
        'হাফ'        => 'half',
        'আধা'        => 'half',
        'পূর্ণ'      => 'full',

        // ─── Numbers ───
        '১'    => '1',    '২'    => '2',    '৩'    => '3',
        '৪'    => '4',    '৫'    => '5',    '৬'    => '6',
        '৭'    => '7',    '৮'    => '8',    '৯'    => '9',
        '০'    => '0',
        '১০০'  => '100',  '২০০'  => '200',  '৩০০'  => '300',
        '৪০০'  => '400',  '৫০০'  => '500',  '৬০০'  => '600',
        '৭০০'  => '700',  '৮০০'  => '800',  '৯০০'  => '900',
        '১০০০' => '1000',

        // ─── Product Types ───
        'গুঁড়ো'     => 'powder',
        'গুড়া'      => 'powder',
        'গুঁড়া'     => 'powder',
        'পাউডার'     => 'powder',
        'চা'         => 'tea',
        'তেল'        => 'oil',
        'মধু'        => 'honey',
        'রস'         => 'juice',
        'ক্যাপসুল'   => 'capsule',
        'ট্যাবলেট'   => 'tablet',
        'সিরাপ'      => 'syrup',
        'ক্রিম'      => 'cream',
        'সাবান'      => 'soap',
        'শ্যাম্পু'   => 'shampoo',
        'প্যাক'      => 'pack',
        'মিক্স'      => 'mix',
        'কম্বো'      => 'combo',
        'সেট'        => 'set',
        'বক্স'       => 'box',

        // ─── States / Processing ───
        'কাঁচা'      => 'raw',
        'শুকনো'      => 'dried',
        'শুকনা'      => 'dried',
        'ভাজা'       => 'roasted',
        'গুঁড়ো করা'  => 'powdered',
        'জৈব'        => 'organic',
        'প্রাকৃতিক'  => 'natural',
        'খাঁটি'      => 'pure',
        'বিশুদ্ধ'    => 'pure',
        'তাজা'       => 'fresh',
        'স্প্রে'     => 'spray',
        'ড্রাইড'     => 'dried',

        // ─── Herbs & Ingredients ───
        'সজনে'       => 'moringa',
        'সজিনা'      => 'moringa',
        'মরিঙ্গা'    => 'moringa',
        'নিম'        => 'neem',
        'তুলসী'      => 'tulsi',
        'তুলসি'      => 'tulsi',
        'অর্জুন'     => 'arjun',
        'অশ্বগন্ধা'  => 'ashwagandha',
        'হলুদ'       => 'turmeric',
        'আদা'        => 'ginger',
        'রসুন'       => 'garlic',
        'মেথি'       => 'fenugreek',
        'মেথির'      => 'fenugreek',
        'কালোজিরা'   => 'black-seed',
        'কালিজিরা'   => 'black-seed',
        'জিরা'       => 'cumin',
        'ধনিয়া'     => 'coriander',
        'দারুচিনি'   => 'cinnamon',
        'এলাচ'       => 'cardamom',
        'এলাচি'      => 'cardamom',
        'লবঙ্গ'      => 'clove',
        'গোলমরিচ'    => 'black-pepper',
        'মরিচ'       => 'pepper',
        'তেজপাতা'    => 'bay-leaf',
        'পুদিনা'     => 'mint',
        'বাসক'       => 'basak',
        'আমলকী'      => 'amla',
        'আমলা'       => 'amla',
        'হরীতকী'     => 'haritaki',
        'বহেরা'      => 'bahera',
        'ত্রিফলা'    => 'triphala',
        'শতমূলী'     => 'shatamuli',
        'চিয়া'      => 'chia',
        'সীড'        => 'seed',
        'বীজ'        => 'seed',
        'রোজেলা'     => 'rosella',
        'বিটরুট'     => 'beetroot',
        'পঞ্চভূত'    => 'panchbhut',
        'মেহেদী'     => 'mehedi',
        'মেহেদি'     => 'mehedi',
        'জবা'        => 'hibiscus',
        'ইসবগুল'     => 'isabgol',
        'তোকমা'      => 'basil-seed',
        'কিসমিস'     => 'raisin',
        'বাদাম'      => 'almond',
        'কাজু'       => 'cashew',
        'পেস্তা'     => 'pistachio',
        'আখরোট'      => 'walnut',
        'খেজুর'      => 'dates',
        'ডুমুর'      => 'fig',
        'জলপাই'      => 'olive',
        'নারকেল'     => 'coconut',
        'তিল'        => 'sesame',
        'তিসি'       => 'flaxseed',
        'সরিষা'      => 'mustard',
        'জাফরান'     => 'saffron',
        'স্টিভিয়া'  => 'stevia',
        'অ্যালোভেরা'  => 'aloe-vera',
        'থানকুনি'    => 'thankuni',
        'পাতা'       => 'leaf',

        // ─── Body & Health ───
        'হার্ট'      => 'heart',
        'হৃদয়'      => 'heart',
        'কেয়ার'      => 'care',
        'যত্ন'       => 'care',
        'চুল'        => 'hair',
        'চুলের'      => 'hair',
        'ত্বক'       => 'skin',
        'ত্বকের'     => 'skin',
        'স্বাস্থ্য'  => 'health',
        'শরীর'       => 'body',
        'রক্ত'       => 'blood',
        'রক্তচাপ'    => 'blood-pressure',
        'ডায়াবেটিস'  => 'diabetes',
        'ওজন'        => 'weight',
        'হজম'        => 'digestion',
        'রোগ'        => 'disease',
        'ব্যথা'      => 'pain',
        'জ্বর'       => 'fever',
        'কাশি'       => 'cough',
        'সর্দি'      => 'cold',
        'এলার্জি'    => 'allergy',
        'ইমিউনিটি'   => 'immunity',
        'প্রতিরোধ'   => 'immunity',

        // ─── Common Adjectives ───
        'বিশেষ'      => 'special',
        'প্রিমিয়াম'  => 'premium',
        'এক্সট্রা'   => 'extra',
        'সুপার'      => 'super',
        'গোল্ড'      => 'gold',
        'রেগুলার'    => 'regular',
        'মিনি'       => 'mini',
        'বড়'        => 'large',
        'ছোট'        => 'small',
        'ভেষজ'       => 'herbal',
        'আয়ুর্বেদিক' => 'ayurvedic',

        // ─── Actions / Descriptions ───
        'রেমেডি'     => 'remedy',
        'সমাধান'     => 'remedy',
        'যাদু'       => 'magic',
        'শক্তি'      => 'energy',
        'বুস্ট'      => 'boost',
        'উপাদান'     => 'ingredients',
        'মিশ্রণ'     => 'mix',
        'ফর্মুলা'    => 'formula',
        'পণ্য'       => 'product',
        'অফার'       => 'offer',
        'প্যাকেজ'   => 'package',
    ];

    /**
     * Generate an English slug from Bangla (or mixed) text.
     *
     * 1. Multi-word dictionary phrases are matched first (longest match wins)
     * 2. Then single-word translations
     * 3. Already-English words pass through as-is
     * 4. Untranslatable Bangla words are transliterated via Str::slug()
     */
    public static function make(string $text): string
    {
        $text = trim($text);
        if ($text === '') {
            return '';
        }

        // If text is already ASCII, just use Str::slug
        if (mb_detect_encoding($text, 'ASCII', true) !== false) {
            return Str::slug($text);
        }

        // Replace multi-word phrases first (longest first)
        $phrases = array_filter(self::$dictionary, fn($k) => mb_strpos($k, ' ') !== false, ARRAY_FILTER_USE_KEY);
        arsort($phrases); // longest key first by value isn't right, let's sort by key length
        uksort($phrases, fn($a, $b) => mb_strlen($b) - mb_strlen($a));
        foreach ($phrases as $bn => $en) {
            $text = str_replace($bn, " {$en} ", $text);
        }

        // Split into tokens
        $tokens = preg_split('/[\s\-\/_,।]+/u', $text, -1, PREG_SPLIT_NO_EMPTY);
        $translated = [];

        foreach ($tokens as $token) {
            $token = trim($token);
            if ($token === '') continue;

            // Already English?
            if (preg_match('/^[a-zA-Z0-9\-]+$/', $token)) {
                $translated[] = strtolower($token);
                continue;
            }

            // Dictionary lookup
            if (isset(self::$dictionary[$token])) {
                $translated[] = self::$dictionary[$token];
                continue;
            }

            // Try removing common suffixes and re-lookup
            $stripped = preg_replace('/(র|ের|এর|তে|তা|য়|ে)$/u', '', $token);
            if ($stripped && isset(self::$dictionary[$stripped])) {
                $translated[] = self::$dictionary[$stripped];
                continue;
            }

            // Bangla digit conversion
            $digitMap = ['০'=>'0','১'=>'1','২'=>'2','৩'=>'3','৪'=>'4','৫'=>'5','৬'=>'6','৭'=>'7','৮'=>'8','৯'=>'9'];
            $converted = strtr($token, $digitMap);
            if (preg_match('/^[0-9]+$/', $converted)) {
                $translated[] = $converted;
                continue;
            }

            // Fallback: let Str::slug attempt transliteration
            $fallback = Str::slug($token);
            if ($fallback !== '') {
                $translated[] = $fallback;
            }
        }

        $slug = implode('-', array_filter($translated));

        // Clean up double dashes
        $slug = preg_replace('/-{2,}/', '-', $slug);
        $slug = trim($slug, '-');

        return $slug ?: 'product-' . time();
    }

    /**
     * Add custom translations at runtime.
     */
    public static function extend(array $translations): void
    {
        self::$dictionary = array_merge(self::$dictionary, $translations);
    }
}
