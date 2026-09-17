<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsLog extends Model
{
    protected $fillable = [
        'branch_id',
        'job_card_id',
        'user_id',
        'phone_number',
        'message',
        'status',
        'provider',
        'provider_message_id',
        'error_message',
        'raw_response',
        'sent_at',
        'delivered_at'
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'delivered_at' => 'datetime',
        'raw_response' => 'array'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeByPhone($query, $phone)
    {
        return $query->where('phone_number', $phone);
    }
}