<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        // Ensure Spatie permission cache is cleared
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permission = Permission::firstOrCreate(['name' => 'view_live_board', 'guard_name' => 'web']);

        // Grant to admin and manager by default
        $admin = Role::where('name', 'admin')->first();
        if ($admin && !$admin->hasPermissionTo('view_live_board')) {
            $admin->givePermissionTo('view_live_board');
        }

        $manager = Role::where('name', 'manager')->first();
        if ($manager && !$manager->hasPermissionTo('view_live_board')) {
            $manager->givePermissionTo('view_live_board');
        }
    }

    public function down(): void
    {
        Permission::where('name', 'view_live_board')->delete();
    }
};
