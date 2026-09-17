<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Branch;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:view users')->only(['index', 'show']);
        $this->middleware('permission:create users')->only(['store']);
        $this->middleware('permission:edit users')->only(['update']);
        $this->middleware('permission:delete users')->only(['destroy']);
    }

    public function index(Request $request)
    {
        $query = User::with(['branch', 'roles'])
            ->where('id', '!=', auth()->id()); // Don't show current user

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('username', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhere('employee_id', 'LIKE', "%{$search}%")
                  ->orWhere('phone', 'LIKE', "%{$search}%");
            });
        }

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        if ($request->has('role')) {
            $query->whereHas('roles', function($q) use ($request) {
                $q->where('name', $request->role);
            });
        }

        $query->orderBy($request->get('sort_by', 'created_at'), $request->get('sort_order', 'desc'));

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'username' => 'nullable|string|max:20|unique:users,username',
            'email' => 'nullable|email|unique:users,email',
            'password' => 'required|min:8|confirmed',
            'phone' => 'required|string|max:20',
            'address' => 'nullable|string',
            'branch_id' => 'required|exists:branches,id',
            'employee_id' => 'nullable|string|unique:users,employee_id',
            'identity_card_no' => 'required|string|max:255',
            'bank_name' => 'required|string|max:255',
            'bank_branch' => 'required|string|max:255',
            'bank_account_no' => 'required|string|max:255',
            'dob' => 'nullable|date',
            'joining_date' => 'nullable|date',
            'salary' => 'nullable|numeric|min:0',
            'salary_rate_type' => 'required|string|in:monthly,daily',
            'leave_days_per_year' => 'required|integer|min:0',
            'role' => 'required|exists:roles,name',
            'is_active' => 'boolean',
            'epf_etf' => 'boolean',
            'profile_image' => 'nullable|image|max:2048'
        ]);

        DB::transaction(function() use ($validated, &$user, $request) {
            $profileImagePath = null;
            if ($request->hasFile('profile_image')) {
                $profileImagePath = $request->file('profile_image')->store('profiles', 'public');
            }

            $user = User::create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'],
                'username' => $validated['username'] ?? null,
                'email' => $validated['email'] ?? null,
                'password' => Hash::make($validated['password']),
                'phone' => $validated['phone'],
                'address' => $validated['address'] ?? null,
                'branch_id' => $validated['branch_id'],
                'employee_id' => $validated['employee_id'] ?? null,
                'identity_card_no' => $validated['identity_card_no'],
                'bank_name' => $validated['bank_name'],
                'bank_branch' => $validated['bank_branch'],
                'bank_account_no' => $validated['bank_account_no'],
                'dob' => $validated['dob'] ?? null,
                'joining_date' => $validated['joining_date'] ?? null,
                'salary' => $validated['salary'] ?? null,
                'salary_rate_type' => $validated['salary_rate_type'],
                'leave_days_per_year' => $validated['leave_days_per_year'],
                'is_active' => $validated['is_active'] ?? true,
                'epf_etf' => $validated['epf_etf'] ?? false,
                'profile_image' => $profileImagePath
            ]);

            // Assign role
            $user->assignRole($validated['role']);
        });

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load(['branch', 'roles'])
        ], 201);
    }

    public function show(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['error' => 'Cannot view your own profile through this endpoint'], 403);
        }
        return response()->json($user->load(['branch', 'roles', 'permissions']));
    }

    public function update(Request $request, User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['error' => 'Cannot update your own profile through this endpoint'], 403);
        }

        $validated = $request->validate([
            'first_name' => 'sometimes|string|max:255',
            'last_name' => 'sometimes|string|max:255',
            'username' => ['nullable', 'string', 'max:20', Rule::unique('users')->ignore($user->id)],
            'email' => ['nullable', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|min:8|confirmed',
            'phone' => 'sometimes|string|max:20',
            'address' => 'nullable|string',
            'branch_id' => 'sometimes|exists:branches,id',
            'employee_id' => ['nullable', 'string', Rule::unique('users')->ignore($user->id)],
            'identity_card_no' => 'sometimes|string|max:255',
            'bank_name' => 'sometimes|string|max:255',
            'bank_branch' => 'sometimes|string|max:255',
            'bank_account_no' => 'sometimes|string|max:255',
            'dob' => 'nullable|date',
            'joining_date' => 'nullable|date',
            'salary' => 'nullable|numeric|min:0',
            'salary_rate_type' => 'sometimes|string|in:monthly,daily',
            'leave_days_per_year' => 'sometimes|integer|min:0',
            'role' => 'sometimes|exists:roles,name',
            'is_active' => 'sometimes|boolean',
            'epf_etf' => 'sometimes|boolean',
            'profile_image' => 'nullable|image|max:2048'
        ]);

        DB::transaction(function() use ($user, $validated, $request) {
            // Update user data
            $data = collect($validated)->except(['password', 'role', 'profile_image'])->toArray();
            
            if (isset($validated['password'])) {
                $data['password'] = Hash::make($validated['password']);
            }

            if ($request->hasFile('profile_image')) {
                $data['profile_image'] = $request->file('profile_image')->store('profiles', 'public');
            }

            $user->update($data);

            // Update role if provided
            if (isset($validated['role'])) {
                $user->syncRoles([$validated['role']]);
            }
        });

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh()->load(['branch', 'roles'])
        ]);
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['error' => 'Cannot delete your own account'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function roles()
    {
        $roles = Role::with('permissions')->get();
        return response()->json($roles);
    }

    /**
     * Lightweight endpoint — returns minimal user info (id, name, branch_id) for
     * mechanics and service agents. No special permission required; this data
     * is needed to populate dropdowns in forms that any permitted user may access.
     */
    public function fieldStaff(Request $request)
    {
        $query = User::with('branch')
            ->where('is_active', true)
            ->whereHas('roles', fn($q) => $q->whereIn('name', ['mechanic', 'service_agent', 'manager', 'admin']));

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        $staff = $query->get(['id', 'name', 'branch_id']);

        return response()->json($staff);
    }

    public function permissions()
    {
        $permissions = Permission::all();
        return response()->json($permissions);
    }

    public function assignPermissions(Request $request, User $user)
    {
        $validated = $request->validate([
            'permissions' => 'present|array',
            'permissions.*' => 'exists:permissions,name'
        ]);

        $user->syncPermissions($validated['permissions']);
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'message' => 'Permissions assigned successfully',
            'user' => $user->load(['roles', 'permissions'])
        ]);
    }

    public function getUserPermissions(User $user)
    {
        return response()->json([
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'roles' => $user->getRoleNames()
        ]);
    }

    public function profile()
    {
        $user = auth()->user()->load(['branch', 'roles', 'permissions']);
        return response()->json($user);
    }

    public function updateProfile(Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'username' => ['nullable', 'string', 'max:20', Rule::unique('users')->ignore($user->id)],
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'sometimes|string|max:20',
            'address' => 'nullable|string',
            'profile_image' => 'nullable|image|max:2048',
            'current_password' => 'nullable|required_with:new_password',
            'new_password' => 'nullable|min:8|confirmed'
        ]);

        if (isset($validated['current_password'])) {
            if (!Hash::check($validated['current_password'], $user->password)) {
                return response()->json(['error' => 'Current password is incorrect'], 422);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        if (isset($validated['profile_image'])) {
            $path = $validated['profile_image']->store('profiles', 'public');
            $user->profile_image = $path;
        }

        $user->update(collect($validated)->except(['current_password', 'new_password', 'profile_image'])->toArray());

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user->fresh()
        ]);
    }
}