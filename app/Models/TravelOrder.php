<?php
// app/Models/TravelOrder.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class TravelOrder extends Model
{
    use HasFactory;

    protected $table = 'travel_orders';

    protected $fillable = [
        'employee_id',
        'date',
        'start_date',
        'end_date',
        'destination',
        'transportation_type',
        'purpose',
        'accommodation_required',
        'meal_allowance',
        'other_expenses',
        'estimated_cost',
        'total_days',
        'status', // pending, approved, rejected, completed, cancelled
        'approved_by',
        'approved_at',
        'remarks'
    ];

    protected $casts = [
        'date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'total_days' => 'integer',
        'accommodation_required' => 'boolean',
        'meal_allowance' => 'boolean',
        'estimated_cost' => 'decimal:2',
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