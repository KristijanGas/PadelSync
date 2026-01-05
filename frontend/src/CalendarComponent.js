import React, { useState, useEffect } from 'react';
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

export default function CalendarComponent() {
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  
  const rootEl = document.getElementById('root');
  const terrainId = rootEl?.dataset?.terrainId;
  useEffect(() => {
    if (!terrainId) {
      return;
    }
    async function fetchMatches() {
      try {
        const res = await fetch(`http://localhost:3000/terrain/${terrainId}/matches`, {
          credentials: "include"
        });
        if (!res.ok) {
          throw new Error("Failed to fetch matches");
        }
        let termini = await res.json();
        let formattedEvents = [];
        for (let termin of termini) {
          const tempDatum = termin.date;
          const dijeloviDatuma = tempDatum.split("-");

          const tempVrPoc = termin.vrijemePocetak;
          const tempVrKr = termin.vrijemeKraj;
          const dijeloviPoc = tempVrPoc.split(":");
          const dijeloviKr = tempVrKr.split(":");
          if(dijeloviPoc[0].at(0) == "0") {
            dijeloviPoc[0]= parseInt(dijeloviPoc[0].at(1));
          }
          if(dijeloviPoc[1]=="00") {
            dijeloviPoc[1] = 0;
          }
          if(dijeloviKr[0].at(0) == "0") {
            dijeloviKr[0]= parseInt(dijeloviKr[0].at(1));
          }
          if(dijeloviKr[1]=="00") {
            dijeloviKr[1] = 0;
          }
          const formattedTermin = {
            id: termin.terminID,
            title: "Termin",
            start: new Date(dijeloviDatuma[0], dijeloviDatuma[1], dijeloviDatuma[2], dijeloviPoc[0], dijeloviPoc[1]),
            end: new Date(dijeloviDatuma[0], dijeloviDatuma[1], dijeloviDatuma[2], dijeloviKr[0], dijeloviKr[1])
          };
          formattedEvents.push(formattedTermin);
        }
        setEvents(formattedEvents);
      } catch (err) {
        console.error(err);
      }
    }
    fetchMatches();
  }, [terrainId]);

  return (
    <div style={{ height: '80vh', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Termini za ovaj tjedan</h2>
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
