<?php

namespace App\Filament\Resources;

use App\Filament\Resources\ProductResource\Pages;
use App\Models\Product;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class ProductResource extends Resource
{
    protected static ?string $model = Product::class;

    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-shopping-bag';

    protected static ?string $navigationLabel = 'পণ্য';
    protected static string | \UnitEnum | null $navigationGroup = 'পণ্য ব্যবস্থাপনা';

    public static function form(Schema $schema): Schema
    {
        return $schema
            ->components([
                TextInput::make('name')
                    ->required(),
                TextInput::make('slug')
                    ->required(),
                Select::make('category_id')
                    ->relationship('category', 'name')
                    ->required(),
                Select::make('brand_id')
                    ->relationship('brand', 'name'),
                RichEditor::make('description'),
                TextInput::make('price')
                    ->numeric()
                    ->required()
                    ->prefix('৳'),
                TextInput::make('original_price')
                    ->numeric()
                    ->prefix('৳'),
                FileUpload::make('image')
                    ->directory('products')
                    ->image()
                    ->required(),
                TextInput::make('badge'),
                TextInput::make('badge_color'),
                TextInput::make('weight'),
                TextInput::make('stock')
                    ->numeric()
                    ->default(0),
                TextInput::make('sold_count')
                    ->numeric()
                    ->default(0),
                Toggle::make('is_active')
                    ->default(true),
                Toggle::make('is_featured')
                    ->default(false),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                ImageColumn::make('image'),
                TextColumn::make('name')
                    ->searchable()
                    ->limit(30),
                TextColumn::make('category.name'),
                TextColumn::make('price')
                    ->money('BDT'),
                TextColumn::make('stock'),
                TextColumn::make('sold_count')
                    ->sortable(),
                IconColumn::make('is_active')
                    ->boolean(),
                IconColumn::make('is_featured')
                    ->boolean(),
            ])
            ->filters([
                SelectFilter::make('category')
                    ->relationship('category', 'name'),
                SelectFilter::make('brand')
                    ->relationship('brand', 'name'),
                TernaryFilter::make('is_active'),
                TernaryFilter::make('is_featured'),
            ])
            ->defaultSort('sort_order', 'asc');
    }

    public static function getPages(): array
    {
        return [
            'index'  => Pages\ListProducts::route('/'),
            'create' => Pages\CreateProduct::route('/create'),
            'edit'   => Pages\EditProduct::route('/{record}/edit'),
        ];
    }
}
