<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeAdvance extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'branch_id',
        'amount',
        'date',
        'payment_method',
        'type',
        'deducted_in_payroll_run_id',
        'status',
        'notes'
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function payrollRun()
    {
        return $this->belongsTo(PayrollRun::class, 'deducted_in_payroll_run_id');
    }
}
