<?php 

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FetchLogsRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'device_ip' => 'required|ip'
        ];
    }
}