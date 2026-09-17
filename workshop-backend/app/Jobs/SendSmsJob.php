<?php

namespace App\Jobs;

use App\Models\SmsLog;
use App\Models\SystemSetting;
use App\Models\JobCardAudit;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendSmsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $smsLog;

    public function __construct(SmsLog $smsLog)
    {
        $this->smsLog = $smsLog;
    }

    /**
     * Execute the job.
     * Returns an array with execution details for synchronous callers.
     */
    public function handle()
    {
        $providerName = 'unknown';
        $providerMessageId = null;
        $rawResponse = null;
        $errorMessage = null;
        $status = 'failed';

        try {
            // Retrieve system settings
            $settings = SystemSetting::all()->pluck('value', 'key');
            $configuredProvider = $settings['sms_provider'] ?? null;
            $gatewayUrl = $settings['sms_gateway_url'] ?? null;
            $apiKey = $settings['sms_api_key'] ?? env('SMS_API_KEY', '');
            $twilioSid = $settings['twilio_sid'] ?? config('services.twilio.sid') ?? env('TWILIO_SID');

            // Determine provider
            if ($configuredProvider === 'twilio') {
                $providerName = 'twilio';
                $result = $this->sendViaTwilio($settings);
            } elseif ($configuredProvider === 'smslenz' || $configuredProvider === 'http_gateway') {
                $providerName = 'smslenz';
                $result = $this->sendViaHttpGateway($settings);
            } elseif (!empty($apiKey) || !empty($gatewayUrl)) {
                // If API key or URL is configured in settings, prioritize HTTP Gateway
                $providerName = 'smslenz';
                $result = $this->sendViaHttpGateway($settings);
            } elseif (!empty($twilioSid) && $twilioSid !== 'your_twilio_sid') {
                $providerName = 'twilio';
                $result = $this->sendViaTwilio($settings);
            } else {
                // Default fallback to HTTP Gateway (SMSLenz)
                $providerName = 'smslenz';
                $result = $this->sendViaHttpGateway($settings);
            }

            $status = $result['status'] ?? 'sent';
            $providerName = $result['provider'] ?? $providerName;
            $providerMessageId = $result['provider_message_id'] ?? null;
            $rawResponse = $result['raw_response'] ?? null;

            $this->smsLog->update([
                'status' => 'sent',
                'provider' => $providerName,
                'provider_message_id' => $providerMessageId,
                'raw_response' => $rawResponse,
                'error_message' => null,
                'sent_at' => now()
            ]);

            // Record or update JobCardAudit if linked to a job card
            $this->recordJobCardAudit('sms_sent', [
                'phone' => $this->smsLog->phone_number,
                'message' => $this->smsLog->message,
                'provider' => $providerName,
                'status' => 'sent',
                'provider_message_id' => $providerMessageId,
                'api_response' => $rawResponse,
                'error' => null
            ]);

            return [
                'success' => true,
                'status' => 'sent',
                'provider' => $providerName,
                'provider_message_id' => $providerMessageId,
                'raw_response' => $rawResponse,
                'error' => null
            ];

        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();
            Log::error("SMS sending failed [{$this->smsLog->phone_number}]: " . $errorMessage);

            $this->smsLog->update([
                'status' => 'failed',
                'provider' => $providerName,
                'error_message' => $errorMessage,
                'raw_response' => $rawResponse ?? ['error' => $errorMessage]
            ]);

            // Record failure in JobCardAudit
            $this->recordJobCardAudit('sms_failed', [
                'phone' => $this->smsLog->phone_number,
                'message' => $this->smsLog->message,
                'provider' => $providerName,
                'status' => 'failed',
                'provider_message_id' => null,
                'api_response' => $rawResponse ?? ['error' => $errorMessage],
                'error' => $errorMessage
            ]);

            return [
                'success' => false,
                'status' => 'failed',
                'provider' => $providerName,
                'provider_message_id' => null,
                'raw_response' => $rawResponse ?? ['error' => $errorMessage],
                'error' => $errorMessage
            ];
        }
    }

    /**
     * Send SMS via Twilio API.
     */
    private function sendViaTwilio($settings = [])
    {
        if (!class_exists(\Twilio\Rest\Client::class)) {
            throw new \Exception("Twilio SDK is not installed on the system.");
        }

        $sid = $settings['twilio_sid'] ?? config('services.twilio.sid') ?? env('TWILIO_SID');
        $token = $settings['twilio_token'] ?? $settings['twilio_auth_token'] ?? config('services.twilio.token') ?? env('TWILIO_TOKEN') ?? env('TWILIO_AUTH_TOKEN');
        $from = $settings['twilio_from'] ?? $settings['twilio_phone_number'] ?? config('services.twilio.from') ?? env('TWILIO_PHONE_NUMBER') ?? env('TWILIO_FROM');

        if (!$sid || !$token || !$from || $sid === 'your_twilio_sid') {
            throw new \Exception("Twilio credentials (SID, Auth Token, From Number) are not configured.");
        }

        $cleanPhone = $this->normalizePhoneNumber($this->smsLog->phone_number, 'international');

        $twilio = new \Twilio\Rest\Client($sid, $token);
        $message = $twilio->messages->create($cleanPhone, [
            'from' => $from,
            'body' => $this->smsLog->message
        ]);

        $rawResponse = [
            'sid' => $message->sid,
            'status' => $message->status,
            'to' => $message->to,
            'from' => $message->from,
            'price' => $message->price,
            'date_created' => $message->dateCreated ? $message->dateCreated->format('Y-m-d H:i:s') : null,
        ];

        return [
            'status' => 'sent',
            'provider' => 'twilio',
            'provider_message_id' => $message->sid ?? null,
            'raw_response' => $rawResponse
        ];
    }

    /**
     * Send SMS via SMSLenz or generic HTTP REST Gateway.
     */
    private function sendViaHttpGateway($settings = [])
    {
        $url = $settings['sms_gateway_url'] ?? 'https://smslenz.lk/api/v2/send';
        $apiKey = $settings['sms_api_key'] ?? env('SMS_API_KEY', '');
        $senderId = $settings['sms_sender_id'] ?? $settings['sms_mask'] ?? env('SMS_SENDER_ID', '');

        if (empty($apiKey)) {
            throw new \Exception("SMS Gateway API Key is missing. Please configure it under Settings -> SMS Settings.");
        }

        if (empty($url)) {
            $url = 'https://smslenz.lk/api/v2/send';
        }

        // Format phone number (supports Sri Lankan 947XXXXXXXX, 07XXXXXXXX, international)
        $cleanPhone = $this->normalizePhoneNumber($this->smsLog->phone_number, 'smslenz');

        $userId = $settings['sms_user_id'] ?? env('SMS_USER_ID', '2175');
        $activeSenderId = !empty($senderId) ? $senderId : 'SMSlenzDEMO';

        // Exact payload expected by SMSLenz (https://smslenz.lk/api/send-sms)
        $smslenzPayload = [
            'user_id'   => (string)$userId,
            'api_key'   => $apiKey,
            'sender_id' => $activeSenderId,
            'contact'   => $cleanPhone,
            'message'   => $this->smsLog->message,
        ];

        $response = null;
        $rawResponse = null;

        // Attempt 1: Direct JSON POST with exact SMSLenz payload
        try {
            $resp = Http::timeout(15)
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json'
                ])
                ->post($url, $smslenzPayload);

            if ($resp->successful() && !str_contains($resp->body(), 'Cannot convert') && !str_contains($resp->body(), 'Object.values')) {
                $response = $resp;
                $rawResponse = $resp->json() ?? ['body' => $resp->body(), 'http_status' => $resp->status()];
            }
        } catch (\Exception $ex) {
            // Proceed to next attempt
        }

        // Attempt 2: Form-urlencoded POST with exact SMSLenz payload
        if (!$response || !$response->successful()) {
            try {
                $resp = Http::timeout(15)
                    ->asForm()
                    ->post($url, $smslenzPayload);

                if ($resp->successful() && !str_contains($resp->body(), 'Cannot convert') && !str_contains($resp->body(), 'Object.values')) {
                    $response = $resp;
                    $rawResponse = $resp->json() ?? ['body' => $resp->body(), 'http_status' => $resp->status()];
                }
            } catch (\Exception $ex) {
                // Proceed to next attempt
            }
        }

        // If all attempts failed or returned error, capture last response
        if (!$response) {
            $resp = Http::timeout(15)
                ->asForm()
                ->post($url, $smslenzPayload);
            $response = $resp;
            $rawResponse = $resp->json() ?? ['body' => $resp->body(), 'http_status' => $resp->status()];
        }

        // Check if HTTP response is an error
        if (!$response->successful()) {
            $errorMsg = is_array($rawResponse) && isset($rawResponse['message']) 
                ? $rawResponse['message'] 
                : ($response->body() ?: "HTTP error {$response->status()}");
            throw new \Exception("SMS Gateway error (HTTP {$response->status()}): {$errorMsg}");
        }

        // Check if body contains error status even with HTTP 200
        if (is_array($rawResponse)) {
            $isError = false;
            $bodyErrorMsg = null;

            if (isset($rawResponse['status']) && in_array(strtolower((string)$rawResponse['status']), ['error', 'failed', 'false', '0'])) {
                $isError = true;
                $bodyErrorMsg = $rawResponse['message'] ?? $rawResponse['error'] ?? $rawResponse['msg'] ?? 'SMS Gateway returned error status';
            } elseif (isset($rawResponse['success']) && ($rawResponse['success'] === false || $rawResponse['success'] === 'false')) {
                $isError = true;
                $bodyErrorMsg = $rawResponse['message'] ?? $rawResponse['error'] ?? 'SMS Gateway indicated failure';
            } elseif (isset($rawResponse['code']) && is_numeric($rawResponse['code']) && (int)$rawResponse['code'] >= 400) {
                $isError = true;
                $bodyErrorMsg = $rawResponse['message'] ?? "SMS Gateway error code {$rawResponse['code']}";
            }

            if ($isError) {
                throw new \Exception("SMS Gateway rejected: {$bodyErrorMsg}");
            }
        }

        // Extract provider message ID
        $providerMessageId = null;
        if (is_array($rawResponse)) {
            $providerMessageId = $rawResponse['id'] 
                ?? $rawResponse['message_id'] 
                ?? $rawResponse['data']['id'] 
                ?? $rawResponse['data']['message_id'] 
                ?? $rawResponse['uid'] 
                ?? null;
        }

        return [
            'status' => 'sent',
            'provider' => 'smslenz',
            'provider_message_id' => $providerMessageId,
            'raw_response' => $rawResponse
        ];
    }

    /**
     * Normalize and sanitize phone numbers for SMS Gateways.
     */
    private function normalizePhoneNumber($phone, $targetFormat = 'smslenz')
    {
        // Strip everything except numbers and '+'
        $clean = preg_replace('/[^0-9+]/', '', (string)$phone);
        
        // Remove leading '+' for numeric processing
        $digitsOnly = ltrim($clean, '+');

        // Handle Sri Lankan phone formats (07XXXXXXXX or 7XXXXXXXX -> 947XXXXXXXX)
        if (str_starts_with($digitsOnly, '0') && strlen($digitsOnly) === 10) {
            // Local 07XXXXXXXX -> 947XXXXXXXX
            $digitsOnly = '94' . substr($digitsOnly, 1);
        } elseif (strlen($digitsOnly) === 9 && in_array(substr($digitsOnly, 0, 1), ['7', '1'])) {
            // 7XXXXXXXX -> 947XXXXXXXX
            $digitsOnly = '94' . $digitsOnly;
        }

        if ($targetFormat === 'international') {
            return '+' . $digitsOnly;
        }

        return $digitsOnly;
    }

    /**
     * Record or update JobCardAudit entry.
     */
    private function recordJobCardAudit($action, array $changes)
    {
        if (empty($this->smsLog->job_card_id)) {
            return;
        }

        try {
            JobCardAudit::create([
                'job_card_id' => $this->smsLog->job_card_id,
                'user_id' => $this->smsLog->user_id ?? auth()->id(),
                'action' => $action,
                'changes' => $changes
            ]);
        } catch (\Exception $e) {
            Log::warning("Failed to record JobCardAudit for SMS: " . $e->getMessage());
        }
    }
}
