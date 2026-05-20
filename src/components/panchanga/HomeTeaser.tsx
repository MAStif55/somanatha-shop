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
      <div className={`group rounded-xl p-4 sm:p-5 flex items-center justify-between border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(201,162,39,0.15)] ${
        highlight 
          ? 'bg-gradient-to-r from-[#C9A227]/10 via-[#1A1517]/80 to-[#0D0A0B]/80 border-[#C9A227]/40 shadow-[0_0_20px_rgba(201,162,39,0.1)]' 
          : 'bg-[#1A1517]/80 border-[#C9A227]/20 hover:border-[#C9A227]/50'
      }`}>
        <div className="flex items-center gap-4 sm:gap-5">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
            highlight ? 'bg-gradient-to-br from-[#C9A227]/20 to-transparent border border-[#C9A227]/30' : 'bg-[#0D0A0B] border border-[#C9A227]/20'
          }`}>
            <Moon className={`w-6 h-6 ${highlight ? 'text-[#C9A227]' : 'text-[#E8D48B]/70'}`} />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs text-[#C9A227] uppercase tracking-[0.2em] font-semibold mb-1">
              Ведический Календарь
            </p>
            <p className={`text-sm sm:text-base font-medium ${highlight ? 'text-[#F5ECD7] font-semibold' : 'text-[#F5ECD7]/90'}`}>
              {message}
            </p>
          </div>
        </div>
        <div className="text-[#C9A227]/70 text-sm hidden sm:flex items-center gap-2 group-hover:text-[#C9A227] transition-colors">
          <span>Открыть</span>
          <span className="transform group-hover:translate-x-1 transition-transform">&rarr;</span>
        </div>
      </div>
    </Link>
  );
}
