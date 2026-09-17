<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Invoice extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'job_card_id',
        'invoice_number',
        'payment_type',
        'payment_status',
        'amount',
        'paid_amount',
        'balance',
        'cash_given',
        'cash_returned',
        'card_number',
        'card_holder_name',
        'bank_name',
        'cheque_number',
        'cheque_date',
        'notes',
        'created_by'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'balance' => 'decimal:2',
        'cash_given' => 'decimal:2',
        'cash_returned' => 'decimal:2',
        'cheque_date' => 'date'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeByPaymentType($query, $type)
    {
        return $query->where('payment_type', $type);
    }

    public function scopeByPaymentStatus($query, $status)
    {
        return $query->where('payment_status', $status);
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public static function generateInvoiceNumber($branchId)
    {
        $prefix = 'INV-' . str_pad($branchId, 3, '0', STR_PAD_LEFT) . '-';
        $last = self::where('invoice_number', 'LIKE', $prefix . '%')
                    ->orderBy('id', 'desc')
                    ->first();
        $number = $last ? intval(substr($last->invoice_number, -6)) + 1 : 1;
        return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
    }
}