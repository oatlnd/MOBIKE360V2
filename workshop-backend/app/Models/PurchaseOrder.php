<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrder extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'branch_id',
        'supplier_id',
        'po_number',
        'invoice_number',
        'invoice_date',
        'sub_total',
        'tax',
        'discount',
        'total_amount',
        'status',
        'notes',
        'created_by',
        'received_by',
        'received_at'
    ];

    protected $casts = [
        'sub_total' => 'decimal:2',
        'tax' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'invoice_date' => 'date',
        'received_at' => 'datetime'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    public function calculateTotals()
    {
        $subTotal = $this->items->sum('total_price');
        $this->sub_total = $subTotal;
        $this->total_amount = $subTotal + $this->tax - $this->discount;
        $this->save();
        return $this;
    }

    public static function generatePONumber($branchId)
    {
        $prefix = 'PO-' . str_pad($branchId, 3, '0', STR_PAD_LEFT) . '-';
        $last = self::where('po_number', 'LIKE', $prefix . '%')
                    ->orderBy('id', 'desc')
                    ->first();
        $number = $last ? intval(substr($last->po_number, -6)) + 1 : 1;
        return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
    }
}