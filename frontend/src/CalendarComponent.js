import React, { useState } from 'react';
import {
  Calendar,
  dateFnsLocalizer
} from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const events = [
  {
    id: 1,
    title: 'Team Meeting',
    start: new Date(2025, 10, 3, 10, 0),
    end: new Date(2025, 10, 3, 11, 0),
  },
];

export default function CalendarComponent() {
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());

  return (
    <div style={{ height: '80vh', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>My Calendar</h2>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        date={date}
        onNavigate={(newDate) => setDate(newDate)}
        view={view}
        onView={(newView) => setView(newView)}
        style={{ height: '100%' }}
      />
    </div>
  );
}
