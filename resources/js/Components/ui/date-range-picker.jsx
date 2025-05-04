// components/ui/date-range-picker.jsx
import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { cn } from "@/lib/utils"; // You may need to create this utility

// Helper function to create a date range
const createDateRange = (start, end) => {
  if (start && end) {
    return { from: start, to: end };
  }
  if (start) {
    return { from: start, to: null };
  }
  return { from: null, to: null };
};

export function DateRangePicker({ value, onChange, className }) {
  const [date, setDate] = useState(value || { from: null, to: null });

  // Handle date selection
  const handleSelect = (newDate) => {
    const newRange = createDateRange(
      newDate.from || newDate,
      newDate.to
    );

    setDate(newRange);
    if (onChange) {
      onChange(newRange);
    }
  };

  // Format date for display
  const formatDateDisplay = () => {
    if (date?.from && date?.to) {
      return `${format(date.from, "MMM d, yyyy")} - ${format(date.to, "MMM d, yyyy")}`;
    }
    if (date?.from) {
      return `${format(date.from, "MMM d, yyyy")} - Select end date`;
    }
    return "Select date range";
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date?.from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {formatDateDisplay()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
          <div className="flex items-center justify-between p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDate({ from: null, to: null });
                onChange({ from: null, to: null });
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (date.from && date.to) {
                  onChange(date);
                }
              }}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}