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
}