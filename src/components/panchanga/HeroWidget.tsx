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
  // Calculate exact lunar phase (0.0 to 1.0 where 0.5 is Full Moon)
  const exactPhase = tithi.isShukla 
    ? (tithi.number - 1 + tithi.progress) / 15 
    : 1 - ((tithi.number - 1 + tithi.progress) / 15);

  // Position the light source to simulate a 3D sphere illumination
  // 0 -> -50% (dark), 0.5 -> 50% (full light), 1.0 -> 150% (dark)
  const lightX = (exactPhase * 200) - 50;
  
  // Calculate glow intensity based on illumination
  const glowOpacity = Math.max(0.1, exactPhase);

  return (
    <div className="bg-zinc-950 text-amber-50 rounded-2xl overflow-hidden border border-zinc-800/50 relative">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-amber-500/10 blur-[120px]"></div>
      </div>

      <div className="relative p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 md:gap-12">
        {/* Moon Visualization */}
        <div className="flex flex-col items-center gap-5 shrink-0">
          <div className="relative w-32 h-32 md:w-48 md:h-48 rounded-full transition-all duration-1000"
               style={{
                 background: `radial-gradient(circle at ${lightX}% 50%, #F5ECD7 0%, #C9A227 30%, #5c4309 60%, #1A1517 85%, #0D0A0B 100%)`,
                 boxShadow: `0 0 ${60 * exactPhase}px ${10 * exactPhase}px rgba(201,162,39, ${glowOpacity * 0.4}), inset -10px -10px 30px rgba(0,0,0,0.8), inset 10px 10px 20px rgba(255,255,255,${exactPhase * 0.2})`
               }}>
            
            {/* Crater Textures (Subtle) */}
            <div className="absolute inset-0 rounded-full opacity-20 mix-blend-overlay"
                 style={{
                   background: 'radial-gradient(circle at 30% 40%, rgba(0,0,0,0.4) 0%, transparent 20%), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.3) 0%, transparent 15%), radial-gradient(circle at 40% 70%, rgba(0,0,0,0.5) 0%, transparent 25%)'
                 }}>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[#C9A227] text-sm tracking-wider uppercase font-medium">{tithi.pakshaName}</p>
            <p className="text-xs text-[#F5ECD7]/50 mt-1">
              Освещенность: {Math.round(exactPhase * 100)}%
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
