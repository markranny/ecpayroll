<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Award extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'award_name',
        'award_type',
        'gift',
        'cash_price',
        'award_date',
        'description',
        'photo_path',
        'created_by'
    ];

    protected $casts = [
        'award_date' => 'date',
        'cash_price' => 'decimal:2'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}