import React from 'react';
import Link from 'next/link';
import { getTithi, getPradoshamDetails, GeoLocation } from '@/lib/astrology/calculations';
import { Moon } from 'lucide-react';

export default function HomeTeaser() {
  // Для тизера на главной мы считаем для дефолтного города (Москва) 
  // или можно просто показать титхи, которые (почти) не зависят от локации
  const defaultLocation: GeoLocation = { latitude: 55.7558, longitude: 37.6173, name: 'Москва' };
  const now = new Date();
  
  const tithi = getTithi(now);
  const pradosham = getPradoshamDetails(now, defaultLocation);

  let message = `Сегодня ${tithi.number}-е лунные сутки (${tithi.name}).`;
  let highlight = false;

  if (pradosham) {
    message = '🕉 Сегодня Прадошам! Идеальный день для пуджи.';
    highlight = true;
  } else if (tithi.isMasaShivaratri) {
    message = '🕉 Сегодня Маса Шиваратри.';
    highlight = true;
  } else if (tithi.number === 13) {
    // Скоро прадошам
    message = 'Сегодня 13-е лунные сутки. Подготовьтесь к Прадошаму.';
  }

  return (
    <Link href="/panchanga" className="block w-full max-w-2xl mx-auto my-6 px-4">
      <div className={`group relative overflow-hidden rounded-2xl p-5 sm:p-6 flex items-center justify-between border backdrop-blur-md transition-all duration-500 hover:-translate-y-1 ${
        highlight 
          ? 'bg-gradient-to-r from-[#2a1e12]/80 to-[#1A1517]/80 border-[#C9A227]/30 shadow-[0_8px_32px_rgba(201,162,39,0.15)] hover:shadow-[0_12px_40px_rgba(201,162,39,0.25)] hover:border-[#C9A227]/50' 
          : 'bg-[#1A1517]/60 border-white/5 border-t-[#C9A227]/10 shadow-lg hover:shadow-xl hover:border-white/10 hover:bg-[#1A1517]/80'
      }`}>
        
        {/* Subtle decorative glow for highlight state */}
        {highlight && (
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-2xl">
            <div className="absolute top-[-50%] left-[-10%] w-64 h-64 bg-[#C9A227] opacity-10 rounded-full blur-[50px] group-hover:opacity-20 transition-opacity duration-500"></div>
          </div>
        )}

        <div className="flex items-center gap-5 sm:gap-6 relative z-10">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 shadow-inner transition-transform duration-500 group-hover:scale-110 ${
            highlight ? 'bg-gradient-to-br from-[#C9A227]/20 to-[#0D0A0B] border border-[#C9A227]/40' : 'bg-[#0D0A0B]/80 border border-[#C9A227]/20'
          }`}>
            <Moon className={`w-6 h-6 ${highlight ? 'text-[#C9A227] drop-shadow-[0_0_8px_rgba(201,162,39,0.8)]' : 'text-[#E8D48B]/60'}`} />
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[10px] sm:text-[11px] text-[#C9A227] uppercase tracking-[0.25em] font-bold mb-1 opacity-90">
              Ведический Календарь
            </p>
            <p className={`text-sm sm:text-base leading-snug ${highlight ? 'text-[#F5ECD7] font-medium' : 'text-[#F5ECD7]/80 font-light'}`}>
              {message}
            </p>
          </div>
        </div>
        
        <div className="text-[#C9A227]/60 text-sm hidden sm:flex items-center gap-2 group-hover:text-[#C9A227] transition-colors relative z-10 font-medium tracking-wide">
          <span>Открыть</span>
          <span className="transform group-hover:translate-x-1.5 transition-transform duration-300">&rarr;</span>
        </div>
      </div>
    </Link>
  );
}
