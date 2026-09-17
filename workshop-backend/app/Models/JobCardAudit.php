<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobCardAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_card_id',
        'user_id',
        'action',
        'changes'
    ];

    protected $casts = [
        'changes' => 'array',
    ];

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
