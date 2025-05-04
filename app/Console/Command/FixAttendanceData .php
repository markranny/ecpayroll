<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\ProcessedAttendance;
use App\Models\Employee;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class FixAttendanceData extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:fix {--employee_id= : Fix records for a specific employee} {--date= : Fix records for a specific date} {--dry-run : Preview changes without applying them}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fix issues in attendance data like NULLs and incorrect time fields';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $dryRun = $this->option('dry-run');
        $employeeId = $this->option('employee_id');
        $date = $this->option('date');

        if ($dryRun) {
            $this->info('Running in dry-run mode - no changes will be made');
        }

        // Build query based on options
        $query = ProcessedAttendance::query();
        
        if ($employeeId) {
            $query->where('employee_id', $employeeId);
        }
        
        if ($date) {
            $query->whereDate('attendance_date', $date);
        }

        $totalRecords = $query->count();
        $this->info("Found {$totalRecords} attendance records to process");

        if ($totalRecords === 0) {
            $this->info("No records to process. Try adjusting your filters.");
            return 0;
        }

        // Get all records to process
        $records = $query->get();
        
        $fixedCount = 0;
        $errorCount = 0;

        DB::beginTransaction();
        
        try {
            foreach ($records as $record) {
                $this->info("Processing record ID: {$record->id}, Date: {$record->attendance_date}");
                
                $needsUpdate = false;
                $changes = [];
                
                // Check for next_day_timeout that should be enabled by is_nightshift
                if ($record->next_day_timeout && !$record->is_nightshift) {
                    $changes[] = "Setting is_nightshift to true";
                    if (!$dryRun) {
                        $record->is_nightshift = true;
                    }
                    $needsUpdate = true;
                }
                
                // Check if is_nightshift is true but no next_day_timeout
                if ($record->is_nightshift && !$record->next_day_timeout && $record->time_out) {
                    $changes[] = "Moving time_out to next_day_timeout";
                    if (!$dryRun) {
                        // Take time_out and create next_day_timeout
                        $timeOutDate = Carbon::parse($record->time_out);
                        $record->next_day_timeout = Carbon::parse($record->attendance_date)
                            ->addDay()
                            ->setHour($timeOutDate->hour)
                            ->setMinute($timeOutDate->minute)
                            ->setSecond($timeOutDate->second);
                        $record->time_out = null;
                    }
                    $needsUpdate = true;
                }
                
                // Recalculate hours_worked if it's null or zero but we have time data
                if (($record->hours_worked === null || $record->hours_worked == 0) && 
                    (($record->time_in && $record->time_out) || ($record->time_in && $record->next_day_timeout))) {
                    $start = Carbon::parse($record->time_in);
                    $end = $record->is_nightshift ? Carbon::parse($record->next_day_timeout) : Carbon::parse($record->time_out);
                    
                    if ($start && $end) {
                        $totalMinutes = $end->diffInMinutes($start);
                        
                        // Subtract break time if both break in and out are set
                        if ($record->break_in && $record->break_out) {
                            $breakStart = Carbon::parse($record->break_in);
                            $breakEnd = Carbon::parse($record->break_out);
                            $breakMinutes = $breakEnd->diffInMinutes($breakStart);
                            $totalMinutes -= $breakMinutes;
                        }
                        
                        $newHoursWorked = $totalMinutes / 60;
                        $changes[] = "Recalculating hours_worked from {$record->hours_worked} to {$newHoursWorked}";
                        
                        if (!$dryRun) {
                            $record->hours_worked = $newHoursWorked;
                        }
                        $needsUpdate = true;
                    }
                }
                
                // Check for records with hours_worked but missing time_in or time_out
                // and update the source to indicate it's been fixed
                if ($needsUpdate && !$dryRun) {
                    $record->source = 'fixed_import';
                    $record->save();
                    $fixedCount++;
                    
                    $this->info("Fixed record {$record->id} - " . implode(", ", $changes));
                } else if ($needsUpdate) {
                    $this->info("Would fix record {$record->id} - " . implode(", ", $changes));
                    $fixedCount++;
                } else {
                    $this->line("No issues found with record {$record->id}");
                }
            }
            
            if (!$dryRun) {
                DB::commit();
                $this->info("Successfully fixed {$fixedCount} records");
            } else {
                DB::rollBack();
                $this->info("Dry run complete - would have fixed {$fixedCount} records");
            }
            
        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("Error fixing attendance records: " . $e->getMessage());
            Log::error("Error in FixAttendanceData command: " . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return 1;
        }

        return 0;
    }
}