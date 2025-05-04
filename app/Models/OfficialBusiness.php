<?php
// app/Models/OfficialBusiness.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class OfficialBusiness extends Model
{
    use HasFactory;

    protected $table = 'official_businesses';

    protected $fillable = [
        'employee_id',
        'date',
        'start_date',
        'end_date',
        'location',
        'purpose',
        'with_accommodation',
        'total_days',
        'status', // pending, approved, rejected
        'approved_by',
        'approved_at',
        'remarks'
    ];

    protected $casts = [
        'date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'total_days' => 'integer',
        'with_accommodation' => 'boolean',
        'approved_at' => 'datetime'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}