<?php

use App\Http\Middleware\CheckRole;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Register role middleware with an alias 
        $middleware->alias([
            'role' => CheckRole::class,
        ]);

        // Add role middleware to web group for auth routes
        $middleware->web(append: [
            // You can add global web middleware here if needed
        ]);

        // Define custom middleware groups
        $middleware->appendToGroup('auth-manager', [
            CheckRole::class.':department_manager,superadmin', // This allows either role
        ]);

        $middleware->appendToGroup('auth-hrd', [
            CheckRole::class.':hrd_manager,superadmin', // This allows either role
        ]);

        $middleware->appendToGroup('auth-admin', [
            CheckRole::class.':superadmin', // Only superadmin role
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Exception handling configuration
    })->create();