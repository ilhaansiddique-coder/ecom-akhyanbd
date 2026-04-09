<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShippingZone extends Model
{
    protected $fillable = [
        'name',
        'cities',
        'rate',
        'estimated_days',
        'is_active',
    ];

    protected $casts = [
        'cities'    => 'array',
        'rate'      => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public static function getRate(string $city): float
    {
        $zones = static::where('is_active', true)->get();

        foreach ($zones as $zone) {
            $cities = $zone->cities ?? [];
            foreach ($cities as $c) {
                if (mb_strtolower($c) === mb_strtolower($city)) {
                    return (float) $zone->rate;
                }
            }
        }

        return 60.0;
    }
}
