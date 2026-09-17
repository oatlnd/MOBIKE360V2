<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\JobCard;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:view invoices')->only(['index', 'show']);
        $this->middleware('permission:create invoices')->only(['store']);
        $this->middleware('permission:edit invoices')->only(['update']);
        $this->middleware('permission:delete invoices')->only(['destroy']);
    }

    public function index(Request $request)
    {
        $query = Invoice::with(['branch', 'jobCard', 'creator']);

        if ($request->has('payment_type')) {
            $query->byPaymentType($request->payment_type);
        }

        if ($request->has('payment_status')) {
            $query->byPaymentStatus($request->payment_status);
        }

        if ($request->has('date_from') && $request->has('date_to')) {
            $query->whereBetween('created_at', [$request->date_from, $request->date_to]);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('invoice_number', 'LIKE', "%{$search}%")
                  ->orWhereHas('jobCard', function($q2) use ($search) {
                      $q2->where('customer_name', 'LIKE', "%{$search}%")
                         ->orWhere('bike_number', 'LIKE', "%{$search}%");
                  });
            });
        }

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        $query->orderBy($request->get('sort_by', 'created_at'), $request->get('sort_order', 'desc'));

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request)
    {
        // Usually invoices are created from job card conversion, but allow manual creation if needed
        $validated = $request->validate([
            'job_card_id' => 'required|exists:job_cards,id',
            'payment_type' => 'required|in:cash,credit_card,bank_transfer,cheque',
            'amount' => 'required|numeric|min:0',
            'paid_amount' => 'required|numeric|min:0',
            'cash_given' => 'nullable|numeric|required_if:payment_type,cash',
            'card_number' => 'nullable|string|required_if:payment_type,credit_card',
            'card_holder_name' => 'nullable|string|required_if:payment_type,credit_card',
            'bank_name' => 'nullable|string|required_if:payment_type,bank_transfer',
            'cheque_number' => 'nullable|string|required_if:payment_type,cheque',
            'cheque_date' => 'nullable|date|required_if:payment_type,cheque',
            'notes' => 'nullable|string'
        ]);

        $jobCard = JobCard::find($validated['job_card_id']);
        if ($jobCard->status !== 'completed') {
            return response()->json(['error' => 'Job card must be completed before invoicing'], 400);
        }

        $balance = $validated['amount'] - $validated['paid_amount'];
        $paymentStatus = $balance == 0 ? 'paid' : ($validated['paid_amount'] > 0 ? 'partial' : 'pending');

        $invoiceData = [
            'branch_id' => $jobCard->branch_id,
            'job_card_id' => $jobCard->id,
            'invoice_number' => Invoice::generateInvoiceNumber($jobCard->branch_id),
            'payment_type' => $validated['payment_type'],
            'payment_status' => $paymentStatus,
            'amount' => $validated['amount'],
            'paid_amount' => $validated['paid_amount'],
            'balance' => $balance,
            'notes' => $validated['notes'] ?? null,
            'created_by' => auth()->id()
        ];

        // Add payment specific fields
        if ($validated['payment_type'] === 'cash') {
            $invoiceData['cash_given'] = $validated['cash_given'];
            $invoiceData['cash_returned'] = $validated['cash_given'] - $validated['paid_amount'];
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

        // Update job card status
        $jobCard->status = 'invoiced';
        $jobCard->invoiced_at = now();
        $jobCard->save();

        return response()->json($invoice->load(['jobCard', 'branch', 'creator']), 201);
    }

    public function show(Invoice $invoice)
    {
        return response()->json($invoice->load(['jobCard', 'branch', 'creator']));
    }

    public function update(Request $request, Invoice $invoice)
    {
        // Only allow updates if not fully paid
        if ($invoice->payment_status === 'paid') {
            return response()->json(['error' => 'Cannot update a paid invoice'], 400);
        }

        $validated = $request->validate([
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_status' => 'nullable|in:paid,partial,pending',
            'notes' => 'nullable|string'
        ]);

        if (isset($validated['paid_amount'])) {
            $invoice->paid_amount = $validated['paid_amount'];
            $invoice->balance = $invoice->amount - $invoice->paid_amount;
            if ($invoice->balance == 0) {
                $invoice->payment_status = 'paid';
            } elseif ($invoice->paid_amount > 0) {
                $invoice->payment_status = 'partial';
            } else {
                $invoice->payment_status = 'pending';
            }
        }

        if (isset($validated['payment_status'])) {
            $invoice->payment_status = $validated['payment_status'];
        }

        if (isset($validated['notes'])) {
            $invoice->notes = $validated['notes'];
        }

        $invoice->save();

        return response()->json($invoice);
    }

    public function destroy(Invoice $invoice)
    {
        // Check if invoice is already paid
        if ($invoice->payment_status === 'paid') {
            return response()->json(['error' => 'Cannot delete a paid invoice'], 400);
        }

        // Revert job card status back to completed
        $jobCard = $invoice->jobCard;
        $jobCard->status = 'completed';
        $jobCard->invoiced_at = null;
        $jobCard->save();

        $invoice->delete();
        return response()->json(['message' => 'Invoice deleted successfully']);
    }

    public function cancel(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'code' => 'required|string'
        ]);

        $authCode = \App\Models\SystemSetting::getValue('cancel_auth_code', '0000');
        if ($validated['code'] !== $authCode) {
            return response()->json(['error' => 'Invalid authorization code'], 403);
        }

        $jobCard = $invoice->jobCard;
        $jobCard->status = 'cancelled';
        $jobCard->invoiced_at = null;
        $jobCard->save();

        $invoice->delete();
        return response()->json(['message' => 'Invoice cancelled successfully']);
    }
}