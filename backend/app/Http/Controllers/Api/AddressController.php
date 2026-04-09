<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AddressController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $addresses = $request->user()->addresses()->latest()->get();

        return response()->json($addresses);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'label'      => 'required|string|max:50',
            'name'       => 'required|string|max:255',
            'phone'      => 'required|string|max:20',
            'address'    => 'required|string',
            'city'       => 'required|string|max:100',
            'zip_code'   => 'nullable|string|max:20',
            'is_default' => 'nullable|boolean',
        ]);

        if (! empty($validated['is_default'])) {
            $request->user()->addresses()->update(['is_default' => false]);
        }

        $address = $request->user()->addresses()->create($validated);

        return response()->json($address, 201);
    }

    public function update(Request $request, Address $address): JsonResponse
    {
        if ($address->user_id !== $request->user()->id) {
            abort(403);
        }

        $validated = $request->validate([
            'label'      => 'sometimes|required|string|max:50',
            'name'       => 'sometimes|required|string|max:255',
            'phone'      => 'sometimes|required|string|max:20',
            'address'    => 'sometimes|required|string',
            'city'       => 'sometimes|required|string|max:100',
            'zip_code'   => 'nullable|string|max:20',
            'is_default' => 'nullable|boolean',
        ]);

        if (! empty($validated['is_default'])) {
            $request->user()->addresses()->where('id', '!=', $address->id)->update(['is_default' => false]);
        }

        $address->update($validated);

        return response()->json($address);
    }

    public function destroy(Request $request, Address $address): JsonResponse
    {
        if ($address->user_id !== $request->user()->id) {
            abort(403);
        }

        $address->delete();

        return response()->json(['message' => 'ঠিকানা মুছে ফেলা হয়েছে।']);
    }
}
