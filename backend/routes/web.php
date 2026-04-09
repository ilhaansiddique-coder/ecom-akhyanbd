<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'মা ভেষজ বাণিজ্যালয় API',
        'version' => '1.0',
        'api' => url('/api/v1'),
    ]);
});
