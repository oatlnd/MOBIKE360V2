<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\EmployeeAdvance;
use App\Models\PayrollItem;
use App\Models\PayrollRun;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:view_payroll|manage_payroll');
    }

    /**
     * List all payroll runs.
     */
    public function index(Request $request)
    {
        $query = PayrollRun::with(['branch:id,name', 'processedBy:id,name'])
            ->withCount('items');

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('month') && $request->month) {
            $query->where('month', $request->month);
        }

        if ($request->has('period_type') && $request->period_type) {
            $query->where('period_type', $request->period_type);
        }

        $runs = $query->orderBy('month', 'desc')->orderBy('created_at', 'desc')->get();

        return response()->json($runs);
    }

    /**
     * Show single payroll run with items.
     */
    public function show(PayrollRun $payrollRun)
    {
        return response()->json(
            $payrollRun->load([
                'branch:id,name',
                'processedBy:id,name',
                'items.user:id,name,employee_id,bank_name,bank_account_number,bank_branch_code,epf_number'
            ])
        );
    }

    /**
     * Calculate live preview for a period (1st Half, 2nd Half, Full Month).
     */
    public function preview(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|string|regex:/^\d{4}-\d{2}$/', // YYYY-MM
            'period_type' => 'required|in:first_half,second_half,full_month',
            'branch_id' => 'nullable|exists:branches,id',
        ]);

        $month = $validated['month'];
        $periodType = $validated['period_type'];
        $branchId = $validated['branch_id'] ?? null;

        $monthDate = Carbon::parse($month . '-01');
        $startOfMonth = $monthDate->copy()->startOfMonth();
        $endOfMonth = $monthDate->copy()->endOfMonth();
        $midMonth = $monthDate->copy()->day(15);

        // Date range for this specific period
        if ($periodType === 'first_half') {
            $startDate = $startOfMonth;
            $endDate = $midMonth;
        } elseif ($periodType === 'second_half') {
            $startDate = $midMonth->copy()->addDay();
            $endDate = $endOfMonth;
        } else {
            $startDate = $startOfMonth;
            $endDate = $endOfMonth;
        }

        // Active staff
        $staffQuery = User::where('is_active', true);
        if ($branchId) {
            $staffQuery->where('branch_id', $branchId);
        }
        $staff = $staffQuery->get();

        // Previous 1st Half run if calculating 2nd Half
        $firstHalfItems = collect();
        if ($periodType === 'second_half') {
            $firstHalfRun = PayrollRun::where('month', $month)
                ->where('period_type', 'first_half')
                ->whereIn('status', ['confirmed', 'completed'])
                ->first();

            if ($firstHalfRun) {
                $firstHalfItems = PayrollItem::where('payroll_run_id', $firstHalfRun->id)->get()->keyBy('user_id');
            }
        }

        $items = [];
        $totalBase = 0;
        $totalAdvances = 0;
        $totalBonuses = 0;
        $totalEpf = 0;
        $totalNet = 0;

        foreach ($staff as $user) {
            $baseSalary = (float)($user->base_salary ?: 0);
            $salaryType = $user->salary_type ?: 'monthly';
            $dailyRate = (float)($user->daily_rate ?: ($baseSalary / 26));

            // Attendances in period
            $attendances = Attendance::where('user_id', $user->id)
                ->whereBetween('date', [$startDate, $endDate])
                ->get();

            $presentCount = $attendances->where('status', 'present')->count();
            $halfDayCount = $attendances->where('status', 'half_day')->count();
            $workingDays = $presentCount + ($halfDayCount * 0.5);

            $sundayDays = $attendances->where('is_sunday', true)->whereIn('status', ['present', 'half_day'])->count();
            $sundayBonus = (float)$attendances->where('is_sunday', true)->sum('sunday_bonus_rate');

            // Active Advances & Bonuses
            $advancesQuery = EmployeeAdvance::where('user_id', $user->id)
                ->where('status', 'active');

            if ($periodType === 'first_half') {
                $advancesQuery->whereBetween('date', [$startOfMonth, $midMonth]);
            } else {
                $advancesQuery->whereBetween('date', [$startOfMonth, $endOfMonth]);
            }

            $userAdvances = $advancesQuery->get();
            $advancesDeducted = (float)$userAdvances->where('type', 'advance')->sum('amount');
            $specialAllowances = (float)$userAdvances->whereIn('type', ['festival_bonus', 'allowance', 'other'])->sum('amount');

            // 1st Half Paid deduction
            $firstHalfPaid = 0;
            if ($periodType === 'second_half' && isset($firstHalfItems[$user->id])) {
                $firstHalfPaid = (float)$firstHalfItems[$user->id]->net_pay;
            }

            // Calculation based on period
            if ($periodType === 'first_half') {
                // 50% accrued pay
                $periodBase = ($salaryType === 'monthly') ? ($baseSalary * 0.5) : ($dailyRate * $workingDays);
                $epfEmployee = 0; // EPF typically calculated at month end
                $epfEmployer = 0;
                $netPay = max(0, $periodBase + $sundayBonus + $specialAllowances - $advancesDeducted);
            } elseif ($periodType === 'second_half') {
                // Month End final settlement
                // Net Pay = Base + SundayBonus + Allowances - 1stHalfPaid - Advances - EPF
                $fullMonthBase = ($salaryType === 'monthly') ? $baseSalary : ($dailyRate * $workingDays);
                $periodBase = $fullMonthBase;
                $epfEmployee = $baseSalary > 0 ? round($baseSalary * 0.08, 2) : 0; // 8% EPF Employee
                $epfEmployer = $baseSalary > 0 ? round($baseSalary * 0.12, 2) : 0; // 12% EPF Employer
                $netPay = max(0, $fullMonthBase + $sundayBonus + $specialAllowances - $firstHalfPaid - $advancesDeducted - $epfEmployee);
            } else {
                // Full Month Run
                $periodBase = ($salaryType === 'monthly') ? $baseSalary : ($dailyRate * $workingDays);
                $epfEmployee = $baseSalary > 0 ? round($baseSalary * 0.08, 2) : 0;
                $epfEmployer = $baseSalary > 0 ? round($baseSalary * 0.12, 2) : 0;
                $netPay = max(0, $periodBase + $sundayBonus + $specialAllowances - $advancesDeducted - $epfEmployee);
            }

            $item = [
                'user_id' => $user->id,
                'name' => $user->name,
                'employee_id' => $user->employee_id,
                'base_salary' => $baseSalary,
                'salary_type' => $salaryType,
                'working_days' => $workingDays,
                'sunday_days' => $sundayDays,
                'sunday_bonus' => $sundayBonus,
                'allowances' => $specialAllowances,
                'advances_deducted' => $advancesDeducted,
                'first_half_paid' => $firstHalfPaid,
                'epf_employee' => $epfEmployee,
                'epf_employer' => $epfEmployer,
                'net_pay' => $netPay,
                'bank_name' => $user->bank_name,
                'bank_account_number' => $user->bank_account_number,
                'payment_method' => !empty($user->bank_account_number) ? 'bank_transfer' : 'cash',
            ];

            $items[] = $item;
            $totalBase += $periodBase;
            $totalAdvances += $advancesDeducted;
            $totalBonuses += ($sundayBonus + $specialAllowances);
            $totalEpf += $epfEmployee;
            $totalNet += $netPay;
        }

        return response()->json([
            'month' => $month,
            'period_type' => $periodType,
            'branch_id' => $branchId,
            'summary' => [
                'total_staff' => count($items),
                'total_base_pay' => round($totalBase, 2),
                'total_advances' => round($totalAdvances, 2),
                'total_bonuses' => round($totalBonuses, 2),
                'total_epf' => round($totalEpf, 2),
                'total_net_pay' => round($totalNet, 2),
            ],
            'items' => $items,
        ]);
    }

    /**
     * Store and commit a payroll run.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'month' => 'required|string|regex:/^\d{4}-\d{2}$/',
            'period_type' => 'required|in:first_half,second_half,full_month',
            'branch_id' => 'nullable|exists:branches,id',
            'payment_date' => 'nullable|date',
            'status' => 'required|in:draft,confirmed,completed',
            'items' => 'required|array|min:1',
            'items.*.user_id' => 'required|exists:users,id',
            'items.*.base_salary' => 'required|numeric|min:0',
            'items.*.working_days' => 'nullable|numeric|min:0',
            'items.*.sunday_days' => 'nullable|numeric|min:0',
            'items.*.sunday_bonus' => 'nullable|numeric|min:0',
            'items.*.allowances' => 'nullable|numeric|min:0',
            'items.*.advances_deducted' => 'nullable|numeric|min:0',
            'items.*.first_half_paid' => 'nullable|numeric|min:0',
            'items.*.epf_employee' => 'nullable|numeric|min:0',
            'items.*.epf_employer' => 'nullable|numeric|min:0',
            'items.*.net_pay' => 'required|numeric|min:0',
            'items.*.payment_method' => 'nullable|string',
            'items.*.bank_account_number' => 'nullable|string',
            'items.*.bank_name' => 'nullable|string',
            'items.*.remarks' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated) {
            $totalBase = collect($validated['items'])->sum('base_salary');
            $totalAdvances = collect($validated['items'])->sum('advances_deducted');
            $totalBonuses = collect($validated['items'])->sum(fn($i) => ($i['sunday_bonus'] ?? 0) + ($i['allowances'] ?? 0));
            $totalEpf = collect($validated['items'])->sum('epf_employee');
            $totalNet = collect($validated['items'])->sum('net_pay');

            $payrollRun = PayrollRun::create([
                'branch_id' => $validated['branch_id'] ?? null,
                'month' => $validated['month'],
                'period_type' => $validated['period_type'],
                'total_base_pay' => $totalBase,
                'total_advances' => $totalAdvances,
                'total_bonuses' => $totalBonuses,
                'total_epf' => $totalEpf,
                'total_net_pay' => $totalNet,
                'status' => $validated['status'],
                'payment_date' => $validated['payment_date'] ?? now()->toDateString(),
                'processed_by' => auth()->id(),
            ]);

            foreach ($validated['items'] as $item) {
                PayrollItem::create([
                    'payroll_run_id' => $payrollRun->id,
                    'user_id' => $item['user_id'],
                    'base_salary' => $item['base_salary'],
                    'working_days' => $item['working_days'] ?? 0,
                    'sunday_days' => $item['sunday_days'] ?? 0,
                    'sunday_bonus' => $item['sunday_bonus'] ?? 0,
                    'allowances' => $item['allowances'] ?? 0,
                    'advances_deducted' => $item['advances_deducted'] ?? 0,
                    'first_half_paid' => $item['first_half_paid'] ?? 0,
                    'epf_employee' => $item['epf_employee'] ?? 0,
                    'epf_employer' => $item['epf_employer'] ?? 0,
                    'net_pay' => $item['net_pay'],
                    'status' => $validated['status'] === 'completed' ? 'paid' : 'unpaid',
                    'payment_method' => $item['payment_method'] ?? 'bank_transfer',
                    'bank_account_number' => $item['bank_account_number'] ?? null,
                    'bank_name' => $item['bank_name'] ?? null,
                    'remarks' => $item['remarks'] ?? null,
                ]);

                // If completed, lock advances as deducted
                if ($validated['status'] === 'completed' && ($item['advances_deducted'] ?? 0) > 0) {
                    EmployeeAdvance::where('user_id', $item['user_id'])
                        ->where('status', 'active')
                        ->update([
                            'status' => 'deducted',
                            'deducted_in_payroll_run_id' => $payrollRun->id
                        ]);
                }
            }

            return response()->json([
                'message' => 'Payroll run saved successfully',
                'payroll_run' => $payrollRun->load('items.user:id,name,employee_id')
            ], 201);
        });
    }

    /**
     * Update status (e.g. mark as completed / settled).
     */
    public function updateStatus(Request $request, PayrollRun $payrollRun)
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,confirmed,completed',
            'payment_date' => 'nullable|date',
        ]);

        $payrollRun->update($validated);

        if ($validated['status'] === 'completed') {
            $payrollRun->items()->update(['status' => 'paid']);

            foreach ($payrollRun->items as $item) {
                if ($item->advances_deducted > 0) {
                    EmployeeAdvance::where('user_id', $item->user_id)
                        ->where('status', 'active')
                        ->update([
                            'status' => 'deducted',
                            'deducted_in_payroll_run_id' => $payrollRun->id
                        ]);
                }
            }
        }

        return response()->json([
            'message' => 'Payroll status updated successfully',
            'payroll_run' => $payrollRun->fresh()->load('items.user:id,name,employee_id')
        ]);
    }

    /**
     * Generate EFT file export for bank batch transfer.
     */
    public function exportEFT(PayrollRun $payrollRun)
    {
        $payrollRun->load(['items.user:id,name,employee_id,bank_name,bank_account_number,bank_branch_code', 'branch:id,name']);

        $lines = [];
        // Header
        $lines[] = "EFT BATCH SALARY TRANSFER";
        $lines[] = "Company: " . ($payrollRun->branch?->name ?? 'Workshop Management');
        $lines[] = "Month: " . $payrollRun->month . " (" . strtoupper($payrollRun->period_type) . ")";
        $lines[] = "Date: " . ($payrollRun->payment_date ? $payrollRun->payment_date->format('Y-m-d') : now()->format('Y-m-d'));
        $lines[] = "Total Net Pay: LKR " . number_format($payrollRun->total_net_pay, 2);
        $lines[] = "--------------------------------------------------------------------------------";
        $lines[] = "Acc No\tBeneficiary Name\tBank\tBranch\tAmount (LKR)\tRef / Remarks";
        $lines[] = "--------------------------------------------------------------------------------";

        foreach ($payrollRun->items as $item) {
            $u = $item->user;
            $acc = $item->bank_account_number ?: ($u->bank_account_number ?: 'CASH_PAYMENT');
            $name = $u->name;
            $bank = $item->bank_name ?: ($u->bank_name ?: 'N/A');
            $branch = $u->bank_branch_code ?: '001';
            $amt = number_format($item->net_pay, 2, '.', '');
            $ref = "SAL-" . $payrollRun->month . "-" . ($u->employee_id ?: $u->id);

            $lines[] = "{$acc}\t{$name}\t{$bank}\t{$branch}\t{$amt}\t{$ref}";
        }

        $content = implode("\r\n", $lines);
        $filename = "EFT-Payroll-{$payrollRun->month}-{$payrollRun->period_type}.txt";

        return response($content, 200, [
            'Content-Type' => 'text/plain',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    /**
     * Summary cards & analytics for the payroll dashboard.
     */
    public function summaryDashboard(Request $request)
    {
        $month = $request->get('month', Carbon::now()->format('Y-m'));
        $branchId = $request->get('branch_id');

        $monthDate = Carbon::parse($month . '-01');
        $startOfMonth = $monthDate->copy()->startOfMonth();
        $endOfMonth = $monthDate->copy()->endOfMonth();

        // Runs in month
        $runsQuery = PayrollRun::where('month', $month);
        if ($branchId) {
            $runsQuery->where('branch_id', $branchId);
        }
        $runs = $runsQuery->get();

        // All active staff
        $staffQuery = User::where('is_active', true);
        if ($branchId) {
            $staffQuery->where('branch_id', $branchId);
        }
        $staffCount = $staffQuery->count();
        $totalBaseSalaryPool = $staffQuery->sum('base_salary');

        // Advances issued in this month
        $advancesQuery = EmployeeAdvance::whereBetween('date', [$startOfMonth, $endOfMonth]);
        if ($branchId) {
            $advancesQuery->where('branch_id', $branchId);
        }
        $totalAdvancesIssued = (float)$advancesQuery->where('type', 'advance')->sum('amount');
        $totalBonusesIssued = (float)$advancesQuery->whereIn('type', ['festival_bonus', 'allowance', 'other'])->sum('amount');

        // Total paid in completed runs
        $totalPaid = (float)$runs->where('status', 'completed')->sum('total_net_pay');
        $totalAccruedNet = (float)$runs->sum('total_net_pay');
        $outstandingBalance = max(0, $totalAccruedNet - $totalPaid);

        // Historical months summary (past 6 months)
        $history = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = Carbon::now()->subMonths($i)->format('Y-m');
            $mRuns = PayrollRun::where('month', $m)->get();
            $history[] = [
                'month' => $m,
                'label' => Carbon::parse($m . '-01')->format('M Y'),
                'total_net_pay' => (float)$mRuns->sum('total_net_pay'),
                'total_paid' => (float)$mRuns->where('status', 'completed')->sum('total_net_pay'),
                'status' => $mRuns->where('status', 'completed')->count() > 0 ? 'Settled' : ($mRuns->count() > 0 ? 'Pending' : 'Unprocessed'),
            ];
        }

        return response()->json([
            'month' => $month,
            'summary' => [
                'total_staff' => $staffCount,
                'total_base_pool' => (float)$totalBaseSalaryPool,
                'total_advances_issued' => $totalAdvancesIssued,
                'total_bonuses_issued' => $totalBonusesIssued,
                'total_paid' => $totalPaid,
                'outstanding_balance' => $outstandingBalance,
                'total_runs_count' => $runs->count(),
            ],
            'recent_runs' => $runs->load('branch:id,name'),
            'history' => $history,
        ]);
    }
}
