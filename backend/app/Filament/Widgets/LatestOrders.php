<?php

namespace App\Filament\Widgets;

use App\Models\Order;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;

class LatestOrders extends BaseWidget
{
    protected int | string | array $columnSpan = 'full';
    protected static ?int $sort = 2;

    public function table(Table $table): Table
    {
        return $table
            ->query(Order::query()->latest()->limit(10))
            ->columns([
                TextColumn::make('id')->label('#')->sortable(),
                TextColumn::make('customer_name')->label('গ্রাহক')->searchable(),
                TextColumn::make('customer_phone')->label('ফোন'),
                TextColumn::make('total')->label('মোট')->money('BDT'),
                TextColumn::make('status')->label('স্ট্যাটাস')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'pending' => 'warning',
                        'confirmed' => 'info',
                        'processing' => 'primary',
                        'shipped' => 'info',
                        'delivered' => 'success',
                        'cancelled' => 'danger',
                        default => 'gray',
                    }),
                TextColumn::make('payment_status')->label('পেমেন্ট')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'paid' ? 'success' : 'warning'),
                TextColumn::make('created_at')->label('তারিখ')->dateTime()->sortable(),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
