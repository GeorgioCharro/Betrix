import { addDays } from 'date-fns';

import { Calendar } from './calendar';
import { Card, CardContent } from './card';

const start = new Date(2025, 5, 5);

export function CardsCalendar(): JSX.Element {
  return (
    <Card className="hidden max-w-[260px] p-0 sm:flex">
      <CardContent className="p-0">
        <Calendar
          defaultMonth={start}
          mode="range"
          numberOfMonths={1}
          selected={{
            from: start,
            to: addDays(start, 8),
          }}
        />
      </CardContent>
    </Card>
  );
}
