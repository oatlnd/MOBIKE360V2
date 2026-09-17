<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:manage settings');
    }

    /** List all roles with their permissions */
    public function index()
    {
        $roles = Role::with('permissions')->get();
        return response()->json($roles);
    }

    /** Create a new role and assign permissions */
    public function store(Request $request)
    {
        $request->validate([
            'name'        => 'required|string|max:100|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role = Role::create(['name' => $request->name, 'guard_name' => 'web']);

        if ($request->filled('permissions')) {
            $role->syncPermissions($request->permissions);
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json($role->load('permissions'), 201);
    }

    /** Update permissions of an existing role */
    public function update(Request $request, Role $role)
    {
        $request->validate([
            'permissions'   => 'present|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role->syncPermissions($request->permissions);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json($role->load('permissions'));
    }

    /** Delete a role */
    public function destroy(Role $role)
    {
        // Protect system roles
        $protected = ['admin', 'manager', 'mechanic', 'cashier', 'service_agent', 'job_card_user'];
        if (in_array(strtolower($role->name), $protected)) {
            return response()->json(['message' => 'Cannot delete a built-in system role.'], 422);
        }

        $role->delete();

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json(['message' => 'Role deleted successfully']);
    }
}
