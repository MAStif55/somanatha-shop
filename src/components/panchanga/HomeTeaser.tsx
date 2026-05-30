import React from 'react';
import Link from 'next/link';
import { getTithi, getPradoshamDetails, GeoLocation } from '@/lib/astrology/calculations';
import { useLanguage } from '@/contexts/LanguageContext';

const TITHI_NAMES_EN = [
  'Pratipad', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashti', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Full Moon / New Moon'
];

function getMoonImageForTithi(tithiNumber: number): string {
  if (tithiNumber === 30) return '/images/moon/new_moon.png';
  if (tithiNumber >= 1 && tithiNumber <= 5) return '/images/moon/waxing_crescent.png';
  if (tithiNumber >= 6 && tithiNumber <= 10) return '/images/moon/first_quarter.png';
  if (tithiNumber >= 11 && tithiNumber <= 14) return '/images/moon/waxing_gibbous.png';
  if (tithiNumber === 15) return '/images/moon/full_moon.png';
  if (tithiNumber >= 16 && tithiNumber <= 20) return '/images/moon/waning_gibbous.png';
  if (tithiNumber >= 21 && tithiNumber <= 25) return '/images/moon/last_quarter.png';
  if (tithiNumber >= 26 && tithiNumber <= 29) return '/images/moon/waning_crescent.png';
  return '/logo.png';
}

export default function HomeTeaser() {
  const { locale } = useLanguage();
  const isRu = locale === 'ru';

  // Для тизера на главной мы считаем для дефолтного города (Москва) 
  // или можно просто показать титхи, которые (почти) не зависят от локации
  const defaultLocation: GeoLocation = { latitude: 55.7558, longitude: 37.6173, name: 'Москва' };
  const now = new Date();
  
  const tithi = getTithi(now);
  const pradosham = getPradoshamDetails(now, defaultLocation);

  const tithiNumber = tithi.index + 1; // 1 to 30 scale
  const moonImage = getMoonImageForTithi(tithiNumber);

  let tithiNameEn = TITHI_NAMES_EN[tithi.number - 1];
  if (tithi.number === 15) {
    tithiNameEn = tithi.isShukla ? 'Purnima' : 'Amavasya';
  }

  let message = isRu
    ? `Сегодня ${tithi.number}-е лунные сутки (${tithi.name}).`
    : `Today is ${tithiNameEn} (${tithi.number} Lunar Day).`;
  
  let highlight = false;

  if (pradosham) {
    message = isRu
      ? '🕉 Сегодня Прадошам! Идеальный день для пуджи.'
      : '🕉 Today is Pradosham! Ideal day for Shiva Puja.';
    highlight = true;
  } else if (tithi.isMasaShivaratri) {
    message = isRu
      ? '🕉 Сегодня Маса Шиваратри.'
      : '🕉 Today is Masa Shivaratri.';
    highlight = true;
  } else if (tithi.number === 13) {
    message = isRu
      ? 'Сегодня 13-е лунные сутки. Подготовьтесь к Прадошаму.'
      : 'Today is Trayodashi (13th Lunar Day). Prepare for Pradosham.';
  }

  return (
    <Link href="/panchanga" className="block w-full max-w-xl mx-auto my-1 px-4 sm:px-0">
      <div className={`group relative overflow-hidden rounded-2xl p-5 sm:p-6 flex items-center justify-between border backdrop-blur-md transition-all duration-500 hover:-translate-y-1 ${
        highlight 
          ? 'bg-gradient-to-r from-[#2d1b1f]/90 via-[#2a1e12]/80 to-[#2d1b1f]/90 border-[#C9A227]/50 shadow-[0_8px_32px_rgba(201,162,39,0.2)] hover:shadow-[0_12px_40px_rgba(201,162,39,0.35)] hover:border-[#C9A227]' 
          : 'bg-gradient-to-r from-[#2d1b1f]/60 via-[#1a1517]/85 to-[#2d1b1f]/60 border-[#C9A227]/25 border-t-[#E8D48B]/40 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_15px_rgba(201,162,39,0.08)] hover:shadow-[0_12px_40px_rgba(201,162,39,0.22)] hover:border-[#C9A227]/50 hover:bg-[#1a1517]/95'
      }`}>
        
        {/* Decorative background ambient glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden rounded-2xl">
          <div className={`absolute top-[-50%] left-[-10%] w-64 h-64 bg-[#C9A227] rounded-full blur-[50px] transition-all duration-500 ${
            highlight 
              ? 'opacity-15 group-hover:opacity-25' 
              : 'opacity-5 group-hover:opacity-15'
          }`} />
        </div>

        <div className="flex items-start gap-4 sm:gap-6 relative z-10 w-full">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 shadow-inner transition-all duration-500 group-hover:scale-110 ${
            highlight 
              ? 'bg-gradient-to-br from-[#C9A227]/30 to-[#0D0A0B]/85 border border-[#C9A227]/50 group-hover:border-[#C9A227]' 
              : 'bg-[#0D0A0B]/85 border border-[#C9A227]/30 group-hover:border-[#C9A227]/60 group-hover:bg-[#C9A227]/10'
          }`}>
            <img 
              src={moonImage} 
              alt="Moon Phase" 
              className={`w-8 h-8 sm:w-10 sm:h-10 transition-all duration-500 object-contain ${
                highlight 
                  ? 'drop-shadow-[0_0_8px_rgba(201,162,39,0.8)] group-hover:drop-shadow-[0_0_12px_rgba(201,162,39,1)]' 
                  : 'opacity-90 group-hover:opacity-100 group-hover:drop-shadow-[0_0_8px_rgba(232,212,139,0.7)]'
              }`}
            />
          </div>
          <div className="flex flex-col justify-start text-left flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8D48B] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C9A227]"></span>
              </span>
              <p className="text-xs font-bold text-[#C9A227] uppercase tracking-[0.25em] opacity-90 select-none">
                {isRu ? 'Ведический Календарь' : 'Vedic Calendar'}
              </p>
            </div>
            <p className={`text-sm sm:text-base leading-snug ${highlight ? 'text-[#F5ECD7] font-medium' : 'text-[#F5ECD7]/95 font-light'}`}>
              {message}
            </p>
            
            {/* Open Action Link at the bottom of the card, aligned with text */}
            <div className="text-[#C9A227]/70 text-xs sm:text-sm flex items-center gap-2 group-hover:text-[#E8D48B] transition-colors mt-3.5 font-medium tracking-wide">
              <span>{isRu ? 'Открыть' : 'Open'}</span>
              <span className="transform group-hover:translate-x-1.5 transition-transform duration-300">&rarr;</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
