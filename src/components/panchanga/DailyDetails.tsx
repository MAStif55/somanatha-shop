import React from 'react';
import { Sunrise, Sunset, Clock, AlertTriangle, Sparkles, Star } from 'lucide-react';
import { getDailyPanchanga, GeoLocation } from '@/lib/astrology/calculations';

type PanchangaData = ReturnType<typeof getDailyPanchanga>;

function fmt(d: Date | null, timeZone?: string): string {
  if (!d) return '—';
  try {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone });
  } catch (e) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
}

export default function DailyDetails({ panchanga, location }: { panchanga: PanchangaData; location: GeoLocation }) {
  const { yoga, karana, vara, sunTimes, brahmaMuhurta, nishitaKala, rahuKala, yamagandam, isArdraNakshatra, isShivaYoga, isSomvar } = panchanga;
  const tz = location.timezone;

  return (
    <div className="space-y-6">

      {/* ── Шиваитские маркеры ── */}
      {(isArdraNakshatra || isShivaYoga || isSomvar) && (
        <div className="relative rounded-2xl overflow-hidden border border-[#C9A227]/25 p-5"
             style={{ background: 'linear-gradient(135deg, rgba(201,162,39,0.08) 0%, rgba(45,27,31,0.9) 100%)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-[#C9A227] opacity-10 blur-3xl pointer-events-none" />
          <h3 className="text-[#E8D48B] font-semibold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>🕉</span> Особые знаки для шиваитов
          </h3>
          <div className="space-y-2">
            {isSomvar && (
              <p className="text-[#F5ECD7]/70 text-sm">🔱 <strong className="text-[#E8D48B]">Сомавара</strong> — понедельник, день Шивы. Благоприятен для поста и пуджи.</p>
            )}
            {isArdraNakshatra && (
              <p className="text-[#F5ECD7]/70 text-sm">⭐ Луна в накшатре <strong className="text-[#E8D48B]">Ардра</strong> — управитель Рудра (Шива). Мощный день для абхишеки.</p>
            )}
            {isShivaYoga && (
              <p className="text-[#F5ECD7]/70 text-sm">✨ Сегодня <strong className="text-[#E8D48B]">Шива-йога</strong> — особое астрономическое сочетание, посвящённое Шиве.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Полная Панчанга (5 ветвей) ── */}
      <div className="relative rounded-2xl overflow-hidden border border-[#C9A227]/15"
           style={{ background: 'linear-gradient(135deg, #2D1B1F 0%, #1A1517 50%, #23141a 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-32 rounded-full bg-[#C9A227] opacity-5 blur-[60px] pointer-events-none" />

        <div className="px-6 py-5 border-b border-[#C9A227]/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-[#C9A227]" />
          </div>
          <h3 className="text-[#E8D48B] font-semibold tracking-wider uppercase text-sm">Панчанга на сегодня</h3>
          <span className="text-[#F5ECD7]/30 text-xs ml-auto">(пять ветвей)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#C9A227]/5">
          {/* Вара */}
          <div className="px-5 py-4 bg-[#1A1517]/80">
            <p className="text-[10px] text-[#F5ECD7]/40 uppercase tracking-widest mb-1">Вара (День)</p>
            <p className="text-[#F5ECD7] font-medium">{vara}</p>
          </div>

          {/* Йога */}
          <div className="px-5 py-4 bg-[#1A1517]/80">
            <p className="text-[10px] text-[#F5ECD7]/40 uppercase tracking-widest mb-1">Йога</p>
            <p className="text-[#F5ECD7] font-medium">
              {yoga.name}
              {yoga.isShivaYoga && <span className="text-[#C9A227] ml-2 text-xs">🕉 Шива</span>}
            </p>
          </div>

          {/* Карана */}
          <div className="px-5 py-4 bg-[#1A1517]/80">
            <p className="text-[10px] text-[#F5ECD7]/40 uppercase tracking-widest mb-1">Карана</p>
            <p className="text-[#F5ECD7] font-medium">
              {karana.name}
              {karana.isVishti && <span className="text-red-400/70 ml-2 text-xs">⚠ неблагоприятная</span>}
            </p>
          </div>

          {/* Накшатра — управитель */}
          <div className="px-5 py-4 bg-[#1A1517]/80">
            <p className="text-[10px] text-[#F5ECD7]/40 uppercase tracking-widest mb-1">Управитель накшатры</p>
            <p className="text-[#F5ECD7] font-medium">
              {panchanga.nakshatra.deity}
              {isArdraNakshatra && <span className="text-[#C9A227] ml-2 text-xs">🔱</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Мухурты и временные окна ── */}
      <div className="relative rounded-2xl overflow-hidden border border-[#C9A227]/15"
           style={{ background: 'linear-gradient(135deg, #2D1B1F 0%, #1A1517 50%, #23141a 100%)' }}>
        <div className="absolute top-0 right-0 w-64 h-32 rounded-full bg-[#C9A227] opacity-5 blur-[60px] pointer-events-none" />

        <div className="px-6 py-5 border-b border-[#C9A227]/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#C9A227]" />
          </div>
          <h3 className="text-[#E8D48B] font-semibold tracking-wider uppercase text-sm">Время для практик</h3>
        </div>

        <div className="divide-y divide-[#C9A227]/5">
          {/* Восход / Закат */}
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sunrise className="w-4 h-4 text-amber-400" />
              <span className="text-[#F5ECD7]/60 text-sm">Восход</span>
            </div>
            <span className="text-[#F5ECD7] font-mono text-sm">{fmt(sunTimes.sunrise, tz)}</span>
          </div>
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sunset className="w-4 h-4 text-orange-400" />
              <span className="text-[#F5ECD7]/60 text-sm">Закат</span>
            </div>
            <span className="text-[#F5ECD7] font-mono text-sm">{fmt(sunTimes.sunset, tz)}</span>
          </div>

          {/* Брахма-мухурта */}
          {brahmaMuhurta && (
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <div>
                  <span className="text-[#F5ECD7]/60 text-sm">Брахма-мухурта</span>
                  <p className="text-[#F5ECD7]/30 text-xs">Мантры и медитация</p>
                </div>
              </div>
              <span className="text-indigo-300 font-mono text-sm">{fmt(brahmaMuhurta.start, tz)} – {fmt(brahmaMuhurta.end, tz)}</span>
            </div>
          )}

          {/* Нишита Кала */}
          {nishitaKala && (
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-base">🕉</span>
                <div>
                  <span className="text-[#F5ECD7]/60 text-sm">Нишита Кала</span>
                  <p className="text-[#F5ECD7]/30 text-xs">Полночь Шивы (пуджа Махашиваратри)</p>
                </div>
              </div>
              <span className="text-[#C9A227] font-mono text-sm">{fmt(nishitaKala.start, tz)} – {fmt(nishitaKala.end, tz)}</span>
            </div>
          )}

          {/* Раху Кала */}
          {rahuKala && (
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400/60" />
                <div>
                  <span className="text-[#F5ECD7]/60 text-sm">Раху Кала</span>
                  <p className="text-[#F5ECD7]/30 text-xs">Неблагоприятный период</p>
                </div>
              </div>
              <span className="text-red-300/60 font-mono text-sm">{fmt(rahuKala.start, tz)} – {fmt(rahuKala.end, tz)}</span>
            </div>
          )}

          {/* Ямагандам */}
          {yamagandam && (
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-red-400/40" />
                <div>
                  <span className="text-[#F5ECD7]/60 text-sm">Ямагандам</span>
                  <p className="text-[#F5ECD7]/30 text-xs">Период Ямы</p>
                </div>
              </div>
              <span className="text-red-300/40 font-mono text-sm">{fmt(yamagandam.start, tz)} – {fmt(yamagandam.end, tz)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
