<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:view_payroll|manage_attendance');
    }

    /**
     * List attendance records for a date range or month.
     */
    public function index(Request $request)
    {
        $query = Attendance::with(['user:id,name,employee_id,branch_id', 'branch:id,name']);

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('date')) {
            $query->whereDate('date', $request->date);
        } elseif ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        } elseif ($request->has('month')) {
            // format: YYYY-MM
            $start = Carbon::parse($request->month . '-01')->startOfMonth();
            $end = Carbon::parse($request->month . '-01')->endOfMonth();
            $query->whereBetween('date', [$start, $end]);
        } else {
            // Default to current week
            $start = Carbon::now()->startOfWeek(Carbon::MONDAY);
            $end = Carbon::now()->endOfWeek(Carbon::SUNDAY);
            $query->whereBetween('date', [$start, $end]);
        }

        $records = $query->orderBy('date', 'desc')->get();

        return response()->json($records);
    }

    /**
     * Bulk save or update daily attendance for multiple employees.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'records' => 'required|array',
            'records.*.user_id' => 'required|exists:users,id',
            'records.*.status' => 'required|in:present,absent,half_day,leave',
            'records.*.is_sunday' => 'nullable|boolean',
            'records.*.sunday_bonus_rate' => 'nullable|numeric|min:0',
            'records.*.notes' => 'nullable|string',
        ]);

        $date = Carbon::parse($validated['date']);
        $isSunday = $date->isSunday();

        $saved = [];
        foreach ($validated['records'] as $item) {
            $user = User::find($item['user_id']);
            $record = Attendance::updateOrCreate(
                [
                    'user_id' => $item['user_id'],
                    'date' => $date->toDateString(),
                ],
                [
                    'branch_id' => $user->branch_id ?? null,
                    'status' => $item['status'],
                    'is_sunday' => $item['is_sunday'] ?? $isSunday,
                    'sunday_bonus_rate' => $item['sunday_bonus_rate'] ?? 0,
                    'notes' => $item['notes'] ?? null,
                ]
            );
            $saved[] = $record;
        }

        return response()->json([
            'message' => 'Attendance logged successfully',
            'count' => count($saved),
            'records' => $saved
        ]);
    }

    /**
     * Monthly stats for all staff (working days, absences, Sunday bonuses).
     */
    public function monthlyStats(Request $request)
    {
        $month = $request->get('month', Carbon::now()->format('Y-m'));
        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end = Carbon::parse($month . '-01')->endOfMonth();

        $usersQuery = User::where('is_active', true);
        if ($request->has('branch_id') && $request->branch_id) {
            $usersQuery->where('branch_id', $request->branch_id);
        }
        $users = $usersQuery->get(['id', 'name', 'employee_id', 'salary_type', 'base_salary', 'daily_rate', 'branch_id']);

        $attendances = Attendance::whereBetween('date', [$start, $end])->get();

        $stats = $users->map(function ($u) use ($attendances) {
            $userAtt = $attendances->where('user_id', $u->id);

            $presentDays = $userAtt->where('status', 'present')->count();
            $halfDays = $userAtt->where('status', 'half_day')->count();
            $absentDays = $userAtt->where('status', 'absent')->count();
            $leaveDays = $userAtt->where('status', 'leave')->count();

            $totalWorkingDays = $presentDays + ($halfDays * 0.5);

            $sundayShifts = $userAtt->where('is_sunday', true)->whereIn('status', ['present', 'half_day'])->count();
            $totalSundayBonus = $userAtt->where('is_sunday', true)->sum('sunday_bonus_rate');

            return [
                'user_id' => $u->id,
                'name' => $u->name,
                'employee_id' => $u->employee_id,
                'salary_type' => $u->salary_type,
                'base_salary' => $u->base_salary,
                'daily_rate' => $u->daily_rate,
                'present_days' => $presentDays,
                'half_days' => $halfDays,
                'absent_days' => $absentDays,
                'leave_days' => $leaveDays,
                'total_working_days' => $totalWorkingDays,
                'sunday_shifts' => $sundayShifts,
                'total_sunday_bonus' => (float)$totalSundayBonus,
            ];
        });

        return response()->json($stats);
    }
}
