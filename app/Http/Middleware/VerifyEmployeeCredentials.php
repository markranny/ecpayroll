<?php

namespace App\Http\Middleware;

use App\Models\Employee;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyEmployeeCredentials
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('post')) {
            // Only process POST requests

            // Get the employee ID and email from the request
            $idno = $request->input('idno');
            $email = $request->input('email');

            // Check if they match an existing active employee
            $employee = Employee::where('idno', $idno)
                ->where('Email', $email)
                ->where('JobStatus', 'Active')
                ->first();

            if (!$employee) {
                return redirect()->back()->withErrors([
                    'idno' => 'The provided employee ID and email do not match our records or the employee is not active.',
                ])->withInput();
            }
        }

        return $next($request);
    }
}