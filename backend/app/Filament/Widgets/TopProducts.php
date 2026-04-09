<?php

namespace App\Filament\Widgets;

use App\Models\Product;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class TopProducts extends BaseWidget
{
    protected int | string | array $columnSpan = 'full';
    protected static ?int $sort = 3;
    protected static ?string $heading = 'সর্বাধিক বিক্রিত পণ্য';

    public function table(Table $table): Table
    {
        return $table
            ->query(Product::query()->where('sold_count', '>', 0)->orderByDesc('sold_count')->limit(10))
            ->columns([
                ImageColumn::make('image')->label('ছবি')->circular(),
                TextColumn::make('name')->label('পণ্য')->searchable(),
                TextColumn::make('price')->label('দাম')->money('BDT'),
                TextColumn::make('sold_count')->label('বিক্রি')->sortable(),
                TextColumn::make('stock')->label('স্টক')
                    ->badge()
                    ->color(fn (int $state): string => $state <= 5 ? 'danger' : ($state <= 20 ? 'warning' : 'success')),
            ])
            ->defaultSort('sold_count', 'desc');
    }
}
