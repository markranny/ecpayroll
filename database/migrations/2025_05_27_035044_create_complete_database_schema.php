<?php
// Run this command to create all migrations:
// php artisan make:migration create_complete_database_schema

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. Users table (should be first due to foreign key relationships)
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->string('employee_idno')->nullable();
            $table->boolean('is_employee')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });

        // 2. Roles table
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        // 3. Permissions table
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();
        });

        // 4. Role-User pivot table
        Schema::create('role_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });

        // 5. Permission-Role pivot table
        Schema::create('permission_role', function (Blueprint $table) {
            $table->id();
            $table->foreignId('permission_id')->constrained()->onDelete('cascade');
            $table->foreignId('role_id')->constrained()->onDelete('cascade');
            $table->timestamps();
        });

        // 6. Departments table
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // 7. Lines table
        Schema::create('lines', function (Blueprint $table) {
            $table->id();
            $table->string('code');
            $table->string('name');
            $table->foreignId('department_id')->constrained()->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // 8. Sections table
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->string('code');
            $table->string('name');
            $table->foreignId('line_id')->constrained()->onDelete('cascade');
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // 9. Department Managers table
        Schema::create('department_managers', function (Blueprint $table) {
            $table->id();
            $table->string('department');
            $table->foreignId('manager_id')->constrained('users');
            $table->timestamps();
        });

        // 10. Employees table
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->string('idno')->unique();
            $table->string('bid')->nullable();
            $table->string('Lname');
            $table->string('Fname');
            $table->string('MName')->nullable();
            $table->string('Suffix')->nullable();
            $table->string('Gender');
            $table->string('EducationalAttainment')->nullable();
            $table->string('Degree')->nullable();
            $table->string('CivilStatus')->nullable();
            $table->date('Birthdate')->nullable();
            $table->string('ContactNo')->nullable();
            $table->string('Email')->nullable();
            $table->text('PresentAddress')->nullable();
            $table->text('PermanentAddress')->nullable();
            $table->string('EmerContactName')->nullable();
            $table->string('EmerContactNo')->nullable();
            $table->string('EmerRelationship')->nullable();
            $table->string('EmpStatus')->nullable();
            $table->string('JobStatus');
            $table->string('RankFile')->nullable();
            $table->string('Department')->nullable();
            $table->string('Line')->nullable();
            $table->string('Jobtitle')->nullable();
            $table->date('HiredDate')->nullable();
            $table->date('EndOfContract')->nullable();
            $table->string('pay_type')->nullable();
            $table->decimal('payrate', 10, 2)->nullable();
            $table->decimal('pay_allowance', 10, 2)->nullable();
            $table->string('SSSNO')->nullable();
            $table->string('PHILHEALTHNo')->nullable();
            $table->string('HDMFNo')->nullable();
            $table->string('TaxNo')->nullable();
            $table->boolean('Taxable')->default(true);
            $table->string('CostCenter')->nullable();
            $table->timestamps();
        });

        // 11. Biometric Devices table
        Schema::create('biometric_devices', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('ip_address');
            $table->integer('port');
            $table->string('location')->nullable();
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable();
            $table->datetime('last_sync')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();
        });

        // 12. Biometric Logs table
        Schema::create('biometriclogs', function (Blueprint $table) {
            $table->id();
            $table->string('idno');
            $table->datetime('punch_time');
            $table->integer('punch_state');
            $table->string('device_ip')->nullable();
            $table->boolean('processed')->default(false);
            $table->boolean('is_wrong_punch')->default(false);
            $table->timestamps();
        });

        // 13. Attendance Logs table
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('biometric_id')->nullable();
            $table->datetime('timestamp');
            $table->foreignId('device_id')->nullable()->constrained('biometric_devices');
            $table->integer('status');
            $table->integer('type');
            $table->timestamps();
        });

        // 14. Employee Upload Attendances table
        Schema::create('employee_upload_attendances', function (Blueprint $table) {
            $table->id();
            $table->string('employee_no');
            $table->date('date');
            $table->string('day')->nullable();
            $table->datetime('in1')->nullable();
            $table->datetime('out1')->nullable();
            $table->datetime('in2')->nullable();
            $table->datetime('out2')->nullable();
            $table->datetime('nextday')->nullable();
            $table->decimal('hours_work', 5, 2)->nullable();
            $table->timestamps();
        });

        // 15. Processed Attendances table
        Schema::create('processed_attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('attendance_date');
            $table->string('day')->nullable();
            $table->datetime('time_in')->nullable();
            $table->datetime('time_out')->nullable();
            $table->datetime('break_in')->nullable();
            $table->datetime('break_out')->nullable();
            $table->datetime('next_day_timeout')->nullable();
            $table->float('hours_worked')->nullable();
            $table->string('status')->nullable();
            $table->string('source')->nullable();
            $table->text('remarks')->nullable();
            $table->boolean('is_nightshift')->default(false);
            $table->timestamps();
        });

        // 16. Benefits table
        Schema::create('benefits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->decimal('mf_shares', 10, 2)->default(0);
            $table->decimal('mf_loan', 10, 2)->default(0);
            $table->decimal('sss_loan', 10, 2)->default(0);
            $table->decimal('hmdf_loan', 10, 2)->default(0);
            $table->decimal('hmdf_prem', 10, 2)->default(0);
            $table->decimal('sss_prem', 10, 2)->default(0);
            $table->decimal('philhealth', 10, 2)->default(0);
            $table->string('cutoff');
            $table->date('date');
            $table->date('date_posted')->nullable();
            $table->boolean('is_posted')->default(false);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // 17. Schedule Types table
        Schema::create('schedule_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 18. Time Schedules table
        Schema::create('time_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('schedule_type_id')->constrained()->onDelete('cascade');
            $table->date('effective_date');
            $table->date('end_date')->nullable();
            $table->string('current_schedule')->nullable();
            $table->string('new_schedule')->nullable();
            $table->datetime('new_start_time')->nullable();
            $table->datetime('new_end_time')->nullable();
            $table->text('reason')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // 19. Offset Types table
        Schema::create('offset_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 20. Offset Banks table
        Schema::create('offset_banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->decimal('total_hours', 8, 2)->default(0);
            $table->decimal('used_hours', 8, 2)->default(0);
            $table->decimal('remaining_hours', 8, 2)->default(0);
            $table->datetime('last_updated');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 21. Offsets table
        Schema::create('offsets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('offset_type_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->date('workday');
            $table->decimal('hours', 5, 2);
            $table->text('reason')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->boolean('is_bank_updated')->default(false);
            $table->string('transaction_type')->default('credit');
            $table->timestamps();
        });

        // 22. Overtimes table
        Schema::create('overtimes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->datetime('start_time');
            $table->datetime('end_time');
            $table->decimal('total_hours', 5, 2);
            $table->decimal('rate_multiplier', 3, 2)->default(1.25);
            $table->text('reason')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('dept_manager_id')->nullable()->constrained('users');
            $table->foreignId('dept_approved_by')->nullable()->constrained('users');
            $table->datetime('dept_approved_at')->nullable();
            $table->text('dept_remarks')->nullable();
            $table->foreignId('hrd_approved_by')->nullable()->constrained('users');
            $table->datetime('hrd_approved_at')->nullable();
            $table->text('hrd_remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // 23. SLVL table
        Schema::create('slvl', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('type');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('half_day')->default(false);
            $table->string('am_pm')->nullable();
            $table->decimal('total_days', 3, 1);
            $table->boolean('with_pay')->default(true);
            $table->text('reason')->nullable();
            $table->string('documents_path')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 24. Official Businesses table
        Schema::create('official_businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('location');
            $table->text('purpose');
            $table->boolean('with_accommodation')->default(false);
            $table->integer('total_days');
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 25. Travel Orders table
        Schema::create('travel_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->date('start_date');
            $table->date('end_date');
            $table->string('destination');
            $table->string('transportation_type')->nullable();
            $table->text('purpose');
            $table->boolean('accommodation_required')->default(false);
            $table->boolean('meal_allowance')->default(false);
            $table->text('other_expenses')->nullable();
            $table->decimal('estimated_cost', 10, 2)->nullable();
            $table->integer('total_days');
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 26. Change Off Schedules table
        Schema::create('change_off_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('original_date');
            $table->date('requested_date');
            $table->text('reason')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 27. Time Logs table
        Schema::create('time_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('log_date');
            $table->decimal('hours_worked', 5, 2);
            $table->string('start_time')->nullable();
            $table->string('end_time')->nullable();
            $table->string('task_category')->nullable();
            $table->string('task_description')->nullable();
            $table->text('task_details')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // 28. Events table
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->datetime('start_time');
            $table->datetime('end_time');
            $table->string('location')->nullable();
            $table->string('organizer')->nullable();
            $table->string('department')->nullable();
            $table->string('status')->default('scheduled');
            $table->string('event_type')->nullable();
            $table->boolean('is_public')->default(true);
            $table->string('image_url')->nullable();
            $table->string('website_url')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // 29. Event Attendees pivot table
        Schema::create('event_attendees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->onDelete('cascade');
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('attendance_status')->default('invited');
            $table->timestamps();
        });

        // 30. Meetings table
        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('agenda')->nullable();
            $table->datetime('start_time');
            $table->datetime('end_time');
            $table->string('location')->nullable();
            $table->string('organizer')->nullable();
            $table->string('department')->nullable();
            $table->string('status')->default('scheduled');
            $table->boolean('is_recurring')->default(false);
            $table->string('recurrence_pattern')->nullable();
            $table->string('meeting_link')->nullable();
            $table->timestamps();
        });

        // 31. Meeting Participants pivot table
        Schema::create('meeting_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained()->onDelete('cascade');
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('attendance_status')->default('invited');
            $table->timestamps();
        });

        // 32. Awards table
        Schema::create('awards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('award_name');
            $table->string('award_type')->nullable();
            $table->string('gift')->nullable();
            $table->decimal('cash_price', 10, 2)->nullable();
            $table->date('award_date');
            $table->text('description')->nullable();
            $table->string('photo_path')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->timestamps();
        });

        // 33. Promotions table
        Schema::create('promotions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('promotion_title');
            $table->string('previous_position')->nullable();
            $table->string('new_position');
            $table->decimal('previous_salary', 10, 2)->nullable();
            $table->decimal('new_salary', 10, 2);
            $table->date('promotion_date');
            $table->text('description')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 34. Transfers table
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('from_department')->nullable();
            $table->string('to_department');
            $table->string('from_line')->nullable();
            $table->string('to_line')->nullable();
            $table->date('transfer_date');
            $table->text('reason')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 35. Warnings table
        Schema::create('warnings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('warning_type');
            $table->string('subject');
            $table->text('warning_description');
            $table->date('warning_date');
            $table->string('document_path')->nullable();
            $table->foreignId('issued_by')->constrained('users');
            $table->date('acknowledgement_date')->nullable();
            $table->text('employee_response')->nullable();
            $table->timestamps();
        });

        // 36. Complaints table
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('complainant_id')->constrained('employees')->onDelete('cascade');
            $table->string('complaint_title');
            $table->text('complaint_description');
            $table->date('complaint_date');
            $table->string('document_path')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('assigned_to')->nullable()->constrained('users');
            $table->text('resolution')->nullable();
            $table->date('resolution_date')->nullable();
            $table->timestamps();
        });

        // 37. Resignations table
        Schema::create('resignations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->date('notice_date');
            $table->date('resignation_date');
            $table->text('reason');
            $table->string('document_path')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 38. Terminations table
        Schema::create('terminations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->string('termination_type');
            $table->date('notice_date');
            $table->date('termination_date');
            $table->text('reason');
            $table->string('document_path')->nullable();
            $table->string('status')->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->datetime('approved_at')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        // Drop tables in reverse order to avoid foreign key constraint issues
        Schema::dropIfExists('terminations');
        Schema::dropIfExists('resignations');
        Schema::dropIfExists('complaints');
        Schema::dropIfExists('warnings');
        Schema::dropIfExists('transfers');
        Schema::dropIfExists('promotions');
        Schema::dropIfExists('awards');
        Schema::dropIfExists('meeting_participants');
        Schema::dropIfExists('meetings');
        Schema::dropIfExists('event_attendees');
        Schema::dropIfExists('events');
        Schema::dropIfExists('time_logs');
        Schema::dropIfExists('change_off_schedules');
        Schema::dropIfExists('travel_orders');
        Schema::dropIfExists('official_businesses');
        Schema::dropIfExists('slvl');
        Schema::dropIfExists('overtimes');
        Schema::dropIfExists('offsets');
        Schema::dropIfExists('offset_banks');
        Schema::dropIfExists('offset_types');
        Schema::dropIfExists('time_schedules');
        Schema::dropIfExists('schedule_types');
        Schema::dropIfExists('benefits');
        Schema::dropIfExists('processed_attendances');
        Schema::dropIfExists('employee_upload_attendances');
        Schema::dropIfExists('attendance_logs');
        Schema::dropIfExists('biometriclogs');
        Schema::dropIfExists('biometric_devices');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('department_managers');
        Schema::dropIfExists('sections');
        Schema::dropIfExists('lines');
        Schema::dropIfExists('departments');
        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('role_user');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('users');
    }
};