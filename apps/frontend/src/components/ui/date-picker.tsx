import { ChevronDownIcon } from 'lucide-react';
import * as React from 'react';

import { Button } from './button';
import { Calendar } from './calendar';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface DatePickerProps {
  id: string;
  label: string;
  date: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

export function DatePicker({
  id,
  label,
  date,
  onChange,
}: DatePickerProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Label className="px-1" htmlFor={id}>
        {label}
      </Label>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            className="w-48 justify-between font-normal"
            id={id}
            variant="outline"
          >
            {date ? date.toLocaleDateString() : 'Select date'}
            <ChevronDownIcon className="ml-2 size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto overflow-hidden p-0">
          <Calendar
            captionLayout="dropdown"
            mode="single"
            onSelect={(d): void => {
              onChange(d);
              setOpen(false);
            }}
            selected={date}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
