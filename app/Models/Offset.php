<?php
// app/Models/Offset.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Offset extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'offset_type_id',
        'date',
        'workday',
        'hours',
        'reason',
        'status', // pending, approved, rejected
        'approved_by',
        'approved_at',
        'remarks'
    ];

    protected $casts = [
        'date' => 'date',
        'workday' => 'date',
        'hours' => 'decimal:2',
        'approved_at' => 'datetime'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
    
    public function offset_type()
    {
        return $this->belongsTo(OffsetType::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}