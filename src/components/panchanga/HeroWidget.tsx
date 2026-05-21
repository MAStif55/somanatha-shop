'use client';

import React, { useState, useEffect } from 'react';
import { Moon, Star } from 'lucide-react';
import { GeoLocation, getDailyPanchanga, getMomentPanchanga } from '@/lib/astrology/calculations';
import ThreeMoon from './ThreeMoon';

type PanchangaData = ReturnType<typeof getDailyPanchanga>;

interface HeroWidgetProps {
  panchanga: PanchangaData;
  momentPanchanga?: ReturnType<typeof getMomentPanchanga>;
  location: GeoLocation;
}

export default function HeroWidget({ panchanga, momentPanchanga, location }: HeroWidgetProps) {
  const { pradosham, vara, solarMonth, lunarRashi, isArdraNakshatra, isShivaYoga, isSomvar, isBhairavaAshtami } = panchanga;
  const [now, setNow] = useState<Date | null>(null);
  const [dynamicPanchanga, setDynamicPanchanga] = useState<ReturnType<typeof getMomentPanchanga> | null>(momentPanchanga || null);
  const [use3D, setUse3D] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        setUse3D(true);
      }
    } catch (e) {
      setUse3D(false);
    }
  }, []);

  const fmtBoundary = (d: Date | null | undefined) => {
    if (!d) return '';
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      timeZone: location.timezone,
      timeZoneName: 'short'
    };
    return new Intl.DateTimeFormat('ru-RU', options).format(d).replace(' в ', ', ');
  };

  const getBoundaryParts = (d: Date | null | undefined) => {
    if (!d) return null;
    const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: location.timezone });
    const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short', timeZone: location.timezone }).replace('.', '');
    return { timeStr, dateStr };
  };

  useEffect(() => {
    const update = () => {
      const currentDate = new Date();
      setNow(currentDate);
      setDynamicPanchanga(getMomentPanchanga(currentDate, location));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [location]);

  const currentTithi = dynamicPanchanga ? dynamicPanchanga.tithi : panchanga.tithi;
  const tithiBoundaries = dynamicPanchanga ? dynamicPanchanga.tithiBoundaries : null;

  // Exact illumination: 0 = new moon, 1 = full moon
  const exactPhase = currentTithi.isShukla
    ? (currentTithi.number - 1 + currentTithi.progress) / 15
    : 1 - ((currentTithi.number - 1 + currentTithi.progress) / 15);

  const isShukla = currentTithi.isShukla;

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
        <div className="flex flex-col items-center gap-6 shrink-0 mt-2">
          <div
            className="relative w-40 h-40 md:w-72 md:h-72 rounded-full overflow-hidden bg-black"
            style={{
              boxShadow: `0 0 ${70 * exactPhase}px ${15 * exactPhase}px rgba(201,162,39,${glowOpacity})`,
            }}
          >
            {/* Real moon photo — always rendered as background/placeholder */}
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

            {/* 3D Moon layered on top (fades in when loaded) */}
            {use3D && (
              <div className="absolute inset-0 z-10">
                <ThreeMoon exactPhase={exactPhase} isShukla={isShukla} />
              </div>
            )}

            {/* Soft inner rim for 3D depth — always on top */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none z-20"
              style={{ boxShadow: 'inset 0 0 25px rgba(0,0,0,0.5)' }}
            />
          </div>

          <div className="text-center">
            <p className="text-[#C9A227] text-sm tracking-[0.25em] uppercase font-bold">{currentTithi.pakshaName}</p>
            <p className="text-[#F5ECD7]/60 text-sm mt-1.5 font-medium">Освещённость: {Math.round(exactPhase * 100)}%</p>
          </div>
        </div>

        {/* ── DATA ── */}
        <div className="flex-1 space-y-6 w-full">
          {/* Top Row: Live Clock / Date */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C9A227]/10 pb-4 gap-2">
            <span className="text-xs uppercase text-[#F5ECD7]/40 tracking-wider">Текущее время</span>
            {now && (
              <div className="text-left sm:text-right">
                <span className="text-[#F5ECD7] font-medium mr-3 text-sm">
                  {now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: location.timezone }).replace(/^[а-я]/, c => c.toUpperCase())}
                </span>
                <span className="text-[#C9A227] font-mono font-bold text-lg">
                  {now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: location.timezone })}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Column 1: Tithi Title */}
            <div>
              <h2 className="text-4xl md:text-5xl font-ornamental text-[#E8D48B] text-glow-gold leading-tight mt-1">
                {currentTithi.name}
              </h2>
              <p className="text-[#F5ECD7]/80 text-lg mt-2 font-light">
                {currentTithi.number}-е лунные сутки
              </p>
            </div>
            
            {/* Column 2: Boundaries Widget */}
            {tithiBoundaries && (() => {
              const startParts = getBoundaryParts(tithiBoundaries.start);
              const endParts = getBoundaryParts(tithiBoundaries.end);
              return (
                <div className="grid grid-cols-2 gap-4 bg-[#0D0A0B]/30 border border-[#C9A227]/15 rounded-xl p-4 transition-colors duration-500 hover:border-[#C9A227]/30">
                  {/* Начало */}
                  <div className="border-r border-[#C9A227]/10 pr-2">
                    <p className="text-[10px] text-[#C9A227] uppercase tracking-widest font-semibold mb-1">Начало</p>
                    <p className="text-2xl md:text-3xl font-extrabold font-mono text-[#FFFFFF] leading-none">
                      {startParts?.timeStr}
                    </p>
                    <p className="text-xs text-[#F5ECD7]/60 mt-2 capitalize font-medium">
                      {startParts?.dateStr}
                    </p>
                  </div>
                  {/* Окончание */}
                  <div className="pl-2">
                    <p className="text-[10px] text-[#C9A227] uppercase tracking-widest font-semibold mb-1">Окончание</p>
                    <p className="text-2xl md:text-3xl font-extrabold font-mono text-[#FFFFFF] leading-none">
                      {endParts?.timeStr}
                    </p>
                    <p className="text-xs text-[#F5ECD7]/60 mt-2 capitalize font-medium">
                      {endParts?.dateStr}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Шиваитские маркеры (если есть) */}
          {(currentTithi.isBhairavaAshtami || isArdraNakshatra || isShivaYoga || isSomvar) && (
            <div className="relative rounded-xl overflow-hidden border border-[#C9A227]/25 p-4"
                 style={{ background: 'linear-gradient(135deg, rgba(201,162,39,0.08) 0%, rgba(45,27,31,0.6) 100%)' }}>
              <div className="space-y-2">
                {isSomvar && (
                  <p className="text-[#F5ECD7]/70 text-sm">🔱 <strong className="text-[#E8D48B]">Сомавара</strong> — понедельник, день Шивы. Благоприятен для поста и пуджи.</p>
                )}
                {currentTithi.isBhairavaAshtami && (
                  <p className="text-[#F5ECD7]/70 text-sm">🔥 <strong className="text-[#E8D48B]">Калаштами</strong> (Бхайрава Аштами) — день почитания гневной формы Шивы.</p>
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

          {/* Panchanga Grid - Dynamic */}
          <div className="space-y-4 pt-4">
            <h3 className="text-[#F5ECD7]/50 text-sm md:text-base uppercase tracking-[0.2em] text-center font-bold mb-6">На небе сейчас</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Nakshatra */}
              <div className="p-5 rounded-xl border border-[#C9A227]/25 bg-[#0D0A0B]/50 backdrop-blur-md flex flex-col items-center justify-center text-center gap-2 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#C9A227]/40">
                <p className="text-[12px] md:text-[13px] text-[#C9A227] font-semibold uppercase tracking-[0.2em] mb-1">Накшатра</p>
                <p className="text-[#FFFFFF] text-xl md:text-2xl font-extrabold leading-tight">{dynamicPanchanga ? dynamicPanchanga.nakshatra.name : panchanga.nakshatra.name}</p>
                <p className="text-[#F5ECD7]/70 text-xs md:text-sm font-medium">Управитель: {dynamicPanchanga ? dynamicPanchanga.nakshatra.deity : panchanga.nakshatra.deity}</p>
                <p className="text-[#E8D48B]/90 text-xs md:text-sm mt-0.5">Луна в знаке: {dynamicPanchanga ? dynamicPanchanga.lunarRashi.fullName : lunarRashi?.fullName}</p>
                {dynamicPanchanga?.nakshatraBoundaries && (
                  <p className="text-[#F5ECD7]/40 text-[11px] font-mono mt-1">до {fmtBoundary(dynamicPanchanga.nakshatraBoundaries.end)}</p>
                )}
              </div>

              {/* Vara */}
              <div className="p-5 rounded-xl border border-[#C9A227]/25 bg-[#0D0A0B]/50 backdrop-blur-md flex flex-col items-center justify-center text-center gap-2 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#C9A227]/40">
                <p className="text-[12px] md:text-[13px] text-[#C9A227] font-semibold uppercase tracking-[0.2em] mb-1">Вара (День)</p>
                <p className="text-[#FFFFFF] text-xl md:text-2xl font-extrabold leading-tight">{dynamicPanchanga ? dynamicPanchanga.vara : vara}</p>
                <p className="text-[#E8D48B]/90 text-xs md:text-sm mt-2.5">Солнце в знаке: {dynamicPanchanga ? dynamicPanchanga.solarMonth.fullName : solarMonth.fullName}</p>
              </div>

              {/* Yoga */}
              <div className="p-5 rounded-xl border border-[#C9A227]/25 bg-[#0D0A0B]/50 backdrop-blur-md flex flex-col items-center justify-center text-center gap-2 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#C9A227]/40">
                <p className="text-[12px] md:text-[13px] text-[#C9A227] font-semibold uppercase tracking-[0.2em] mb-1">Йога</p>
                <p className="text-[#FFFFFF] text-xl md:text-2xl font-extrabold leading-tight flex items-center justify-center gap-2">
                  {dynamicPanchanga ? dynamicPanchanga.yoga.name : panchanga.yoga.name}
                </p>
                {(dynamicPanchanga ? dynamicPanchanga.yoga.isShivaYoga : panchanga.yoga.isShivaYoga) && (
                  <span className="text-[#C9A227] text-[10px] bg-[#C9A227]/10 px-2 py-0.5 rounded-full mt-1 border border-[#C9A227]/20 font-medium">🕉 Шива-йога</span>
                )}
              </div>

              {/* Karana */}
              <div className="p-5 rounded-xl border border-[#C9A227]/25 bg-[#0D0A0B]/50 backdrop-blur-md flex flex-col items-center justify-center text-center gap-2 transition-all duration-500 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:border-[#C9A227]/40">
                <p className="text-[12px] md:text-[13px] text-[#C9A227] font-semibold uppercase tracking-[0.2em] mb-1">Карана</p>
                <p className="text-[#FFFFFF] text-xl md:text-2xl font-extrabold leading-tight flex items-center justify-center gap-2">
                  {dynamicPanchanga ? dynamicPanchanga.karana.name : panchanga.karana.name}
                </p>
                <p className="text-[#F5ECD7]/70 text-xs md:text-sm font-medium">Управитель: {dynamicPanchanga ? dynamicPanchanga.karana.deity : panchanga.karana.deity}</p>
                {(dynamicPanchanga ? dynamicPanchanga.karana.isVishti : panchanga.karana.isVishti) && (
                  <span className="text-red-400 text-[10px] bg-red-400/10 px-2 py-0.5 rounded-full mt-1 border border-red-400/20 font-medium">⚠ Неблагоприятно</span>
                )}
              </div>
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
