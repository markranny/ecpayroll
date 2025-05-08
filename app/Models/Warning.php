<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Warning extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'warning_type',
        'subject',
        'warning_description',
        'warning_date',
        'document_path',
        'issued_by',
        'acknowledgement_date',
        'employee_response'
    ];

    protected $casts = [
        'warning_date' => 'date',
        'acknowledgement_date' => 'date'
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function issuer()
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}