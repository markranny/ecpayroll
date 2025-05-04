<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DepartmentManager extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'department_managers';

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'department',
        'manager_id'
    ];

    /**
     * Get the user that is assigned as the department manager.
     */
    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Get overtimes pending approval for this department and manager.
     */
    public function pendingOvertimes()
    {
        return Overtime::where('status', 'pending')
            ->where('dept_manager_id', $this->manager_id)
            ->orWhereHas('employee', function($query) {
                $query->where('Department', $this->department);
            });
    }

    /**
     * Get employees in this department.
     */
    public function employees()
    {
        return Employee::where('Department', $this->department);
    }
}