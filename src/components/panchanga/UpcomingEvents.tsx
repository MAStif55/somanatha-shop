import React from 'react';
import { Calendar, MoonStar } from 'lucide-react';
import { GeoLocation, getUpcomingEvents } from '@/lib/astrology/calculations';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface UpcomingEventsProps {
  location: GeoLocation;
}

export default function UpcomingEvents({ location }: UpcomingEventsProps) {
  // На сервере рассчитываем ближайшие события на 30 дней вперед
  const now = new Date();
  const events = getUpcomingEvents(now, 30, location);

  if (events.length === 0) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mt-8">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-zinc-400" />
        <h3 className="font-medium text-lg">Ближайшие события</h3>
      </div>
      
      <div className="divide-y divide-zinc-800/50">
        {events.map((event, idx) => (
          <div key={idx} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors">
            
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${event.type === 'pradosham' ? 'bg-amber-500/10 text-amber-500' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {event.type === 'pradosham' ? <span className="text-xl">🕉</span> : <MoonStar className="w-6 h-6" />}
              </div>
              <div>
                <p className="font-medium text-lg text-zinc-200">{event.title}</p>
                <p className="text-zinc-500 capitalize">
                  {format(event.date, 'EEEE, d MMMM yyyy', { locale: ru })}
                </p>
              </div>
            </div>

            {event.type === 'pradosham' && event.details && (
              <div className="bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800 text-sm">
                <span className="text-zinc-500 mr-2">Пуджа:</span>
                <span className="text-amber-400 font-mono">
                  {event.details.pradoshaKalaStart.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})} - {event.details.pradoshaKalaEnd.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            )}
            
          </div>
        ))}
      </div>
    </div>
  );
}
