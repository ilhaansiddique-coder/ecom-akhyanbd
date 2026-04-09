<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Products — most queried table
        Schema::table('products', function (Blueprint $table) {
            $table->index('is_active');
            $table->index('is_featured');
            $table->index('slug');
            $table->index('sold_count');
            $table->index('created_at');
            $table->index(['category_id', 'is_active']);
            $table->index(['brand_id', 'is_active']);
            $table->index(['is_active', 'sold_count']);
        });

        // Orders
        Schema::table('orders', function (Blueprint $table) {
            $table->index('user_id');
            $table->index('status');
            $table->index('created_at');
            $table->index(['user_id', 'created_at']);
        });

        // Order items
        Schema::table('order_items', function (Blueprint $table) {
            $table->index('product_id');
        });

        // Reviews
        Schema::table('reviews', function (Blueprint $table) {
            $table->index(['product_id', 'is_approved']);
            $table->index('created_at');
        });

        // Users
        Schema::table('users', function (Blueprint $table) {
            $table->index('role');
        });

        // Blog posts
        Schema::table('blog_posts', function (Blueprint $table) {
            $table->index('is_published');
            $table->index('slug');
        });

        // Banners
        Schema::table('banners', function (Blueprint $table) {
            $table->index(['is_active', 'position']);
        });

        // Nav menus
        Schema::table('nav_menus', function (Blueprint $table) {
            $table->index(['is_active', 'parent_id']);
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['is_active']);
            $table->dropIndex(['is_featured']);
            $table->dropIndex(['slug']);
            $table->dropIndex(['sold_count']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['category_id', 'is_active']);
            $table->dropIndex(['brand_id', 'is_active']);
            $table->dropIndex(['is_active', 'sold_count']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['user_id']);
            $table->dropIndex(['status']);
            $table->dropIndex(['created_at']);
            $table->dropIndex(['user_id', 'created_at']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['product_id']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'is_approved']);
            $table->dropIndex(['created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
        });

        Schema::table('blog_posts', function (Blueprint $table) {
            $table->dropIndex(['is_published']);
            $table->dropIndex(['slug']);
        });

        Schema::table('banners', function (Blueprint $table) {
            $table->dropIndex(['is_active', 'position']);
        });

        Schema::table('nav_menus', function (Blueprint $table) {
            $table->dropIndex(['is_active', 'parent_id']);
        });
    }
};
