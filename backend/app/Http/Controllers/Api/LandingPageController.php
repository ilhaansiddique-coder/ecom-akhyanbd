<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LandingPage;
use Illuminate\Http\JsonResponse;

class LandingPageController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $landingPage = LandingPage::with('product')
            ->where('slug', $slug)
            ->where('is_active', true)
            ->firstOrFail();

        return response()->json($landingPage);
    }
}
