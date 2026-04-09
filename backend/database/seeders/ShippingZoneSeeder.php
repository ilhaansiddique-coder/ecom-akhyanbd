<?php

namespace Database\Seeders;

use App\Models\ShippingZone;
use Illuminate\Database\Seeder;

class ShippingZoneSeeder extends Seeder
{
    public function run(): void
    {
        $zones = [
            [
                'name'           => 'ঢাকা',
                'cities'         => ['ঢাকা', 'Dhaka'],
                'rate'           => 60.00,
                'estimated_days' => '১-২ দিন',
                'is_active'      => true,
            ],
            [
                'name'           => 'চট্টগ্রাম',
                'cities'         => ['চট্টগ্রাম', 'Chittagong'],
                'rate'           => 100.00,
                'estimated_days' => '২-৩ দিন',
                'is_active'      => true,
            ],
            [
                'name'           => 'সারাদেশ',
                'cities'         => ['অন্যান্য'],
                'rate'           => 120.00,
                'estimated_days' => '৩-৫ দিন',
                'is_active'      => true,
            ],
        ];

        foreach ($zones as $zone) {
            ShippingZone::firstOrCreate(
                ['name' => $zone['name']],
                $zone
            );
        }
    }
}
