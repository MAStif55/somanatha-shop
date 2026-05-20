'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';
import { GeoLocation } from '@/lib/astrology/calculations';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

const POPULAR_CITIES = [
  { name: 'Москва', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow' },
  { name: 'Санкт-Петербург', lat: 59.9343, lon: 30.3351, tz: 'Europe/Moscow' },
  { name: 'Новосибирск', lat: 55.0084, lon: 82.9357, tz: 'Asia/Novosibirsk' },
  { name: 'Екатеринбург', lat: 56.8389, lon: 60.6057, tz: 'Asia/Yekaterinburg' },
  { name: 'Казань', lat: 55.7963, lon: 49.1088, tz: 'Europe/Moscow' },
  { name: 'Краснодар', lat: 45.0393, lon: 38.9806, tz: 'Europe/Moscow' },
  { name: 'Бали (Денпасар)', lat: -8.6500, lon: 115.2167, tz: 'Asia/Makassar' },
];

export default function LocationSelector({ currentLocationName }: { currentLocationName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = (city: typeof POPULAR_CITIES[0]) => {
    setIsOpen(false);
    updateUrl(city.lat, city.lon, city.name);
  };

  const updateUrl = (lat: number, lon: number, name: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('lat', lat.toString());
    params.set('lon', lon.toString());
    params.set('city', name);
    router.push(`${pathname}?${params.toString()}`);
  };

  const detectLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      alert('Геолокация не поддерживается вашим браузером');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setIsOpen(false);
        updateUrl(position.coords.latitude, position.coords.longitude, 'Моя локация');
      },
      (error) => {
        setIsLocating(false);
        alert('Не удалось определить локацию. Возможно, доступ запрещен.');
      }
    );
  };

  const filteredCities = POPULAR_CITIES.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-4 py-2 rounded-full border border-zinc-700/50 transition-colors"
      >
        <MapPin className="w-4 h-4 text-amber-500" />
        <span className="font-medium">{currentLocationName}</span>
        <span className="text-xs text-zinc-500 ml-1">(Изменить)</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-zinc-800 space-y-3">
            <button 
              onClick={detectLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              <Navigation className={`w-4 h-4 ${isLocating ? 'animate-pulse' : ''}`} />
              <span className="font-medium">{isLocating ? 'Определяем...' : 'Определить точно (GPS)'}</span>
            </button>
            <p className="text-[10px] text-zinc-500 text-center px-2">
              Для максимальной точности расчетов (особенно если вы используете VPN).
            </p>
          </div>

          <div className="p-2">
            <div className="relative mb-2 px-2">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text"
                placeholder="Найти город..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-300 text-sm rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            
            <div className="max-h-48 overflow-y-auto">
              {filteredCities.map(city => (
                <button
                  key={city.name}
                  onClick={() => handleSelect(city)}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors"
                >
                  {city.name}
                </button>
              ))}
              {filteredCities.length === 0 && (
                <div className="px-4 py-3 text-sm text-zinc-500 text-center">
                  Город не найден
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
