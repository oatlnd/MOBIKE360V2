<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $users = \App\Models\User::whereNull('username')->get();
        foreach ($users as $user) {
            $firstName = preg_replace('/[^A-Za-z0-9]/', '', $user->first_name ?? '');
            $lastName = preg_replace('/[^A-Za-z0-9]/', '', $user->last_name ?? '');
            
            // Replicate frontend logic: first 4 of first name + first 4 of last name
            $base = strtoupper(substr($firstName, 0, 4) . substr($lastName, 0, 4));
            if (empty($base)) {
                $base = 'USER' . $user->id;
            }

            $username = $base;
            $counter = 1;

            // Ensure uniqueness
            while (\App\Models\User::where('username', $username)->where('id', '!=', $user->id)->exists()) {
                $suffix = (string) $counter;
                $username = substr($base, 0, 8 - strlen($suffix)) . $suffix;
                $counter++;
            }

            $user->username = $username;
            $user->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No down migration needed for data backfill
    }
};
