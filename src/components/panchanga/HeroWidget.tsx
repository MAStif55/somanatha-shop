'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sunrise, Sunset, Info } from 'lucide-react';
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
  // CSS для создания эффекта светящейся луны (Шукла - полная/растущая, Кришна - убывающая)
  const moonPhaseStyle = tithi.isShukla 
    ? 'bg-amber-100 shadow-[0_0_50px_10px_rgba(251,191,36,0.3)]' 
    : 'bg-zinc-800 shadow-[inset_-10px_-10px_30px_rgba(255,255,255,0.1)] border border-zinc-700';

  return (
    <div className="bg-zinc-950 text-amber-50 rounded-2xl overflow-hidden border border-zinc-800/50 relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px]"></div>
      </div>

      <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        {/* Moon Visualization */}
        <div className="flex flex-col items-center gap-4 shrink-0">
          <div className={`w-32 h-32 md:w-48 md:h-48 rounded-full transition-all duration-1000 ${moonPhaseStyle}`}>
            {/* Имитация кратеров если Луна светлая */}
            {tithi.isShukla && (
              <div className="w-full h-full rounded-full opacity-10 bg-[radial-gradient(ellipse_at_30%_30%,_rgba(0,0,0,0)_0%,_rgba(0,0,0,1)_100%)]"></div>
            )}
          </div>
          <div className="text-center">
            <p className="text-zinc-400 text-sm tracking-wider uppercase">{tithi.pakshaName}</p>
            <p className="text-xs text-zinc-500">
              Фаза: {Math.round(tithi.progress * 100)}%
            </p>
          </div>
        </div>

        {/* Data Block */}
        <div className="flex-1 space-y-6">
          <div className="space-y-1">
            <h2 className="text-4xl md:text-5xl font-light tracking-tight text-amber-500">
              {tithi.name}
            </h2>
            <p className="text-xl text-zinc-300">
              {tithi.number}-е лунные сутки
            </p>
          </div>

          <div className="flex items-center gap-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
            <Moon className="w-5 h-5 text-indigo-400" />
            <div>
              <p className="text-sm text-zinc-400">Накшатра (Созвездие Луны)</p>
              <p className="text-lg font-medium">{nakshatra.name}</p>
            </div>
          </div>

          {/* Shaivite Alert: Pradosham */}
          {pradosham && (
            <div className="bg-amber-950/40 border border-amber-500/30 p-5 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-500">
                <span className="text-xl">🕉</span>
                <h3 className="font-semibold text-lg">Сегодня Прадошам</h3>
              </div>
              <p className="text-amber-200/80 text-sm">
                Идеальное время для пуджи и духовной практики (Прадоша Кала):
              </p>
              <div className="flex items-center gap-2 text-amber-400 font-mono text-lg mt-1">
                <span>{pradosham.pradoshaKalaStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                <span>—</span>
                <span>{pradosham.pradoshaKalaEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
