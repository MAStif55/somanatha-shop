import React from 'react';
import { Calendar, MoonStar, Sun, Sparkles } from 'lucide-react';
import { GeoLocation, getUpcomingEvents } from '@/lib/astrology/calculations';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface UpcomingEventsProps {
  location: GeoLocation;
}

const eventStyles: Record<string, { icon: React.ReactNode; bg: string; border: string }> = {
  pradosham:          { icon: <span className="text-xl leading-none">🕉</span>, bg: 'bg-[#C9A227]/10', border: 'border-[#C9A227]/25' },
  shivaratri:         { icon: <span className="text-xl leading-none">🕉</span>, bg: 'bg-[#C9A227]/10', border: 'border-[#C9A227]/25' },
  somavati_amavasya:  { icon: <span className="text-xl leading-none">🕉</span>, bg: 'bg-[#C9A227]/10', border: 'border-[#C9A227]/25' },
  ekadashi:           { icon: <Sparkles className="w-5 h-5 text-emerald-400" />, bg: 'bg-emerald-500/10', border: 'border-emerald-400/20' },
  purnima:            { icon: <Sun className="w-5 h-5 text-amber-300" />, bg: 'bg-amber-500/10', border: 'border-amber-400/20' },
  amavasya:           { icon: <MoonStar className="w-5 h-5 text-indigo-300" />, bg: 'bg-indigo-500/10', border: 'border-indigo-400/20' },
  chaturthi:          { icon: <span className="text-xl leading-none">🐘</span>, bg: 'bg-orange-500/10', border: 'border-orange-400/20' },
};

const importanceBadge: Record<string, string> = {
  high: 'bg-[#C9A227]/15 text-[#C9A227] border-[#C9A227]/30',
  medium: 'bg-[#F5ECD7]/5 text-[#F5ECD7]/50 border-[#F5ECD7]/10',
  low: '',
};

export default function UpcomingEvents({ location }: UpcomingEventsProps) {
  const now = new Date();
  const events = getUpcomingEvents(now, 45, location);

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
        {events.map((event, idx) => {
          const style = eventStyles[event.type] || eventStyles['amavasya'];
          return (
            <div
              key={idx}
              className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-[#C9A227]/5 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${style.bg} ${style.border}`}>
                  {style.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#F5ECD7] text-base">{event.title}</p>
                    {event.importance === 'high' && (
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${importanceBadge.high}`}>
                        Важно
                      </span>
                    )}
                  </div>
                  <p className="text-[#F5ECD7]/40 text-sm capitalize mt-0.5">
                    {format(event.date, 'EEEE, d MMMM yyyy', { locale: ru })}
                  </p>
                  <p className="text-[#F5ECD7]/30 text-xs mt-1 max-w-md">{event.description}</p>
                </div>
              </div>

              {event.type === 'pradosham' && event.details && (
                <div className="flex items-center gap-2 shrink-0 bg-[#0D0A0B]/50 px-3 py-2 rounded-lg border border-[#C9A227]/15 ml-auto">
                  <span className="text-[#F5ECD7]/40 text-xs">Пуджа:</span>
                  <span className="text-[#C9A227] font-mono text-sm tracking-wide">
                    {event.details.pradoshaKalaStart.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit', timeZone: location.timezone})}
                    {' – '}
                    {event.details.pradoshaKalaEnd.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit', timeZone: location.timezone})}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
