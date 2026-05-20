import React from 'react';
import { getDailyPanchanga, GeoLocation } from '@/lib/astrology/calculations';

type PanchangaData = ReturnType<typeof getDailyPanchanga>;

interface TimelineWidgetProps {
  panchanga: PanchangaData;
  location: GeoLocation;
}

// Помощник для вычисления % позиции времени на 24-часовой шкале (для часового пояса локации)
function getLocalTimePercent(d: Date | null, timeZone?: string): number | null {
  if (!d) return null;
  
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(d);
    
    let hour = 0;
    let minute = 0;
    for (const part of parts) {
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
    }
    if (hour === 24) hour = 0;
    
    return ((hour * 60) + minute) / 1440 * 100;
  } catch (e) {
    // Fallback if timezone is invalid
    const hour = d.getHours();
    const minute = d.getMinutes();
    return ((hour * 60) + minute) / 1440 * 100;
  }
}

function fmt(d: Date | null, timeZone?: string): string {
  if (!d) return '';
  try {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone });
  } catch {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
}

export default function TimelineWidget({ panchanga, location }: TimelineWidgetProps) {
  const tz = location.timezone;
  const { sunTimes, brahmaMuhurta, nishitaKala, rahuKala, yamagandam, pradosham } = panchanga;

  const sunriseP = getLocalTimePercent(sunTimes.sunrise, tz) || 25; // default 6am
  const sunsetP = getLocalTimePercent(sunTimes.sunset, tz) || 75;   // default 6pm
  const nowP = getLocalTimePercent(new Date(), tz) || 0;

  // Функция для рендера блока периода
  const renderPeriod = (
    start: Date | null,
    end: Date | null,
    colorClass: string,
    title: string,
    desc: string,
    icon: string
  ) => {
    if (!start || !end) return null;
    let startP = getLocalTimePercent(start, tz)!;
    let endP = getLocalTimePercent(end, tz)!;
    
    // Обработка перехода через полночь (например, Нишита Кала или Прадош)
    const wraps = endP < startP;
    
    const blocks = [];
    if (wraps) {
      // Блок от startP до конца
      blocks.push({ left: startP, width: 100 - startP });
      // Блок от начала до endP
      blocks.push({ left: 0, width: endP });
    } else {
      blocks.push({ left: startP, width: endP - startP });
    }

    return blocks.map((block, idx) => (
      <div
        key={`${title}-${idx}`}
        className={`absolute top-0 bottom-0 ${colorClass} group cursor-help transition-all hover:brightness-125 hover:z-20`}
        style={{ left: `${block.left}%`, width: `${block.width}%` }}
      >
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 p-3 rounded-xl bg-[#0D0A0B]/95 backdrop-blur-xl border border-[#C9A227]/30 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{icon}</span>
            <span className="text-[#E8D48B] font-medium text-xs tracking-wider uppercase">{title}</span>
          </div>
          <p className="text-[#F5ECD7]/60 text-[10px] mb-2 leading-relaxed">{desc}</p>
          <p className="text-[#C9A227] font-mono text-xs">
            {fmt(start, tz)} - {fmt(end, tz)}
          </p>
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0D0A0B] border-b border-r border-[#C9A227]/30 transform rotate-45"></div>
        </div>
      </div>
    ));
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#C9A227]/15 p-6 md:p-8"
         style={{ background: 'linear-gradient(135deg, #1A1517 0%, #110D0F 100%)' }}>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[#E8D48B] font-semibold tracking-wider uppercase text-sm">Таймлайн Практик</h3>
          <p className="text-[#F5ECD7]/40 text-xs mt-1">График мухурт на текущие сутки (местное время: {location.name})</p>
        </div>
      </div>

      <div className="relative w-full h-24 mt-12 mb-6">
        
        {/* Фоновый градиент дня и ночи */}
        <div className="absolute inset-x-0 top-4 bottom-4 rounded-full overflow-hidden flex shadow-inner">
          {/* Ночь до восхода */}
          <div className="h-full bg-slate-900/40" style={{ width: `${sunriseP}%` }}></div>
          {/* День */}
          <div className="h-full bg-gradient-to-r from-amber-500/10 via-amber-300/10 to-orange-500/10" style={{ width: `${sunsetP - sunriseP}%` }}></div>
          {/* Ночь после заката */}
          <div className="h-full bg-slate-900/40" style={{ width: `${100 - sunsetP}%` }}></div>
        </div>

        {/* Шкала (Background Track) */}
        <div className="absolute inset-x-0 top-4 bottom-4 rounded-full border border-white/5 pointer-events-none"></div>

        {/* Периоды */}
        <div className="absolute inset-x-0 top-4 bottom-4 rounded-full overflow-visible">
          {renderPeriod(brahmaMuhurta?.start || null, brahmaMuhurta?.end || null, 'bg-indigo-500/40 border-x border-indigo-400/50', 'Брахма-мухурта', 'Идеальное время для медитации, мантр и йоги.', '✨')}
          {renderPeriod(yamagandam?.start || null, yamagandam?.end || null, 'bg-orange-500/30 border-x border-orange-500/50', 'Ямагандам', 'Период, управляемый Ямой. Неблагоприятен для начала новых важных дел.', '⚠️')}
          {renderPeriod(rahuKala?.start || null, rahuKala?.end || null, 'bg-red-500/30 border-x border-red-500/50', 'Раху Кала', 'Период сильного влияния Раху. Не подходит для материальных начинаний.', '🔴')}
          {renderPeriod(nishitaKala?.start || null, nishitaKala?.end || null, 'bg-purple-600/50 border-x border-purple-400/60 shadow-[0_0_10px_rgba(147,51,234,0.3)]', 'Нишита Кала', 'Астрономическая полночь. Время проявления Шива-лингама. Важнейшая пуджа на Махашиваратри.', '🕉')}
          {pradosham && renderPeriod(pradosham.pradoshaKalaStart, pradosham.pradoshaKalaEnd, 'bg-[#C9A227]/40 border-x border-[#C9A227]/80 shadow-[0_0_15px_rgba(201,162,39,0.3)] z-10', 'Прадоша Кала', 'Священный период 1.5 часа вокруг заката для почитания Шивы.', '🔱')}
        </div>

        {/* Метки часов */}
        <div className="absolute inset-x-0 top-full mt-2 flex justify-between text-[10px] text-[#F5ECD7]/30 font-mono px-2">
          <span>00:00</span>
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>

        {/* Индикатор "Сейчас" */}
        <div 
          className="absolute top-0 bottom-0 w-px bg-white z-20 pointer-events-none"
          style={{ left: `${nowP}%` }}
        >
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white text-black font-bold text-[10px] px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]">
            СЕЙЧАС
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>
        </div>

        {/* Маркеры восхода и заката */}
        <div className="absolute top-full mt-1 flex flex-col items-center pointer-events-none" style={{ left: `${sunriseP}%`, transform: 'translateX(-50%)' }}>
          <div className="w-0.5 h-1.5 bg-amber-500/50 mb-1"></div>
          <span className="text-[9px] text-amber-500/70">{fmt(sunTimes.sunrise, tz)}</span>
        </div>
        <div className="absolute top-full mt-1 flex flex-col items-center pointer-events-none" style={{ left: `${sunsetP}%`, transform: 'translateX(-50%)' }}>
          <div className="w-0.5 h-1.5 bg-orange-500/50 mb-1"></div>
          <span className="text-[9px] text-orange-500/70">{fmt(sunTimes.sunset, tz)}</span>
        </div>

      </div>

      <div className="mt-8 pt-4 border-t border-[#C9A227]/10 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-indigo-500/40 border border-indigo-400/50"></div>
          <span className="text-[#F5ECD7]/50">Брахма-мухурта</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-purple-600/50 border border-purple-400/60"></div>
          <span className="text-[#F5ECD7]/50">Нишита Кала</span>
        </div>
        {pradosham && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#C9A227]/40 border border-[#C9A227]/80"></div>
            <span className="text-[#F5ECD7]/50">Прадошам</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="w-3 h-3 rounded bg-red-500/30 border border-red-500/50"></div>
          <span className="text-[#F5ECD7]/50">Раху Кала</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/50"></div>
          <span className="text-[#F5ECD7]/50">Ямагандам</span>
        </div>
      </div>
    </div>
  );
}
