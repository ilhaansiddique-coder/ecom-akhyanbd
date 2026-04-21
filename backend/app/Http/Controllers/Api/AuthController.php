<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Mail\WelcomeEmail;
use App\Mail\ResetCodeMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'phone'    => 'nullable|string',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone'    => $validated['phone'] ?? null,
            'role'     => 'customer',
        ]);

        $token = $user->createToken('api-token')->plainTextToken;

        // Send welcome email (non-blocking)
        try { Mail::to($user->email)->queue(new WelcomeEmail($user)); } catch (\Throwable) {}

        return response()->json([
            'user'  => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।'],
            ]);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'user'  => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি।'],
            ]);
        }

        $token = Str::random(6);

        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $request->email],
            ['token' => Hash::make($token), 'created_at' => now()]
        );

        // Send reset code via email
        try {
            Mail::to($user->email)->queue(new ResetCodeMail($token));
        } catch (\Throwable $e) {
            // Log error or handle gracefully
        }

        return response()->json([
            'message' => 'রিসেট কোড আপনার ইমেইলে পাঠানো হয়েছে।',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'code'     => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (! $record || ! Hash::check($request->code, $record->token)) {
            throw ValidationException::withMessages([
                'code' => ['রিসেট কোড সঠিক নয়।'],
            ]);
        }

        $user = User::where('email', $request->email)->firstOrFail();
        $user->update(['password' => Hash::make($request->password)]);

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'পাসওয়ার্ড রিসেট সফল হয়েছে।',
            'user'    => $user,
            'token'   => $token,
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'phone' => 'nullable|string',
            'email' => 'sometimes|email|unique:users,email,' . $request->user()->id,
        ]);

        $request->user()->update($validated);

        return response()->json($request->user()->fresh());
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|confirmed',
        ]);

        if (! Hash::check($validated['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['বর্তমান পাসওয়ার্ড সঠিক নয়।'],
            ]);
        }

        $request->user()->update(['password' => Hash::make($validated['password'])]);

        return response()->json(['message' => 'পাসওয়ার্ড পরিবর্তন হয়েছে।']);
    }
}
