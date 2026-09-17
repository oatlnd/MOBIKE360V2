<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PayrollItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'payroll_run_id',
        'user_id',
        'base_salary',
        'working_days',
        'sunday_days',
        'sunday_bonus',
        'allowances',
        'advances_deducted',
        'first_half_paid',
        'epf_employee',
        'epf_employer',
        'net_pay',
        'status',
        'payment_method',
        'bank_account_number',
        'bank_name',
        'remarks'
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'sunday_bonus' => 'decimal:2',
        'allowances' => 'decimal:2',
        'advances_deducted' => 'decimal:2',
        'first_half_paid' => 'decimal:2',
        'epf_employee' => 'decimal:2',
        'epf_employer' => 'decimal:2',
        'net_pay' => 'decimal:2',
    ];

    public function payrollRun()
    {
        return $this->belongsTo(PayrollRun::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
