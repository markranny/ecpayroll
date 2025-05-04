<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'employee_idno',
        'is_employee',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_employee' => 'boolean',
    ];

    /**
     * Get the roles associated with the user.
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    /**
     * Check if the user has a specific role.
     */
    public function hasRole($role)
    {
        // If checking with a string (slug or name)
        if (is_string($role)) {
            return $this->roles->contains('slug', $role) || $this->roles->contains('name', $role);
        }
        
        // If checking with a collection of roles
        return $role->intersect($this->roles)->count() > 0;
    }

    /**
     * Get the slug of the user's primary role.
     */
    public function getRoleSlug()
    {
        $role = $this->roles->first();
        
        if (!$role) {
            // Check if user is a department manager in the database
            if (DepartmentManager::where('manager_id', $this->id)->exists()) {
                return 'department_manager';
            }
            
            // Check if user is an employee
            if ($this->employee_idno || $this->is_employee) {
                return 'employee';
            }
            
            return null;
        }
        
        return $role->slug;
    }

    /**
     * Get the employee associated with the user.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_idno', 'idno');
    }

    /**
     * Get departments managed by this user
     */
    public function managedDepartments()
    {
        return $this->hasMany(DepartmentManager::class, 'manager_id');
    }
}