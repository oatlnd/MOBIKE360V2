<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Return all system settings as a key-value map.
     */
    public function index()
    {
        $settings = SystemSetting::all()->pluck('value', 'key');
        return response()->json($settings);
    }

    /**
     * Update one or more settings.
     * Expects: { "settings": { "currency_symbol": "$", "currency_code": "USD" } }
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*' => 'nullable|string',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            SystemSetting::setValue($key, $value);
        }

        $settings = SystemSetting::all()->pluck('value', 'key');
        return response()->json($settings);
    }
}
