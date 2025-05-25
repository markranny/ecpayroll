<?php
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
        'status', // pending, approved, rejected, cancelled
        'approved_by',
        'approved_at',
        'remarks',
        'is_bank_updated', // New field to track if this offset has updated bank
        'transaction_type', // credit (add to bank) or debit (withdraw from bank)
    ];

    protected $casts = [
        'date' => 'date',
        'workday' => 'date',
        'hours' => 'decimal:2',
        'approved_at' => 'datetime',
        'is_bank_updated' => 'boolean'
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
    
    public function offsetBank()
    {
        return $this->employee->offsetBank;
    }
    
    public function updateOffsetBank()
    {
        if ($this->is_bank_updated || $this->status !== 'approved') {
            return false;
        }
        
        $bank = $this->employee->offsetBank;
        
        if (!$bank) {
            // Create new bank if it doesn't exist
            $bank = OffsetBank::create([
                'employee_id' => $this->employee_id,
                'total_hours' => 0,
                'used_hours' => 0,
                'remaining_hours' => 0,
                'last_updated' => now()
            ]);
        }
        
        if ($this->transaction_type === 'credit') {
            // Add hours to bank
            $success = $bank->addHours($this->hours, "Credit from offset ID {$this->id}");
        } else {
            // Use hours from bank
            $success = $bank->useHours($this->hours, "Debit from offset ID {$this->id}");
        }
        
        if ($success) {
            $this->is_bank_updated = true;
            $this->save();
        }
        
        return $success;
    }
}