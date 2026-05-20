import React from 'react';
import { Calendar, MoonStar } from 'lucide-react';
import { GeoLocation, getUpcomingEvents } from '@/lib/astrology/calculations';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface UpcomingEventsProps {
  location: GeoLocation;
}

export default function UpcomingEvents({ location }: UpcomingEventsProps) {
  const now = new Date();
  const events = getUpcomingEvents(now, 30, location);

  if (events.length === 0) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#C9A227]/15"
         style={{ background: 'linear-gradient(135deg, #2D1B1F 0%, #1A1517 50%, #23141a 100%)' }}>
      
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-32 rounded-full bg-[#C9A227] opacity-5 blur-[60px] pointer-events-none" />

      {/* Header */}
      <div className="px-6 py-5 border-b border-[#C9A227]/10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/20 flex items-center justify-center">
          <Calendar className="w-4 h-4 text-[#C9A227]" />
        </div>
        <h3 className="text-[#E8D48B] font-semibold tracking-wider uppercase text-sm">Ближайшие события</h3>
      </div>

      <div className="divide-y divide-[#C9A227]/5">
        {events.map((event, idx) => (
          <div
            key={idx}
            className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-[#C9A227]/5 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
                event.type === 'pradosham'
                  ? 'bg-[#C9A227]/10 border-[#C9A227]/25'
                  : 'bg-indigo-500/10 border-indigo-400/20'
              }`}>
                {event.type === 'pradosham'
                  ? <span className="text-xl leading-none">🕉</span>
                  : <MoonStar className="w-5 h-5 text-indigo-300" />
                }
              </div>
              <div>
                <p className="font-semibold text-[#F5ECD7] text-base">{event.title}</p>
                <p className="text-[#F5ECD7]/45 text-sm capitalize mt-0.5">
                  {format(event.date, 'EEEE, d MMMM yyyy', { locale: ru })}
                </p>
              </div>
            </div>

            {event.type === 'pradosham' && event.details && (
              <div className="flex items-center gap-2 shrink-0 bg-[#0D0A0B]/50 px-3 py-2 rounded-lg border border-[#C9A227]/15">
                <span className="text-[#F5ECD7]/40 text-xs">Пуджа:</span>
                <span className="text-[#C9A227] font-mono text-sm tracking-wide">
                  {event.details.pradoshaKalaStart.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                  {' – '}
                  {event.details.pradoshaKalaEnd.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
