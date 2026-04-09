<?php

namespace App\Filament\Resources\FlashSaleResource\RelationManagers;

use Filament\Forms\Components\TextInput;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ProductsRelationManager extends RelationManager
{
    protected static string $relationship = 'products';

    public function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('sale_price')
                    ->numeric()
                    ->required()
                    ->prefix('৳'),
            ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name'),
                TextColumn::make('price')
                    ->money('BDT'),
                TextColumn::make('pivot.sale_price')
                    ->label('Sale Price')
                    ->money('BDT'),
            ]);
    }
}
