<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Laravel\Scout\Searchable;

class Product extends Model
{
    use Searchable;

    protected $fillable = [
        'name',
        'slug',
        'category_id',
        'brand_id',
        'description',
        'price',
        'original_price',
        'image',
        'images',
        'badge',
        'badge_color',
        'weight',
        'stock',
        'sold_count',
        'is_active',
        'is_featured',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'original_price' => 'decimal:2',
        'images' => 'array',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function flashSales(): BelongsToMany
    {
        return $this->belongsToMany(FlashSale::class)->withPivot('sale_price')->withTimestamps();
    }

    public function landingPage(): HasOne
    {
        return $this->hasOne(LandingPage::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'badge' => $this->badge,
        ];
    }
}
