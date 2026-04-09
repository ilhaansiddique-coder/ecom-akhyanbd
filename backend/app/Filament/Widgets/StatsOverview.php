<?php

namespace App\Filament\Widgets;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class StatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('মোট অর্ডার', Order::count())
                ->description('সর্বমোট অর্ডার সংখ্যা')
                ->icon('heroicon-o-shopping-cart')
                ->color('primary'),
            Stat::make('আজকের অর্ডার', Order::whereDate('created_at', today())->count())
                ->description('আজ প্রাপ্ত অর্ডার')
                ->icon('heroicon-o-clock')
                ->color('success'),
            Stat::make('মোট রেভিনিউ', '৳' . number_format(Order::sum('total'), 0))
                ->description('সর্বমোট বিক্রয়')
                ->icon('heroicon-o-currency-bangladeshi')
                ->color('warning'),
            Stat::make('মোট গ্রাহক', User::where('role', 'customer')->count())
                ->description('রেজিস্টার্ড গ্রাহক')
                ->icon('heroicon-o-users')
                ->color('info'),
            Stat::make('মোট পণ্য', Product::count())
                ->description('সক্রিয় পণ্য: ' . Product::where('is_active', true)->count())
                ->icon('heroicon-o-shopping-bag')
                ->color('primary'),
            Stat::make('অপেক্ষমাণ অর্ডার', Order::where('status', 'pending')->count())
                ->description('প্রসেস করা বাকি')
                ->icon('heroicon-o-exclamation-circle')
                ->color('danger'),
        ];
    }
}
