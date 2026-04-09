<?php
namespace App\Filament\Resources;

use App\Filament\Resources\ReviewResource\Pages;
use App\Models\Review;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Components\Select;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class ReviewResource extends Resource
{
    protected static ?string $model = Review::class;
    protected static string | \BackedEnum | null $navigationIcon = 'heroicon-o-star';
    protected static ?string $navigationLabel = 'রিভিউ';
    protected static string | \UnitEnum | null $navigationGroup = 'পণ্য ব্যবস্থাপনা';

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('product_id')->relationship('product', 'name')->label('পণ্য')->disabled(),
            TextInput::make('customer_name')->label('গ্রাহকের নাম')->disabled(),
            TextInput::make('rating')->label('রেটিং')->disabled(),
            Textarea::make('review')->label('রিভিউ')->disabled(),
            Toggle::make('is_approved')->label('অনুমোদিত'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('product.name')->label('পণ্য')->limit(20),
                TextColumn::make('customer_name')->label('গ্রাহক')->searchable(),
                TextColumn::make('rating')->label('রেটিং'),
                TextColumn::make('review')->label('রিভিউ')->limit(40),
                IconColumn::make('is_approved')->boolean()->label('অনুমোদিত'),
                TextColumn::make('created_at')->dateTime()->label('তারিখ')->sortable(),
            ])
            ->filters([TernaryFilter::make('is_approved')->label('অনুমোদিত')])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListReviews::route('/'),
            'edit' => Pages\EditReview::route('/{record}/edit'),
        ];
    }
}
