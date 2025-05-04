<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\Employee;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class VerifyEmployee
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $idno = $request->input('idno');
        $email = $request->input('email');

        // Check if employee exists with matching ID and email
        $employee = Employee::where('idno', $idno)
            ->where('Email', $email)
            ->where('JobStatus', 'Active')
            ->first();

        if (!$employee) {
            Log::warning('Employee verification failed', [
                'idno' => $idno,
                'email' => $email
            ]);
            
            return back()->withErrors([
                'idno' => 'The provided employee ID and email do not match our records or the employee is not active.',
            ])->withInput();
        }

        Log::info('Employee verified successfully', [
            'idno' => $idno,
            'name' => $employee->Fname . ' ' . $employee->Lname
        ]);

        // Add the verified employee to the request for use in the controller
        $request->merge(['verified_employee' => $employee]);

        return $next($request);
    }
}