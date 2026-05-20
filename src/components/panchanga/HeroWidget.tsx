'use client';

import React from 'react';
import { Moon } from 'lucide-react';
import { GeoLocation } from '@/lib/astrology/calculations';

interface HeroWidgetProps {
  tithi: {
    number: number;
    name: string;
    isShukla: boolean;
    pakshaName: string;
    progress: number;
  };
  nakshatra: {
    name: string;
    progress: number;
  };
  pradosham: {
    pradoshaKalaStart: Date;
    pradoshaKalaEnd: Date;
  } | null;
  location: GeoLocation;
}

export default function HeroWidget({ tithi, nakshatra, pradosham, location }: HeroWidgetProps) {
  // Exact phase: 0=new moon, 1=full moon
  const exactPhase = tithi.isShukla
    ? (tithi.number - 1 + tithi.progress) / 15
    : 1 - ((tithi.number - 1 + tithi.progress) / 15);

  // Terminator x position as % from left for phase overlay
  // At exactPhase=0 (new): terminator at 0% (all dark)
  // At exactPhase=0.5 (half): terminator at 50% (half lit)
  // At exactPhase=1 (full): terminator at 100% (all lit)
  // For Shukla (waxing) lit is on RIGHT; for Krishna (waning) lit is on LEFT
  const litPercent = Math.round(exactPhase * 100);
  // The "dark half" covers the opposite side from the lit crescent
  const isShukla = tithi.isShukla;

  // Terminator position from the dark edge, as percent of diameter
  const terminatorX = litPercent; // 0–100%

  const glowOpacity = Math.max(0.05, exactPhase * 0.35);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#C9A227]/15"
         style={{ background: 'linear-gradient(135deg, #2D1B1F 0%, #1A1517 50%, #23141a 100%)' }}>
      
      {/* Ambient top-right glow */}
      <div className="absolute -top-10 -right-10 w-64 h-64 rounded-full bg-[#C9A227] opacity-5 blur-[80px] pointer-events-none" />
      {/* Subtle bottom-left fill */}
      <div className="absolute bottom-0 left-0 w-96 h-48 rounded-full bg-[#8B1E3F] opacity-5 blur-[60px] pointer-events-none" />

      <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 md:gap-14">
        {/* ── MOON ── */}
        <div className="flex flex-col items-center gap-4 shrink-0">
          <div
            className="relative w-36 h-36 md:w-52 md:h-52 rounded-full overflow-hidden transition-all duration-1000"
            style={{
              boxShadow: `0 0 ${60 * exactPhase}px ${12 * exactPhase}px rgba(201,162,39,${glowOpacity})`,
            }}
          >
            {/* Real moon photo */}
            <img
              src="/images/full-moon.jpg"
              alt="Луна"
              className="w-full h-full object-cover select-none pointer-events-none"
              style={{ filter: 'brightness(1.4) contrast(1.05) saturate(0.85)' }}
            />

            {/* Phase shadow: dark overlay clipped to the unlit side */}
            {exactPhase < 0.99 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  // For Shukla (waxing): lit on RIGHT, dark covers LEFT.
                  // For Krishna (waning): lit on LEFT, dark covers RIGHT.
                  // Terminator x-position from the dark edge = litPercent%
                  // We clip the rect [0,0 -> terminatorX%,100%] and keep dark on the other side.
                  // Simpler: use background linear-gradient to split dark/light
                  background: isShukla
                    ? `linear-gradient(to right, rgba(0,0,0,0.93) ${terminatorX}%, rgba(0,0,0,0) ${Math.min(terminatorX + 25, 100)}%)`
                    : `linear-gradient(to left, rgba(0,0,0,0.93) ${terminatorX}%, rgba(0,0,0,0) ${Math.min(terminatorX + 25, 100)}%)`,
                }}
              />
            )}

            {/* Inner rim shadow for depth */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)' }}
            />
          </div>

          <div className="text-center">
            <p className="text-[#C9A227] text-xs tracking-[0.25em] uppercase font-semibold">{tithi.pakshaName}</p>
            <p className="text-[#F5ECD7]/40 text-xs mt-1">Освещённость: {Math.round(exactPhase * 100)}%</p>
          </div>
        </div>

        {/* ── DATA ── */}
        <div className="flex-1 space-y-5 w-full">
          <div>
            <h2 className="text-4xl md:text-5xl font-ornamental text-[#E8D48B] text-glow-gold leading-tight">
              {tithi.name}
            </h2>
            <p className="text-[#F5ECD7]/60 text-lg mt-1 font-light">
              {tithi.number}-е лунные сутки
            </p>
          </div>

          {/* Nakshatra card */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[#C9A227]/15 bg-[#0D0A0B]/40 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <p className="text-[11px] text-[#F5ECD7]/50 uppercase tracking-widest mb-0.5">Накшатра (Созвездие Луны)</p>
              <p className="text-[#F5ECD7] text-lg font-medium">{nakshatra.name}</p>
            </div>
          </div>

          {/* Pradosham Alert */}
          {pradosham && (
            <div className="relative overflow-hidden p-5 rounded-xl border border-[#C9A227]/30"
                 style={{ background: 'linear-gradient(135deg, rgba(201,162,39,0.12) 0%, rgba(139,110,20,0.06) 100%)' }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#C9A227] opacity-10 blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 text-[#E8D48B] mb-2">
                <span className="text-xl">🕉</span>
                <h3 className="font-semibold text-lg font-ornamental">Сегодня Прадошам</h3>
              </div>
              <p className="text-[#F5ECD7]/60 text-sm mb-3">
                Идеальное время для пуджи и духовной практики (Прадоша Кала):
              </p>
              <div className="flex items-center gap-3">
                <span className="bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] font-mono text-lg px-3 py-1.5 rounded-lg tracking-wider">
                  {pradosham.pradoshaKalaStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
                <span className="text-[#F5ECD7]/30">—</span>
                <span className="bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] font-mono text-lg px-3 py-1.5 rounded-lg tracking-wider">
                  {pradosham.pradoshaKalaEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
