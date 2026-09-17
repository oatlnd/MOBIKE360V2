<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\EmployeeAdvance;
use App\Models\User;
use Illuminate\Http\Request;

class AdvanceController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:view_payroll|manage_advances');
    }

    /**
     * List employee advances and special allowances.
     */
    public function index(Request $request)
    {
        $query = EmployeeAdvance::with(['user:id,name,employee_id,branch_id', 'branch:id,name', 'payrollRun:id,month,period_type']);

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('notes', 'LIKE', "%{$search}%")
                  ->orWhereHas('user', fn($u) => $u->where('name', 'LIKE', "%{$search}%")->orWhere('employee_id', 'LIKE', "%{$search}%"));
            });
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        $advances = $query->orderBy('date', 'desc')->paginate($request->get('per_page', 25));

        return response()->json($advances);
    }

    /**
     * Store new cash/bank advance or special bonus allowance.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:1',
            'date' => 'required|date',
            'payment_method' => 'required|in:cash,bank_transfer',
            'type' => 'required|in:advance,festival_bonus,allowance,other',
            'notes' => 'nullable|string|max:500',
        ]);

        $user = User::findOrFail($validated['user_id']);
        $validated['branch_id'] = $user->branch_id;
        $validated['status'] = 'active';

        $advance = EmployeeAdvance::create($validated);

        return response()->json([
            'message' => 'Advance / Allowance recorded successfully',
            'advance' => $advance->load(['user:id,name,employee_id', 'branch:id,name'])
        ], 201);
    }

    /**
     * Delete or cancel an unsettled advance.
     */
    public function destroy(EmployeeAdvance $advance)
    {
        if ($advance->status === 'deducted') {
            return response()->json(['error' => 'Cannot delete an advance that has already been settled in a payroll run.'], 422);
        }

        $advance->delete();

        return response()->json(['message' => 'Advance deleted successfully']);
    }
}
