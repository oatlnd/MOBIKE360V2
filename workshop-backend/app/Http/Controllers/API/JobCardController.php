<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\JobCard;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Invoice;
use App\Models\SmsLog;
use App\Models\Branch;
use App\Models\JobCardAudit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class JobCardController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:view job cards|view_live_board')->only(['index', 'show', 'print', 'liveBoard']);
        $this->middleware('permission:create job cards')->only(['store']);
        $this->middleware('permission:edit job cards')->only(['update']);
        $this->middleware('permission:delete job cards')->only(['destroy']);
        $this->middleware('permission:complete job cards')->only(['complete']);
        $this->middleware('permission:convert to invoice')->only(['convertToInvoice']);
    }

    /**
     * Real-time Workshop Live Status Board API
     */
    public function liveBoard(Request $request)
    {
        $query = JobCard::with(['branch', 'mechanic', 'preparedBy'])
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('created_at', 'desc');

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        // Return all active jobs that are not yet delivered, or ready for pickup
        $jobs = $query->where(function ($q) {
            $q->where(function($activeQ) {
                $activeQ->whereIn('status', ['received', 'diagnosis', 'pending', 'in_progress', 'parts_awaited', 'qc', 'completed'])
                        ->where(function($d) {
                            $d->whereNull('delivery_status')
                              ->orWhere('delivery_status', '!=', 'delivered');
                        });
            })->orWhere('delivery_status', 'ready_for_pickup');
        })->get();

        return response()->json([
            'jobs' => $jobs,
            'server_time' => Carbon::now()->toIso8601String(),
            'counts' => [
                'total_active' => $jobs->where('status', '!=', 'invoiced')->count(),
                'queue' => $jobs->whereIn('status', ['received', 'diagnosis', 'pending'])->count(),
                'in_progress' => $jobs->whereIn('status', ['in_progress', 'parts_awaited', 'qc'])->count(),
                'ready_for_pickup' => $jobs->where('delivery_status', 'ready_for_pickup')->count(),
                'completed' => $jobs->where('status', 'completed')->count(),
            ]
        ]);
    }

    public function index(Request $request)
    {
        $query = JobCard::with(['branch', 'preparedBy', 'mechanic', 'invoice']);

        // Filters
        if ($request->has('status') && $request->status) {
            if ($request->status === 'exclude_invoiced') {
                $query->where('status', '!=', 'invoiced');
            } else {
                $query->byStatus($request->status);
            }
        }

        if ($request->has('delivery_status') && $request->delivery_status) {
            $query->where('delivery_status', $request->delivery_status);
        }

        if ($request->has('date_from') && $request->has('date_to')) {
            $query->byDateRange($request->date_from, $request->date_to);
        }

        if ($request->has('search')) {
            $query->search($request->search);
        }

        if ($request->has('branch_id') && $request->branch_id) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('mechanic_id')) {
            $query->where('mechanic_id', $request->mechanic_id);
        }

        if ($request->has('bike_number')) {
            $query->where('bike_number', $request->bike_number);
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'bike_number' => 'required|string|max:20',
            'make' => 'required|string|max:100',
            'model' => 'required|string|max:100',
            'engine_no' => 'nullable|string|max:50',
            'chassis_no' => 'nullable|string|max:50',
            'mileage' => 'nullable|integer|min:0',
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:20',
            'customer_email' => 'nullable|email|max:255',
            'service_type' => 'required|array',
            'service_type.*.id' => 'required|string',
            'service_type.*.name' => 'required|string',
            'service_type.*.price' => 'required|numeric|min:0',
            'parts_used' => 'nullable|array',
            'parts_used.*.item_id' => 'required|exists:inventory_items,id',
            'parts_used.*.name' => 'required|string',
            'parts_used.*.quantity' => 'required|integer|min:1',
            'parts_used.*.price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'mechanic_id' => 'nullable|exists:users,id',
            'estimated_duration' => 'nullable|numeric|min:0',
            'purpose' => 'nullable|array',
            'purpose.*' => 'string',
            'images' => 'nullable|array',
            'images.*' => 'image|mimes:jpeg,png,jpg|max:2048',
            'customer_town' => 'nullable|string|max:255',
            'next_service_km' => 'nullable|integer|min:0',
            'next_service_date' => 'nullable|date'
        ]);

        $validated['job_number'] = JobCard::generateJobNumber($validated['branch_id']);
        $validated['prepared_by'] = auth()->id();
        $validated['status'] = 'received';
        $validated['delivery_status'] = 'not_ready';

        if (isset($validated['parts_used'])) {
            $validated['parts_used'] = collect($validated['parts_used'])->map(function($part) {
                $part['total'] = $part['price'] * $part['quantity'];
                return $part;
            })->toArray();
        }

        $servicesTotal = collect($validated['service_type'])->sum('price');
        $partsTotal = isset($validated['parts_used']) ? collect($validated['parts_used'])->sum('total') : 0;
        $total = $servicesTotal + $partsTotal;

        $validated['total_amount'] = $total;
        $validated['final_amount'] = $total;
        $validated['discount'] = 0;
        $validated['tax'] = 0;

        DB::transaction(function() use ($validated, &$jobCard) {
            $jobCard = JobCard::create($validated);
            
            // Handle images
            if (isset($validated['images']) && count($validated['images'])) {
                $imagePaths = [];
                foreach ($validated['images'] as $image) {
                    $path = $image->store('job-cards/' . $jobCard->id, 'public');
                    $imagePaths[] = $path;
                }
                $jobCard->update(['images' => $imagePaths]);
            }

            JobCardAudit::create([
                'job_card_id' => $jobCard->id,
                'user_id' => auth()->id(),
                'action' => 'created',
                'changes' => $jobCard->toArray()
            ]);

            // Sync inventory transactions for parts used
            $this->syncPartsTransactions($jobCard);
        });

        return response()->json($jobCard->load(['branch', 'preparedBy', 'mechanic']), 201);
    }

    public function show(JobCard $jobCard)
    {
        return response()->json($jobCard->load(['branch', 'preparedBy', 'mechanic', 'invoice', 'audits']));
    }

    public function update(Request $request, JobCard $jobCard)
    {
        // Prevent update of details if already invoiced or completed (unless admin OR only updating delivery_status / status)
        if (in_array($jobCard->status, ['completed', 'invoiced']) && !auth()->user()->hasRole('admin')) {
            $allowedKeys = ['delivery_status', 'status', '_method'];
            $updatingForbidden = collect($request->all())->keys()->filter(fn($k) => !in_array($k, $allowedKeys))->isNotEmpty();
            if ($updatingForbidden) {
                return response()->json(['error' => 'Cannot update completed or invoiced job card details'], 403);
            }
        }

        $validated = $request->validate([
            'bike_number' => 'sometimes|string|max:20',
            'make' => 'sometimes|string|max:100',
            'model' => 'sometimes|string|max:100',
            'engine_no' => 'nullable|string|max:50',
            'chassis_no' => 'nullable|string|max:50',
            'mileage' => 'nullable|integer|min:0',
            'customer_name' => 'sometimes|string|max:255',
            'customer_phone' => 'sometimes|string|max:20',
            'customer_email' => 'nullable|email|max:255',
            'service_type' => 'sometimes|array',
            'service_type.*.id' => 'required|string',
            'service_type.*.name' => 'required|string',
            'service_type.*.price' => 'required|numeric|min:0',
            'parts_used' => 'nullable|array',
            'parts_used.*.item_id' => 'nullable|exists:inventory_items,id',
            'parts_used.*.name' => 'required|string',
            'parts_used.*.quantity' => 'required|integer|min:1',
            'parts_used.*.price' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'mechanic_id' => 'nullable|exists:users,id',
            'estimated_duration' => 'nullable|numeric|min:0',
            'status' => ['sometimes', Rule::in(['received', 'diagnosis', 'in_progress', 'parts_awaited', 'qc', 'completed', 'invoiced', 'cancelled'])],
            'delivery_status' => 'sometimes|string|in:not_ready,ready_for_pickup,delivered',
            'purpose' => 'nullable|array',
            'purpose.*' => 'string',
            'images' => 'nullable|array',
            'images.*' => 'string',
            'customer_town' => 'nullable|string|max:255',
            'next_service_km' => 'nullable|integer|min:0',
            'next_service_date' => 'nullable|date'
        ]);

        // Format parts_used
        if (isset($validated['parts_used'])) {
            $validated['parts_used'] = collect($validated['parts_used'])->map(function($part) {
                $part['total'] = $part['price'] * $part['quantity'];
                return $part;
            })->toArray();
        }

        // Recalculate totals if service_type or parts_used updated
        if (isset($validated['service_type']) || isset($validated['parts_used'])) {
            $serviceType = $validated['service_type'] ?? $jobCard->service_type;
            $partsUsed = $validated['parts_used'] ?? $jobCard->parts_used;

            $servicesTotal = collect($serviceType)->sum('price');
            $partsTotal = collect($partsUsed)->sum('total');
            $total = $servicesTotal + $partsTotal;

            $validated['total_amount'] = $total;
            $validated['final_amount'] = $total - $jobCard->discount + $jobCard->tax;
        }

        // Handle new images
        if ($request->hasFile('images')) {
            $currentImages = $jobCard->images ?? [];
            foreach ($request->file('images') as $image) {
                $path = $image->store('job-cards/' . $jobCard->id, 'public');
                $currentImages[] = $path;
            }
            $validated['images'] = $currentImages;
        }

        // Handle delivery timestamp
        if (isset($validated['delivery_status'])) {
            if ($validated['delivery_status'] === 'delivered' && $jobCard->delivery_status !== 'delivered') {
                $validated['delivered_at'] = now();
            } elseif ($validated['delivery_status'] !== 'delivered') {
                $validated['delivered_at'] = null;
            }
        }

        $jobCard->update($validated);

        // Automatically sync inventory transactions for parts used
        $this->syncPartsTransactions($jobCard);
        
        JobCardAudit::create([
            'job_card_id' => $jobCard->id,
            'user_id' => auth()->id(),
            'action' => 'updated',
            'changes' => $jobCard->getChanges()
        ]);

        return response()->json($jobCard->load(['branch', 'preparedBy', 'mechanic']));
    }

    /**
     * Synchronize inventory transaction records for parts used in a Job Card
     */
    public function syncPartsTransactions(JobCard $jobCard)
    {
        $parts = $jobCard->parts_used;
        if (!is_array($parts) || count($parts) === 0) {
            return;
        }

        foreach ($parts as $part) {
            $itemId = $part['item_id'] ?? null;
            $invItem = null;

            if ($itemId) {
                $invItem = InventoryItem::find($itemId);
            }
            
            if (!$invItem && !empty($part['name'])) {
                $invItem = InventoryItem::where('name', $part['name'])
                    ->orWhere('item_code', $part['name'])
                    ->first();
                $itemId = $invItem?->id;
            }

            if (!$itemId || !$invItem) continue;

            $qty = (int)($part['quantity'] ?? 1);
            $price = (float)($part['price'] ?? $invItem->selling_price);
            $total = (float)($part['total'] ?? ($price * $qty));

            $existingTx = InventoryTransaction::where('reference_type', 'job_card')
                ->where('reference_id', $jobCard->id)
                ->where('inventory_item_id', $itemId)
                ->first();

            if ($existingTx) {
                $existingTx->update([
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total_price' => $total,
                    'notes' => "Used in Job Card #{$jobCard->job_number} (Bike: {$jobCard->bike_number} - {$jobCard->customer_name})"
                ]);
            } else {
                InventoryTransaction::create([
                    'inventory_item_id' => $itemId,
                    'branch_id' => $jobCard->branch_id ?: $invItem->branch_id,
                    'transaction_type' => 'job_card',
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total_price' => $total,
                    'reference_type' => 'job_card',
                    'reference_id' => $jobCard->id,
                    'created_by' => $jobCard->prepared_by ?: (auth()->id() ?? 1),
                    'created_at' => $jobCard->created_at ?: now(),
                    'updated_at' => $jobCard->updated_at ?: now(),
                    'notes' => "Used in Job Card #{$jobCard->job_number} (Bike: {$jobCard->bike_number} - {$jobCard->customer_name})"
                ]);
            }
        }
    }

    public function destroy(JobCard $jobCard)
    {
        if (in_array($jobCard->status, ['completed', 'invoiced'])) {
            return response()->json(['error' => 'Cannot delete completed or invoiced job card'], 403);
        }

        // Delete images if any
        if ($jobCard->images) {
            foreach ($jobCard->images as $image) {
                Storage::disk('public')->delete($image);
            }
        }

        $jobCard->delete();
        return response()->json(['message' => 'Job card deleted successfully']);
    }

    public function complete(Request $request, JobCard $jobCard)
    {
        // Only allow if status is pending or in_progress
        if (in_array($jobCard->status, ['completed', 'invoiced', 'cancelled'])) {
            return response()->json(['error' => 'Job card is already ' . $jobCard->status], 400);
        }

        $validated = $request->validate([
            'quality_check_signature' => 'required|string',
            'parts_used' => 'nullable|array',
            'parts_used.*.item_id' => 'required|exists:inventory_items,id',
            'parts_used.*.quantity' => 'required|integer|min:1',
            'next_service_km' => 'nullable|integer|min:0',
            'next_service_date' => 'nullable|date',
        ]);

        DB::transaction(function() use ($jobCard, $validated) {
            // Process parts used and deduct inventory
            $partsUsed = [];
            $totalPartsCost = 0;

            if (isset($validated['parts_used'])) {
                foreach ($validated['parts_used'] as $part) {
                    $inventoryItem = InventoryItem::find($part['item_id']);
                    
                    // Check stock
                    if ($inventoryItem->current_stock < $part['quantity']) {
                        throw new \Exception("Insufficient stock for item: {$inventoryItem->name}");
                    }

                    // Deduct stock
                    $inventoryItem->decrementStock(
                        $part['quantity'],
                        'job_card',
                        $jobCard->id,
                        auth()->id()
                    );

                    // Add to parts_used
                    $partsUsed[] = [
                        'item_id' => $part['item_id'],
                        'name' => $inventoryItem->name,
                        'quantity' => $part['quantity'],
                        'price' => $inventoryItem->selling_price,
                        'total' => $inventoryItem->selling_price * $part['quantity']
                    ];

                    $totalPartsCost += $inventoryItem->selling_price * $part['quantity'];
                }
            }

            // Update totals
            $servicesTotal = collect($jobCard->service_type)->sum('price');
            $newTotal = $servicesTotal + $totalPartsCost;
            $jobCard->total_amount = $newTotal;
            $jobCard->final_amount = $newTotal - $jobCard->discount + $jobCard->tax;
            $jobCard->parts_used = $partsUsed;

            // Mark as completed
            $jobCard->quality_check_signature = $validated['quality_check_signature'];
            $jobCard->status = 'completed';
            $jobCard->delivery_status = 'not_ready';
            $jobCard->completed_at = now();
            if (isset($validated['next_service_km'])) {
                $jobCard->next_service_km = $validated['next_service_km'];
            }
            if (isset($validated['next_service_date'])) {
                $jobCard->next_service_date = $validated['next_service_date'];
            }
            $jobCard->save();

            JobCardAudit::create([
                'job_card_id' => $jobCard->id,
                'user_id' => auth()->id(),
                'action' => 'completed',
                'changes' => ['parts_used' => $partsUsed, 'status' => 'completed']
            ]);
        });

        // Trigger SMS notification (if configured in settings or env)
        $settings = \App\Models\SystemSetting::all()->pluck('value', 'key');
        $smsEnabled = filter_var($settings['sms_enabled'] ?? config('sms.enabled', false), FILTER_VALIDATE_BOOLEAN);
        if ($smsEnabled || !empty($settings['sms_api_key'])) {
            $this->sendCompletionSMS($jobCard);
        }

        return response()->json($jobCard->load(['branch', 'preparedBy', 'mechanic', 'audits']));
    }

    public function convertToInvoice(Request $request, JobCard $jobCard)
    {
        // Ensure job card is completed and not already invoiced
        if ($jobCard->status !== 'completed') {
            return response()->json(['error' => 'Job card must be completed before invoicing'], 400);
        }
        if ($jobCard->invoice) {
            return response()->json(['error' => 'Invoice already exists for this job card'], 400);
        }

        $validated = $request->validate([
            'payment_type' => 'required|in:cash,credit_card,bank_transfer,cheque',
            'paid_amount' => 'required|numeric|min:0',
            'cash_given' => 'nullable|numeric|required_if:payment_type,cash|min:0',
            'card_number' => 'nullable|string|required_if:payment_type,credit_card',
            'card_holder_name' => 'nullable|string|required_if:payment_type,credit_card',
            'bank_name' => 'nullable|string|required_if:payment_type,bank_transfer',
            'cheque_number' => 'nullable|string|required_if:payment_type,cheque',
            'cheque_date' => 'nullable|date|required_if:payment_type,cheque',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $amount = $jobCard->final_amount;
        $paidAmount = $validated['paid_amount'];
        $balance = max(0, $amount - $paidAmount);

        // If discount or tax are provided, adjust
        if (isset($validated['discount']) || isset($validated['tax'])) {
            $discount = $validated['discount'] ?? 0;
            $tax = $validated['tax'] ?? 0;
            $amount = $jobCard->total_amount - $discount + $tax;
            $balance = max(0, $amount - $paidAmount);
        } else {
            $discount = $jobCard->discount;
            $tax = $jobCard->tax;
        }

        $paymentStatus = $balance == 0 ? 'paid' : ($paidAmount > 0 ? 'partial' : 'pending');

        DB::transaction(function() use ($jobCard, $validated, $amount, $paidAmount, $balance, $discount, $tax, $paymentStatus) {
            $invoiceData = [
                'branch_id' => $jobCard->branch_id,
                'job_card_id' => $jobCard->id,
                'invoice_number' => Invoice::generateInvoiceNumber($jobCard->branch_id),
                'payment_type' => $validated['payment_type'],
                'payment_status' => $paymentStatus,
                'amount' => $amount,
                'paid_amount' => $paidAmount,
                'balance' => $balance,
                'discount' => $discount,
                'tax' => $tax,
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id()
            ];

            // Payment type specific fields
            if ($validated['payment_type'] === 'cash') {
                $invoiceData['cash_given'] = $validated['cash_given'];
                $invoiceData['cash_returned'] = $validated['cash_given'] - $paidAmount;
            } elseif ($validated['payment_type'] === 'credit_card') {
                $invoiceData['card_number'] = $validated['card_number'];
                $invoiceData['card_holder_name'] = $validated['card_holder_name'];
            } elseif ($validated['payment_type'] === 'bank_transfer') {
                $invoiceData['bank_name'] = $validated['bank_name'];
            } elseif ($validated['payment_type'] === 'cheque') {
                $invoiceData['cheque_number'] = $validated['cheque_number'];
                $invoiceData['cheque_date'] = $validated['cheque_date'];
            }

            $invoice = Invoice::create($invoiceData);
            
            // Mark job card as invoiced
            $jobCard->status = 'invoiced';
            $jobCard->invoiced_at = now();
            $jobCard->save();

            JobCardAudit::create([
                'job_card_id' => $jobCard->id,
                'user_id' => auth()->id(),
                'action' => 'invoiced',
                'changes' => ['invoice_id' => $invoice->id, 'status' => 'invoiced']
            ]);
        });

        return response()->json(['message' => 'Invoice created successfully']);
    }

    public function uploadImages(Request $request, JobCard $jobCard)
    {
        $request->validate([
            'images' => 'required|array',
            'images.*' => 'image|mimes:jpeg,png,jpg|max:2048'
        ]);

        $currentImages = $jobCard->images ?? [];
        foreach ($request->file('images') as $image) {
            $path = $image->store('job-cards/' . $jobCard->id, 'public');
            $currentImages[] = $path;
        }
        $jobCard->update(['images' => $currentImages]);

        return response()->json(['message' => 'Images uploaded successfully', 'images' => $currentImages]);
    }

    public function removeImage(Request $request, JobCard $jobCard)
    {
        $request->validate([
            'image_path' => 'required|string'
        ]);

        $imagePath = $request->image_path;
        $currentImages = $jobCard->images ?? [];
        
        if (in_array($imagePath, $currentImages)) {
            // Remove from array
            $currentImages = array_filter($currentImages, fn($img) => $img !== $imagePath);
            $jobCard->update(['images' => array_values($currentImages)]);
            
            // Delete file from storage
            Storage::disk('public')->delete($imagePath);
            
            return response()->json(['message' => 'Image removed successfully', 'images' => array_values($currentImages)]);
        }

        return response()->json(['error' => 'Image not found'], 404);
    }

    public function print($id, $language = 'english')
    {
        $jobCard = JobCard::with(['branch', 'preparedBy', 'mechanic'])->findOrFail($id);

        // Load translations based on language
        $translations = $this->loadTranslations($language);

        $pdf = PDF::loadView('pdf.job-card', [
            'jobCard' => $jobCard,
            'language' => $language,
            'translations' => $translations,
            'company' => $jobCard->branch
        ]);

        return $pdf->download('job-card-' . $jobCard->job_number . '.pdf');
    }

    private function sendCompletionSMS(JobCard $jobCard)
    {
        if (empty($jobCard->customer_phone)) {
            return;
        }

        try {
            $message = "Dear {$jobCard->customer_name}, your vehicle ({$jobCard->bike_number}) service is completed. Please collect your vehicle. - Workshop";

            // Store in SMS log
            $smsLog = SmsLog::create([
                'branch_id' => $jobCard->branch_id,
                'job_card_id' => $jobCard->id,
                'user_id' => auth()->id(),
                'phone_number' => $jobCard->customer_phone,
                'message' => $message,
                'status' => 'pending',
                'provider' => 'pending'
            ]);

            // Execute job to send SMS and automatically record audit
            $job = new \App\Jobs\SendSmsJob($smsLog);
            $job->handle();

        } catch (\Exception $e) {
            \Log::error('Completion SMS sending failed: ' . $e->getMessage());
        }
    }

    private function loadTranslations($language)
    {
        $file = resource_path("lang/{$language}/job-card.json");
        if (file_exists($file)) {
            return json_decode(file_get_contents($file), true);
        }
        return [];
    }

    // Additional endpoints for reports
    public function activeJobs()
    {
        return response()->json(JobCard::active()->with(['branch', 'mechanic'])->get());
    }

    public function completedJobs()
    {
        return response()->json(JobCard::completed()->with(['branch', 'mechanic', 'invoice'])->get());
    }

    public function bikeHistory($bike_number)
    {
        $history = JobCard::where('bike_number', $bike_number)
            ->with(['branch', 'mechanic', 'invoice'])
            ->orderBy('created_at', 'desc')
            ->get();
            
        return response()->json($history);
    }
}