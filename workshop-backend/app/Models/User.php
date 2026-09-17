<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, SoftDeletes;

    protected $fillable = [
        'name',
        'username',
        'first_name',
        'last_name',
        'email',
        'password',
        'phone',
        'address',
        'branch_id',
        'employee_id',
        'identity_card_no',
        'bank_name',
        'bank_branch',
        'bank_account_no',
        'dob',
        'joining_date',
        'salary',
        'base_salary',
        'salary_type',
        'daily_rate',
        'salary_rate_type',
        'leave_days_per_year',
        'profile_image',
        'is_active',
        'epf_etf',
        'bank_account_number',
        'bank_branch_code',
        'epf_number'
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'joining_date' => 'date',
        'dob' => 'date',
        'salary' => 'decimal:2',
        'base_salary' => 'decimal:2',
        'daily_rate' => 'decimal:2',
        'is_active' => 'boolean',
        'epf_etf' => 'boolean',
        'leave_days_per_year' => 'integer'
    ];

    public function getBaseSalaryAttribute($value)
    {
        return $value ?: ($this->attributes['salary'] ?? 0);
    }

    public function getBankAccountNumberAttribute($value)
    {
        return $value ?: ($this->attributes['bank_account_no'] ?? null);
    }

    public function getBankBranchCodeAttribute($value)
    {
        return $value ?: ($this->attributes['bank_branch'] ?? null);
    }

    protected static function boot()
    {
        parent::boot();
        static::saving(function ($user) {
            if ($user->first_name || $user->last_name) {
                $user->name = trim($user->first_name . ' ' . $user->last_name);
            }
        });
    }

    // Relationships
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function preparedJobCards()
    {
        return $this->hasMany(JobCard::class, 'prepared_by');
    }

    public function mechanicJobCards()
    {
        return $this->hasMany(JobCard::class, 'mechanic_id');
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'created_by');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    // Accessor
    public function getFullNameAttribute()
    {
        return $this->name;
    }
}