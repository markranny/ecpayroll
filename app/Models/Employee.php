<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Employee extends Model
{
    use HasFactory;

    protected $table = 'employees';  // Explicitly set table name

    protected $fillable = [
        'idno',
        'bid',
        'Lname',
        'Fname',
        'MName',
        'Suffix',
        'Gender',
        'EducationalAttainment',
        'Degree',
        'CivilStatus',
        'Birthdate',
        'ContactNo',
        'Email',
        'PresentAddress',
        'PermanentAddress',
        'EmerContactName',
        'EmerContactNo',
        'EmerRelationship',
        'EmpStatus',
        'JobStatus',
        'RankFile',
        'Department',
        'Line',
        'Jobtitle',
        'HiredDate',
        'EndOfContract',
        'pay_type',
        'payrate',
        'pay_allowance',
        'SSSNO',
        'PHILHEALTHNo',
        'HDMFNo',
        'TaxNo',
        'Taxable',
        'CostCenter'
    ];

    protected $casts = [
        'Birthdate' => 'date',
        'HiredDate' => 'date',
        'EndOfContract' => 'date',
        'Taxable' => 'boolean',
        'payrate' => 'decimal:2',
        'pay_allowance' => 'decimal:2'
    ];

    public function attendances()
    {
        return $this->hasMany(EmployeeUploadAttendance::class, 'employee_no', 'idno');
    }

    // New Relation for Benefits
    public function benefits()
    {
        return $this->hasMany(Benefit::class, 'employee_id', 'id');
    }

    // New Method to get latest benefit or default values
    public function getLatestBenefit($cutoff = null)
    {
        $query = $this->benefits();
        
        if ($cutoff) {
            $query->where('cutoff', $cutoff);
        }
        
        return $query->latest('date_posted')->first();
    }

    // Get count of employees by status
    public static function countByStatus($status)
    {
        return self::where('JobStatus', $status)->count();
    }
    
    // Scopes for different employee statuses
    public function scopeActive($query)
    {
        return $query->where('JobStatus', 'Active');
    }
    
    public function scopeInactive($query)
    {
        return $query->where('JobStatus', 'Inactive');
    }
    
    public function scopeBlocked($query)
    {
        return $query->where('JobStatus', 'Blocked');
    }
    
    public function scopeOnLeave($query)
    {
        return $query->where('JobStatus', 'On Leave');
    }
    
    // Check if employee is active
    public function isActive()
    {
        return $this->JobStatus === 'Active';
    }
    
    // Check if employee is inactive
    public function isInactive()
    {
        return $this->JobStatus === 'Inactive';
    }
    
    // Check if employee is blocked
    public function isBlocked()
    {
        return $this->JobStatus === 'Blocked';
    }
    
    // Get employee full name
    public function getFullNameAttribute()
    {
        return "{$this->Lname}, {$this->Fname} " . ($this->MName ? $this->MName . ' ' : '') . ($this->Suffix ?: '');
    }

    public function offsetBank()
    {
        return $this->hasOne(OffsetBank::class);
    }

    // Get employee's remaining offset hours
    public function getRemainingOffsetHours()
    {
        $bank = $this->offsetBank;
        return $bank ? $bank->remaining_hours : 0;
    }

    public function department()
    {
        // Option 1: If you have a department_id foreign key
        // return $this->belongsTo(Department::class, 'department_id');
        
        // Option 2: If you're matching by department name (current setup)
        return $this->belongsTo(Department::class, 'Department', 'name');
    }

    /**
     * Get the overtime requests for the employee.
     */
    public function overtimes()
    {
        return $this->hasMany(Overtime::class);
    }

    /**
 * Get the SLVL banks for the employee.
 */
public function slvlBanks()
{
    return $this->hasMany(SLVLBank::class);
}

/**
 * Get the SLVL requests for the employee.
 */
public function slvls()
{
    return $this->hasMany(SLVL::class);
}

/**
 * Get employee's remaining sick leave days for current year.
 */
public function getRemainingSickLeaveDays($year = null)
{
    $year = $year ?? now()->year;
    $bank = $this->slvlBanks()
        ->where('leave_type', 'sick')
        ->where('year', $year)
        ->first();
    
    return $bank ? $bank->remaining_days : 0;
}

/**
 * Get employee's remaining vacation leave days for current year.
 */
public function getRemainingVacationLeaveDays($year = null)
{
    $year = $year ?? now()->year;
    $bank = $this->slvlBanks()
        ->where('leave_type', 'vacation')
        ->where('year', $year)
        ->first();
    
    return $bank ? $bank->remaining_days : 0;
}

/**
 * Get employee's total leave days taken for current year.
 */
public function getTotalLeaveDaysTaken($year = null)
{
    $year = $year ?? now()->year;
    return $this->slvls()
        ->where('status', 'approved')
        ->whereYear('start_date', $year)
        ->sum('total_days');
}

/**
 * Get employee's leave statistics.
 */
public function getLeaveStatistics($year = null)
{
    $year = $year ?? now()->year;
    
    $sickBank = $this->slvlBanks()
        ->where('leave_type', 'sick')
        ->where('year', $year)
        ->first();
        
    $vacationBank = $this->slvlBanks()
        ->where('leave_type', 'vacation')
        ->where('year', $year)
        ->first();
    
    $approvedLeaves = $this->slvls()
        ->where('status', 'approved')
        ->whereYear('start_date', $year)
        ->selectRaw('type, SUM(total_days) as total_days')
        ->groupBy('type')
        ->pluck('total_days', 'type');
    
    return [
        'sick_leave' => [
            'total' => $sickBank ? $sickBank->total_days : 0,
            'used' => $sickBank ? $sickBank->used_days : 0,
            'remaining' => $sickBank ? $sickBank->remaining_days : 0,
        ],
        'vacation_leave' => [
            'total' => $vacationBank ? $vacationBank->total_days : 0,
            'used' => $vacationBank ? $vacationBank->used_days : 0,
            'remaining' => $vacationBank ? $vacationBank->remaining_days : 0,
        ],
        'other_leaves' => [
            'emergency' => $approvedLeaves['emergency'] ?? 0,
            'bereavement' => $approvedLeaves['bereavement'] ?? 0,
            'personal' => $approvedLeaves['personal'] ?? 0,
            'maternity' => $approvedLeaves['maternity'] ?? 0,
            'paternity' => $approvedLeaves['paternity'] ?? 0,
            'study' => $approvedLeaves['study'] ?? 0,
        ],
        'total_days_taken' => $this->getTotalLeaveDaysTaken($year),
        'year' => $year,
    ];
}
}