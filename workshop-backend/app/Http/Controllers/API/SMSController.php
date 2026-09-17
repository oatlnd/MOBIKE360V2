<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\SmsLog;
use App\Models\JobCard;
use App\Jobs\SendSmsJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SMSController extends Controller
{
    /**
     * Send SMS for a specific Job Card.
     */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'job_card_id' => 'required|exists:job_cards,id',
            'message' => 'required|string|max:500',
            'phone_number' => 'nullable|string|max:25',
        ]);

        $jobCard = JobCard::findOrFail($validated['job_card_id']);
        $recipientPhone = !empty($validated['phone_number']) ? $validated['phone_number'] : $jobCard->customer_phone;

        if (empty($recipientPhone)) {
            return response()->json([
                'success' => false,
                'message' => 'Customer phone number is missing on this job card.',
            ], 422);
        }

        // Create SMS log
        $smsLog = SmsLog::create([
            'branch_id' => $jobCard->branch_id,
            'job_card_id' => $jobCard->id,
            'user_id' => auth()->id(),
            'phone_number' => $recipientPhone,
            'message' => $validated['message'],
            'status' => 'pending',
            'provider' => 'pending'
        ]);

        // Execute SMS sending synchronously for real-time API response and feedback
        $smsJob = new SendSmsJob($smsLog);
        $result = $smsJob->handle();

        $freshLog = $smsLog->fresh();

        if (!empty($result['success'])) {
            return response()->json([
                'success' => true,
                'message' => 'SMS sent successfully',
                'status' => 'sent',
                'sms_log' => $freshLog,
                'api_response' => $result['raw_response'] ?? null,
                'provider_message_id' => $result['provider_message_id'] ?? null
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Failed to send SMS: ' . ($result['error'] ?? 'Gateway rejected request'),
            'status' => 'failed',
            'sms_log' => $freshLog,
            'api_response' => $result['raw_response'] ?? null,
            'error' => $result['error'] ?? null
        ], 422);
    }

    /**
     * Send a Test SMS to verify gateway connection & view raw API response.
     */
    public function test(Request $request)
    {
        $validated = $request->validate([
            'phone_number' => 'required|string|max:25',
            'message' => 'required|string|max:500',
        ]);

        $user = auth()->user();
        $branchId = $user->branch_id ?? \App\Models\Branch::first()?->id ?? 1;

        // Create SMS log for test
        $smsLog = SmsLog::create([
            'branch_id' => $branchId,
            'job_card_id' => null,
            'user_id' => auth()->id(),
            'phone_number' => $validated['phone_number'],
            'message' => $validated['message'],
            'status' => 'pending',
            'provider' => 'pending'
        ]);

        // Execute SMS sending
        $smsJob = new SendSmsJob($smsLog);
        $result = $smsJob->handle();

        $freshLog = $smsLog->fresh();

        if (!empty($result['success'])) {
            return response()->json([
                'success' => true,
                'message' => 'Test SMS dispatched successfully!',
                'status' => 'sent',
                'sms_log' => $freshLog,
                'api_response' => $result['raw_response'] ?? null,
                'provider' => $result['provider'] ?? null,
                'provider_message_id' => $result['provider_message_id'] ?? null
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'SMS Gateway test failed: ' . ($result['error'] ?? 'Unknown error'),
            'status' => 'failed',
            'sms_log' => $freshLog,
            'api_response' => $result['raw_response'] ?? null,
            'provider' => $result['provider'] ?? null,
            'error' => $result['error'] ?? null
        ], 422);
    }

    /**
     * Get paginated SMS logs.
     */
    public function logs(Request $request)
    {
        $query = SmsLog::with(['branch', 'jobCard', 'user']);

        if ($request->filled('job_card_id')) {
            $query->where('job_card_id', $request->job_card_id);
        }

        if ($request->filled('phone_number')) {
            $query->where('phone_number', 'LIKE', "%{$request->phone_number}%");
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $query->orderBy('created_at', 'desc');

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    /**
     * Handle SMS provider webhook for status updates.
     */
    public function webhook(Request $request)
    {
        Log::info('SMS webhook received', $request->all());
        return response()->json(['status' => 'ok']);
    }
}