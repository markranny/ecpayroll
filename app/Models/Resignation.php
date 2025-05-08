<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Resignation extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'notice_date',
        'resignation_date',
        'reason',
        'document_path',
        'status',
        'approved_by',
        'approved_at',
        'remarks'
    ];

    protected $casts = [
        'notice_date' => 'date',
        'resignation_date' => 'date',
        'approved_at' => 'datetime'
    ];

    // Relationship with Employee model
    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    // Relationship with User model for approver
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Optional: Scope for different statuses
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }
}