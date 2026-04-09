<?php

namespace App\Filament\Widgets;

use App\Models\Product;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class LowStockAlert extends BaseWidget
{
    protected int | string | array $columnSpan = 'full';
    protected static ?int $sort = 4;
    protected static ?string $heading = 'স্টক সতর্কতা (১০ এর নিচে)';

    public function table(Table $table): Table
    {
        return $table
            ->query(Product::query()->where('stock', '<=', 10)->where('is_active', true)->orderBy('stock'))
            ->columns([
                TextColumn::make('name')->label('পণ্য')->searchable(),
                TextColumn::make('stock')->label('স্টক')
                    ->badge()
                    ->color(fn (int $state): string => $state === 0 ? 'danger' : 'warning'),
                TextColumn::make('sold_count')->label('বিক্রি'),
                TextColumn::make('price')->label('দাম')->money('BDT'),
            ])
            ->emptyStateHeading('স্টক সতর্কতা নেই')
            ->emptyStateDescription('সব পণ্যে পর্যাপ্ত স্টক আছে');
    }
}
