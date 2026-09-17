<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollRun extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'month',
        'period_type',
        'total_base_pay',
        'total_advances',
        'total_bonuses',
        'total_epf',
        'total_net_pay',
        'status',
        'payment_date',
        'processed_by'
    ];

    protected $casts = [
        'total_base_pay' => 'decimal:2',
        'total_advances' => 'decimal:2',
        'total_bonuses' => 'decimal:2',
        'total_epf' => 'decimal:2',
        'total_net_pay' => 'decimal:2',
        'payment_date' => 'date',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }

    public function items()
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function advances()
    {
        return $this->hasMany(EmployeeAdvance::class, 'deducted_in_payroll_run_id');
    }
}
