<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class JobCard extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'job_number',
        'bike_number',
        'make',
        'model',
        'engine_no',
        'chassis_no',
        'mileage',
        'customer_name',
        'customer_phone',
        'customer_email',
        'service_type',
        'parts_used',
        'description',
        'status',
        'prepared_by',
        'mechanic_id',
        'estimated_duration',
        'quality_check_signature',
        'images',
        'purpose',
        'total_amount',
        'discount',
        'tax',
        'final_amount',
        'completed_at',
        'invoiced_at',
        'customer_town',
        'next_service_km',
        'next_service_date',
        'delivery_status',
        'delivered_at'
    ];

    protected $casts = [
        'service_type' => 'array',
        'parts_used' => 'array',
        'images' => 'array',
        'purpose' => 'array',
        'total_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'final_amount' => 'decimal:2',
        'mileage' => 'integer',
        'next_service_km' => 'integer',
        'completed_at' => 'datetime',
        'invoiced_at' => 'datetime',
        'delivered_at' => 'datetime',
        'next_service_date' => 'date'
    ];

    // Relationships
    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function preparedBy()
    {
        return $this->belongsTo(User::class, 'prepared_by');
    }

    public function mechanic()
    {
        return $this->belongsTo(User::class, 'mechanic_id');
    }

    public function invoice()
    {
        return $this->hasOne(Invoice::class);
    }

    public function smsLogs()
    {
        return $this->hasMany(SmsLog::class);
    }

    public function audits()
    {
        return $this->hasMany(JobCardAudit::class)->with('user')->orderBy('created_at', 'desc');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->whereIn('status', ['pending', 'in_progress']);
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeInvoiced($query)
    {
        return $query->where('status', 'invoiced');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByDateRange($query, $from, $to)
    {
        $fromDate = \Carbon\Carbon::parse($from)->startOfDay();
        $toDate = \Carbon\Carbon::parse($to)->endOfDay();
        return $query->whereBetween('created_at', [$fromDate, $toDate]);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('job_number', 'LIKE', "%{$search}%")
              ->orWhere('customer_name', 'LIKE', "%{$search}%")
              ->orWhere('bike_number', 'LIKE', "%{$search}%")
              ->orWhere('customer_phone', 'LIKE', "%{$search}%");
        });
    }

    // Accessors
    public function getStatusColorAttribute()
    {
        return [
            'new' => 'warning',
            'pending' => 'warning',
            'started' => 'info',
            'in_progress' => 'info',
            'waiting_for_customer' => 'secondary',
            'completed' => 'success',
            'closed' => 'default',
            'invoiced' => 'primary',
            'cancelled' => 'error'
        ][$this->status] ?? 'default';
    }

    public function getServiceTypeNamesAttribute()
    {
        return collect($this->service_type)->pluck('name')->implode(', ');
    }

    // Methods
    public function calculateTotals()
    {
        $servicesTotal = collect($this->service_type)->sum('price');
        $partsTotal = collect($this->parts_used)->sum('total');
        $total = $servicesTotal + $partsTotal;
        $this->total_amount = $total;
        $this->final_amount = $total - $this->discount + $this->tax;
        $this->save();
        return $this;
    }

    public function markAsCompleted($signature)
    {
        $this->status = 'completed';
        $this->quality_check_signature = $signature;
        $this->completed_at = now();
        $this->save();
        return $this;
    }

    public function markAsInvoiced()
    {
        $this->status = 'invoiced';
        $this->invoiced_at = now();
        $this->save();
        return $this;
    }

    public static function generateJobNumber($branchId)
    {
        $prefix = 'JC-' . str_pad($branchId, 3, '0', STR_PAD_LEFT) . '-';
        
        return DB::transaction(function() use ($prefix) {
            // Get the maximum job number with this prefix (including soft deleted ones)
            $last = self::withTrashed()
                        ->where('job_number', 'LIKE', $prefix . '%')
                        ->orderBy('job_number', 'desc')
                        ->lockForUpdate()
                        ->value('job_number');
            
            // Extract the numeric part
            if ($last) {
                // Extract the number after the last dash
                $parts = explode('-', $last);
                $lastNumber = (int) end($parts);
                $number = $lastNumber + 1;
            } else {
                $number = 1;
            }
            
            // Generate the new job number
            $newJobNumber = $prefix . str_pad($number, 4, '0', STR_PAD_LEFT);
            
            // Double-check it doesn't exist (including soft deleted ones)
            while (self::withTrashed()->where('job_number', $newJobNumber)->exists()) {
                $number++;
                $newJobNumber = $prefix . str_pad($number, 4, '0', STR_PAD_LEFT);
            }
            
            return $newJobNumber;
        });
    }
}