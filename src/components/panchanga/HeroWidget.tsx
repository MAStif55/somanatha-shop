'use client';

import React from 'react';
import { Moon, Star } from 'lucide-react';
import { GeoLocation, getDailyPanchanga } from '@/lib/astrology/calculations';

type PanchangaData = ReturnType<typeof getDailyPanchanga>;

interface HeroWidgetProps {
  panchanga: PanchangaData;
  location: GeoLocation;
}

export default function HeroWidget({ panchanga, location }: HeroWidgetProps) {
  const { tithi, nakshatra, pradosham, yoga, karana, vara, isArdraNakshatra, isShivaYoga, isSomvar } = panchanga;

  // Exact illumination: 0 = new moon, 1 = full moon
  const exactPhase = tithi.isShukla
    ? (tithi.number - 1 + tithi.progress) / 15
    : 1 - ((tithi.number - 1 + tithi.progress) / 15);

  const isShukla = tithi.isShukla;

  // How much of the moon is DARK (0-100%)
  const darkPercent = Math.round((1 - exactPhase) * 100);

  // Glow intensity
  const glowOpacity = Math.max(0.05, exactPhase * 0.4);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#C9A227]/15 mb-6"
         style={{ background: 'linear-gradient(135deg, #2D1B1F 0%, #1A1517 50%, #23141a 100%)' }}>

      {/* Ambient glows */}
      <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-[#C9A227] opacity-5 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-48 rounded-full bg-[#8B1E3F] opacity-5 blur-[60px] pointer-events-none" />

      <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-14">

        {/* ── MOON ── */}
        <div className="flex flex-col items-center gap-4 shrink-0">
          <div
            className="relative w-36 h-36 md:w-52 md:h-52 rounded-full overflow-hidden"
            style={{
              boxShadow: `0 0 ${70 * exactPhase}px ${15 * exactPhase}px rgba(201,162,39,${glowOpacity})`,
            }}
          >
            {/* Real moon photo — scaled up 20% to eliminate black edges */}
            <img
              src="/images/full-moon.jpg"
              alt="Луна"
              className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none animate-moon-drift"
              style={{
                filter: 'brightness(1.5) contrast(1.1) saturate(0.8)',
                transform: 'scale(1.2)',
              }}
            />

            {/* Phase shadow overlay */}
            {exactPhase < 0.98 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: isShukla
                    ? `linear-gradient(to right, rgba(5,3,4,0.95) 0%, rgba(5,3,4,0.95) ${darkPercent - 15}%, rgba(5,3,4,0) ${Math.min(darkPercent + 10, 100)}%)`
                    : `linear-gradient(to left, rgba(5,3,4,0.95) 0%, rgba(5,3,4,0.95) ${darkPercent - 15}%, rgba(5,3,4,0) ${Math.min(darkPercent + 10, 100)}%)`,
                }}
              />
            )}

            {/* Soft inner rim for 3D depth */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: 'inset 0 0 25px rgba(0,0,0,0.5)' }}
            />
          </div>

          <div className="text-center">
            <p className="text-[#C9A227] text-xs tracking-[0.25em] uppercase font-semibold">{tithi.pakshaName}</p>
            <p className="text-[#F5ECD7]/40 text-xs mt-1">Освещённость: {Math.round(exactPhase * 100)}%</p>
          </div>
        </div>

        {/* ── DATA ── */}
        <div className="flex-1 space-y-6 w-full">
          <div>
            <h2 className="text-4xl md:text-5xl font-ornamental text-[#E8D48B] text-glow-gold leading-tight">
              {tithi.name}
            </h2>
            <p className="text-[#F5ECD7]/60 text-lg mt-1 font-light">
              {tithi.number}-е лунные сутки
            </p>
          </div>

          {/* Шиваитские маркеры (если есть) */}
          {(isArdraNakshatra || isShivaYoga || isSomvar) && (
            <div className="relative rounded-xl overflow-hidden border border-[#C9A227]/25 p-4"
                 style={{ background: 'linear-gradient(135deg, rgba(201,162,39,0.08) 0%, rgba(45,27,31,0.6) 100%)' }}>
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

          {/* Panchanga Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Nakshatra */}
            <div className="p-3.5 rounded-xl border border-[#C9A227]/15 bg-[#0D0A0B]/40 backdrop-blur-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <Moon className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <p className="text-[10px] text-[#F5ECD7]/50 uppercase tracking-widest mb-0.5">Накшатра</p>
                <p className="text-[#F5ECD7] text-sm font-medium">{nakshatra.name}</p>
                <p className="text-[#F5ECD7]/40 text-xs mt-0.5">{nakshatra.deity}</p>
              </div>
            </div>

            {/* Vara */}
            <div className="p-3.5 rounded-xl border border-[#C9A227]/15 bg-[#0D0A0B]/40 backdrop-blur-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <Star className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <p className="text-[10px] text-[#F5ECD7]/50 uppercase tracking-widest mb-0.5">Вара (День)</p>
                <p className="text-[#F5ECD7] text-sm font-medium">{vara}</p>
              </div>
            </div>

            {/* Yoga */}
            <div className="p-3.5 rounded-xl border border-[#C9A227]/15 bg-[#0D0A0B]/40 backdrop-blur-sm">
              <p className="text-[10px] text-[#F5ECD7]/50 uppercase tracking-widest mb-1">Йога</p>
              <p className="text-[#F5ECD7] text-sm font-medium">
                {yoga.name}
                {yoga.isShivaYoga && <span className="text-[#C9A227] ml-2 text-[10px]">🕉 Шива</span>}
              </p>
            </div>

            {/* Karana */}
            <div className="p-3.5 rounded-xl border border-[#C9A227]/15 bg-[#0D0A0B]/40 backdrop-blur-sm">
              <p className="text-[10px] text-[#F5ECD7]/50 uppercase tracking-widest mb-1">Карана</p>
              <p className="text-[#F5ECD7] text-sm font-medium">
                {karana.name}
                {karana.isVishti && <span className="text-red-400/70 ml-2 text-[10px]">⚠ Неблагоприятно</span>}
              </p>
            </div>
          </div>

          {/* Pradosham Alert */}
          {pradosham && (
            <div className="relative overflow-hidden p-4 rounded-xl border border-[#C9A227]/30"
                 style={{ background: 'linear-gradient(135deg, rgba(201,162,39,0.12) 0%, rgba(139,110,20,0.06) 100%)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#C9A227] opacity-10 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 text-[#E8D48B] mb-1">
                <span className="text-lg">🕉</span>
                <h3 className="font-semibold text-base font-ornamental">Сегодня Прадошам</h3>
              </div>
              <p className="text-[#F5ECD7]/60 text-xs mb-3">
                Идеальное время для пуджи и духовной практики:
              </p>
              <div className="flex items-center gap-2">
                <span className="bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] font-mono text-sm px-2.5 py-1 rounded-lg tracking-wider">
                  {pradosham.pradoshaKalaStart.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit', timeZone: location.timezone})}
                </span>
                <span className="text-[#F5ECD7]/30">—</span>
                <span className="bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] font-mono text-sm px-2.5 py-1 rounded-lg tracking-wider">
                  {pradosham.pradoshaKalaEnd.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit', timeZone: location.timezone})}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
