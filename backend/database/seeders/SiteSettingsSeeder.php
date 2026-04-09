<?php
namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class SiteSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            'site_name' => 'মা ভেষজ বাণিজ্যালয়',
            'phone' => '+880 1XXXXXXXXX',
            'email' => 'info@mavesoj.com',
            'address' => 'ঢাকা, বাংলাদেশ',
            'facebook' => 'https://facebook.com',
            'instagram' => 'https://instagram.com',
            'youtube' => 'https://youtube.com',
            'whatsapp' => 'https://wa.me/880XXXXXXXXXX',
            'header_text_1' => 'সারা বাংলাদেশে দ্রুত ডেলিভারি সেবা',
            'header_text_2' => 'অর্ডার করুন ঝামেলা মুক্ত',
            'footer_description' => 'প্রকৃতির শক্তিতে সুস্থ থাকুন। আমরা সরাসরি প্রকৃতি থেকে ভেষজ পণ্য সংগ্রহ করে আপনার দোরগোড়ায় পৌঁছে দিই।',
            'copyright_text' => 'সর্বস্বত্ব সংরক্ষিত মা ভেষজ বাণিজ্যালয়',
            'meta_title' => 'মা ভেষজ বাণিজ্যালয় — প্রাকৃতিক ভেষজ পণ্যের দোকান',
            'meta_description' => 'প্রকৃতির শক্তিতে সুস্থ থাকুন। ভেষজ গুঁড়ো, চা, হার্ট কেয়ার ও প্রাকৃতিক পণ্য।',
        ];

        foreach ($settings as $key => $value) {
            SiteSetting::set($key, $value);
        }
    }
}
