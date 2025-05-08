<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get the lines associated with the department.
     */
    public function lines()
    {
        return $this->hasMany(Line::class);
    }

    /**
     * Get the user who created the department.
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated the department.
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}