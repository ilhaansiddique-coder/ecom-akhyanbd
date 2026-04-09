<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ShippingZoneResource\Pages;
use App\Models\ShippingZone;
use Filament\Forms\Components\TagsInput;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ShippingZoneResource extends Resource
{
    protected static ?string $model = ShippingZone::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-map-pin';

    protected static ?string $navigationLabel = 'শিপিং জোন';
    protected static string | \UnitEnum | null $navigationGroup = 'সেটিংস';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TagsInput::make('cities'),
                TextInput::make('rate')
                    ->numeric()
                    ->prefix('৳')
                    ->required(),
                TextInput::make('estimated_days'),
                Toggle::make('is_active')
                    ->default(true),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name'),
                TextColumn::make('rate')
                    ->money('BDT'),
                TextColumn::make('estimated_days'),
                IconColumn::make('is_active')
                    ->boolean(),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListShippingZones::route('/'),
            'create' => Pages\CreateShippingZone::route('/create'),
            'edit'   => Pages\EditShippingZone::route('/{record}/edit'),
        ];
    }
}
