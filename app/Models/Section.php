<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;
    
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'code',
        'name',
        'line_id',
        'is_active',
        'created_by',
        'updated_by',
    ];
    
    /**
     * The attributes that should be cast.
     *
     * @var array
     */
    protected $casts = [
        'is_active' => 'boolean',
    ];
    
    /**
     * Get the line that the section belongs to.
     */
    public function line()
    {
        return $this->belongsTo(Line::class);
    }
    
    /**
     * Get the department through the line relationship.
     */
    public function department()
    {
        return $this->hasOneThrough(
            Department::class,
            Line::class,
            'id', // Foreign key on the lines table...
            'id', // Foreign key on the departments table...
            'line_id', // Local key on the sections table...
            'department_id' // Local key on the lines table...
        );
    }
    
    /**
     * Get the user who created the section.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
    
    /**
     * Get the user who last updated the section.
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
    
    /**
     * Get employees associated with this section.
     * Note: This relationship assumes you have a way to 
     * associate employees with sections.
     */
    public function employees()
    {
        // This is a placeholder. You'll need to adjust this 
        // based on how your employee model links to sections.
        // Example implementation if you have a section_id in your employees table:
        // return $this->hasMany(Employee::class);
        
        // Current implementation assumes there's no direct link:
        return $this->hasMany(Employee::class, 'section_id');
    }
}