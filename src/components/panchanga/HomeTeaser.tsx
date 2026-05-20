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
      <div className={`rounded-xl p-4 flex items-center justify-between border transition-all hover:scale-[1.01] ${highlight ? 'bg-amber-950/30 border-amber-500/30 shadow-[0_0_20px_rgba(251,191,36,0.1)]' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${highlight ? 'bg-amber-500/10' : 'bg-zinc-800'}`}>
            <Moon className={`w-5 h-5 ${highlight ? 'text-amber-500' : 'text-zinc-400'}`} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-0.5">Ведический Календарь</p>
            <p className={`font-medium ${highlight ? 'text-amber-100' : 'text-zinc-300'}`}>
              {message}
            </p>
          </div>
        </div>
        <div className="text-zinc-500 text-sm hidden sm:block">
          Открыть календарь &rarr;
        </div>
      </div>
    </Link>
  );
}
