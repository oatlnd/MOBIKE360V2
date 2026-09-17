<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\JobCard;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Invoice;
use App\Models\Branch;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();

        // Branch filter: Check query param first, or non-admin user branch.
        $branchId = $request->get('branch_id');
        if (!$branchId && $user && !$user->hasRole('admin') && $user->branch_id) {
            $branchId = $user->branch_id;
        }

        // Timezone calculation to align client local "today" with UTC database timestamps
        $userTz = $request->get('timezone') ?: config('app.timezone', 'UTC');
        try {
            $now = Carbon::now($userTz);
        } catch (\Exception $e) {
            $now = Carbon::now('UTC');
            $userTz = 'UTC';
        }
        $todayStart = $now->copy()->startOfDay()->setTimezone('UTC');
        $todayEnd = $now->copy()->endOfDay()->setTimezone('UTC');

        // Job Cards stats for tiles
        $receivedToday = JobCard::when($branchId, function($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        })->whereBetween('created_at', [$todayStart, $todayEnd])->count();

        $inProgressAll = JobCard::when($branchId, function($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        })->where('status', 'in_progress')->count();

        $partsAwaitedAll = JobCard::when($branchId, function($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        })->where('status', 'parts_awaited')->count();

        $notReadyAll = JobCard::when($branchId, function($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        })->where(function($q2) {
            $q2->whereNull('delivery_status')->orWhere('delivery_status', 'not_ready');
        })->count();

        $readyForPickupAll = JobCard::when($branchId, function($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        })->where('delivery_status', 'ready_for_pickup')->count();

        $deliveredToday = JobCard::when($branchId, function($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        })->where('delivery_status', 'delivered')
          ->where(function($dq) use ($todayStart, $todayEnd) {
              $dq->whereBetween('delivered_at', [$todayStart, $todayEnd])
                ->orWhere(function($sub) use ($todayStart, $todayEnd) {
                    $sub->whereNull('delivered_at')
                        ->whereBetween('updated_at', [$todayStart, $todayEnd]);
                });
          })
          ->count();

        // Dynamic Branch summary tiles from actual database branches
        $activeBranches = Branch::where('is_active', true)->get();
        if ($activeBranches->isEmpty()) {
            $activeBranches = Branch::all();
        }
        
        $branchActivity = $activeBranches->map(function($branch) use ($todayStart, $todayEnd) {
            $count = JobCard::where('branch_id', $branch->id)
                ->whereBetween('created_at', [$todayStart, $todayEnd])
                ->count();
            return [
                'id' => $branch->id,
                'name' => $branch->name,
                'count' => $count
            ];
        });

        // Weekly Job card trends (jobs created per day for last 7 days in user's timezone)
        $weeklyJobTrends = [];
        for ($i = 6; $i >= 0; $i--) {
            $dayLocal = $now->copy()->subDays($i);
            $dayStart = $dayLocal->copy()->startOfDay()->setTimezone('UTC');
            $dayEnd = $dayLocal->copy()->endOfDay()->setTimezone('UTC');

            $count = JobCard::when($branchId, function($q) use ($branchId) {
                $q->where('branch_id', $branchId);
            })->whereBetween('created_at', [$dayStart, $dayEnd])->count();

            $weeklyJobTrends[] = [
                'name' => $dayLocal->format('D'),
                'date' => $dayLocal->format('Y-m-d'),
                'jobs' => $count
            ];
        }

        // Recent activity: order by date descending (including mechanic & branch relations)
        $recentJobCards = JobCard::when($branchId, function($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        })->with(['mechanic', 'branch'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Top mechanics
        $topMechanics = JobCard::when($branchId, function($q) use ($branchId) {
            $q->where('branch_id', $branchId);
        })->whereNotNull('mechanic_id')
            ->select('mechanic_id', DB::raw('count(*) as jobs_count'))
            ->groupBy('mechanic_id')
            ->with('mechanic')
            ->orderBy('jobs_count', 'desc')
            ->limit(5)
            ->get();

        // Legacy branch counts for backwards compatibility
        $serviceBranchToday = $branchActivity->get(0)['count'] ?? $receivedToday;
        $mechanicBranchToday = $branchActivity->get(1)['count'] ?? 0;
        $partsBranchToday = $branchActivity->get(2)['count'] ?? 0;

        return response()->json([
            'received_today' => $receivedToday,
            'in_progress_all' => $inProgressAll,
            'parts_awaited_all' => $partsAwaitedAll,
            'not_ready_all' => $notReadyAll,
            'ready_for_pickup_all' => $readyForPickupAll,
            'delivered_today' => $deliveredToday,
            'service_branch_today' => $serviceBranchToday,
            'mechanic_branch_today' => $mechanicBranchToday,
            'parts_branch_today' => $partsBranchToday,
            'branch_activity' => $branchActivity,
            'weekly_job_trends' => $weeklyJobTrends,
            'recent_job_cards' => $recentJobCards,
            'top_mechanics' => $topMechanics,
        ]);
    }

    public function jobCardReport(Request $request)
    {
        $validated = $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'status' => 'nullable|string',
            'branch_id' => 'nullable|exists:branches,id'
        ]);

        $query = JobCard::with(['branch', 'preparedBy', 'mechanic', 'invoice'])
            ->whereBetween('created_at', [
                Carbon::parse($validated['date_from'])->startOfDay(),
                Carbon::parse($validated['date_to'])->endOfDay()
            ]);

        if (!empty($validated['status'])) {
            $st = $validated['status'];
            if (in_array($st, ['not_ready', 'ready_for_pickup', 'delivered'])) {
                $query->where('delivery_status', $st);
            } else {
                $query->where('status', $st);
            }
        }

        if (isset($validated['branch_id'])) {
            $query->where('branch_id', $validated['branch_id']);
        }

        $jobCards = $query->orderBy('created_at', 'desc')->get();

        $completedJobs = $jobCards->filter(function($jc) {
            return in_array($jc->status, ['completed', 'invoiced']) || $jc->delivery_status === 'delivered' || !empty($jc->completed_at);
        });

        $avgCompletionHours = null;
        if ($completedJobs->isNotEmpty()) {
            $avgMinutes = $completedJobs->avg(function($jc) {
                $end = $jc->completed_at ?: ($jc->delivered_at ?: $jc->updated_at);
                return $jc->created_at->diffInMinutes($end);
            });
            $avgCompletionHours = $avgMinutes !== null ? round($avgMinutes / 60, 1) : null;
        }

        $summary = [
            'total_jobs' => $jobCards->count(),
            'total_revenue' => (float)$jobCards->sum('final_amount'),
            'total_collected' => (float)$jobCards->sum(function($jc) {
                return $jc->invoice ? $jc->invoice->paid_amount : 0;
            }),
            'pending_invoices' => $jobCards->whereIn('status', ['completed', 'qc'])->whereNull('invoiced_at')->count(),
            'average_completion_time' => $avgCompletionHours
        ];

        return response()->json([
            'data' => $jobCards,
            'summary' => $summary
        ]);
    }

    public function inventoryReport(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'nullable|exists:branches,id',
            'category_id' => 'nullable|exists:categories,id',
            'include_zero_stock' => 'nullable|boolean'
        ]);

        $query = InventoryItem::with(['category', 'subCategory', 'branch']);

        if (isset($validated['branch_id'])) {
            $query->where('branch_id', $validated['branch_id']);
        }

        if (isset($validated['category_id'])) {
            $query->where('category_id', $validated['category_id']);
        }

        if (empty($validated['include_zero_stock'])) {
            $query->where('current_stock', '>', 0);
        }

        $items = $query->orderBy('name', 'asc')->get();

        $summary = [
            'total_items' => $items->count(),
            'total_stock_value' => $items->sum(function($item) {
                return $item->current_stock * $item->purchase_price;
            }),
            'total_selling_value' => $items->sum(function($item) {
                return $item->current_stock * $item->selling_price;
            }),
            'low_stock_items' => $items->filter(function($item) {
                return $item->current_stock <= $item->reorder_level;
            })->count()
        ];

        return response()->json([
            'data' => $items,
            'summary' => $summary
        ]);
    }

    public function stockMovementReport(Request $request)
    {
        $query = InventoryTransaction::with([
            'inventoryItem.category',
            'inventoryItem.subCategory',
            'branch',
            'creator'
        ]);

        if ($request->filled('date_from')) {
            $query->where('created_at', '>=', Carbon::parse($request->date_from)->startOfDay());
        }

        if ($request->filled('date_to')) {
            $query->where('created_at', '<=', Carbon::parse($request->date_to)->endOfDay());
        }

        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->filled('inventory_item_id')) {
            $query->where('inventory_item_id', $request->inventory_item_id);
        }

        if ($request->filled('item_code')) {
            $code = $request->item_code;
            $query->whereHas('inventoryItem', function($iq) use ($code) {
                $iq->where('item_code', $code);
            });
        }

        if ($request->filled('category_id')) {
            $query->whereHas('inventoryItem', function($q) use ($request) {
                $q->where('category_id', $request->category_id);
            });
        }

        if ($request->filled('transaction_type')) {
            $type = strtolower($request->transaction_type);
            if ($type === 'job_card' || $type === 'jobcard') {
                $query->where(function($q) {
                    $q->where('transaction_type', 'job_card')
                      ->orWhere('reference_type', 'job_card')
                      ->orWhere('reference_type', 'jobcard');
                });
            } elseif ($type === 'sale') {
                $query->where('transaction_type', 'sale')
                      ->where(function($q) {
                          $q->whereNull('reference_type')
                            ->orWhereNotIn('reference_type', ['job_card', 'jobcard']);
                      });
            } else {
                $query->where('transaction_type', $request->transaction_type);
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('notes', 'LIKE', "%{$search}%")
                  ->orWhereHas('inventoryItem', function($iq) use ($search) {
                      $iq->where('name', 'LIKE', "%{$search}%")
                         ->orWhere('item_code', 'LIKE', "%{$search}%")
                         ->orWhere('barcode', 'LIKE', "%{$search}%");
                  });
            });
        }

        $transactions = $query->orderBy('created_at', 'desc')->get();

        // Resolve JobCard references if any
        $jobCardIds = $transactions->filter(function($t) {
            return in_array(strtolower($t->reference_type ?? ''), ['job_card', 'jobcard']);
        })->pluck('reference_id')->filter()->unique();

        $jobCardsMap = !empty($jobCardIds) ? JobCard::whereIn('id', $jobCardIds)->get()->keyBy('id') : collect();

        $transactions->transform(function($tx) use ($jobCardsMap) {
            if (in_array(strtolower($tx->reference_type ?? ''), ['job_card', 'jobcard']) && isset($jobCardsMap[$tx->reference_id])) {
                $jc = $jobCardsMap[$tx->reference_id];
                $tx->job_card = [
                    'id' => $jc->id,
                    'job_card_number' => $jc->job_number ?: ($jc->job_card_number ?: $jc->id),
                    'bike_number' => $jc->bike_number,
                    'customer_name' => $jc->customer_name,
                ];
            }
            if (in_array(strtolower($tx->reference_type ?? ''), ['job_card', 'jobcard'])) {
                $tx->display_type = 'job_card';
            }
            return $tx;
        });

        // Categorize movements
        $inwardTx = $transactions->filter(function($t) {
            $type = strtolower($t->transaction_type);
            return in_array($type, ['grn', 'purchase', 'initial', 'add']) || 
                   (!in_array($type, ['sale', 'job_card', 'subtract']) && !str_contains(strtolower($t->notes ?? ''), 'deduct'));
        });

        $outwardTx = $transactions->filter(function($t) {
            $type = strtolower($t->transaction_type);
            return in_array($type, ['sale', 'job_card', 'subtract']) || 
                   str_contains(strtolower($t->notes ?? ''), 'deduct') ||
                   str_contains(strtolower($t->notes ?? ''), 'subtract');
        });

        $inwardQty = $inwardTx->sum('quantity');
        $outwardQty = $outwardTx->sum('quantity');
        $inwardValue = $inwardTx->sum('total_price');
        $outwardValue = $outwardTx->sum('total_price');

        return response()->json([
            'data' => $transactions,
            'summary' => [
                'total_transactions' => $transactions->count(),
                'inward_quantity' => $inwardQty,
                'outward_quantity' => $outwardQty,
                'inward_value' => $inwardValue,
                'outward_value' => $outwardValue,
                'net_value' => $inwardValue - $outwardValue,
            ]
        ]);
    }

    public function financialReport(Request $request)
    {
        $validated = $request->validate([
            'date_from' => 'required|date',
            'date_to' => 'required|date|after_or_equal:date_from',
            'branch_id' => 'nullable|exists:branches,id'
        ]);

        $startDate = Carbon::parse($validated['date_from'])->startOfDay();
        $endDate = Carbon::parse($validated['date_to'])->endOfDay();

        // Revenue from invoices
        $revenueQuery = Invoice::whereBetween('created_at', [$startDate, $endDate]);
        if (isset($validated['branch_id'])) {
            $revenueQuery->where('branch_id', $validated['branch_id']);
        }
        $invoices = $revenueQuery->get();

        $totalRevenue = $invoices->sum('paid_amount');
        $totalInvoices = $invoices->count();
        $paidInvoices = $invoices->where('payment_status', 'paid')->count();

        // Expenses from purchase orders (received)
        $expenseQuery = \App\Models\PurchaseOrder::where('status', 'received')
            ->whereBetween('received_at', [$startDate, $endDate]);
        if (isset($validated['branch_id'])) {
            $expenseQuery->where('branch_id', $validated['branch_id']);
        }
        $totalExpense = $expenseQuery->sum('total_amount');

        // Profit = Revenue - Expense
        $profit = $totalRevenue - $totalExpense;

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_expense' => $totalExpense,
            'profit' => $profit,
            'total_invoices' => $totalInvoices,
            'paid_invoices' => $paidInvoices,
            'pending_invoices' => $totalInvoices - $paidInvoices,
            'invoices_data' => $invoices->map(function($inv) {
                return [
                    'date' => $inv->created_at->format('Y-m-d'),
                    'invoice_number' => $inv->invoice_number,
                    'amount' => $inv->amount,
                    'paid' => $inv->paid_amount,
                    'status' => $inv->payment_status
                ];
            })
        ]);
    }
}
