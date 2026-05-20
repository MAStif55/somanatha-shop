'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { MapPin, Navigation, Search, X, Loader2 } from 'lucide-react';
import { GeoLocation } from '@/lib/astrology/calculations';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  name: string;
}

export default function LocationSelector({ currentLocationName }: { currentLocationName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&accept-language=ru`);
        const data = await res.json();
        setResults(data);
      } catch (error) {
        console.error("Error fetching locations:", error);
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (lat: string | number, lon: string | number, name: string) => {
    // Extract main city name from display_name if needed
    const shortName = name.split(',')[0];
    
    const params = new URLSearchParams(searchParams.toString());
    params.set('lat', lat.toString());
    params.set('lon', lon.toString());
    params.set('city', shortName);
    
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("Геолокация не поддерживается вашим браузером");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocoding to get city name
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=ru`);
          const data = await res.json();
          
          let cityName = 'Ваша локация';
          if (data && data.address) {
            cityName = data.address.city || data.address.town || data.address.village || data.address.county || 'Ваша локация';
          }

          handleSelectLocation(latitude, longitude, cityName);
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          // Fallback if reverse geocoding fails
          handleSelectLocation(latitude, longitude, 'Ваша локация');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Не удалось определить местоположение. Пожалуйста, введите город вручную.");
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative z-50" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#1A1517]/80 backdrop-blur-md border border-[#C9A227]/30 px-4 py-2 rounded-full hover:bg-[#C9A227]/10 hover:border-[#C9A227]/50 transition-all group"
      >
        <MapPin className="w-4 h-4 text-[#C9A227] group-hover:scale-110 transition-transform" />
        <span className="text-[#F5ECD7] font-medium text-sm">{currentLocationName}</span>
        <span className="text-xs text-[#F5ECD7]/40 ml-1">(Изменить)</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 md:left-auto md:right-0 mt-3 w-[320px] bg-[#0D0A0B]/95 backdrop-blur-xl border border-[#C9A227]/20 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="p-4 border-b border-[#C9A227]/10 space-y-3">
             <button 
              onClick={handleGeolocate}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLocating ? (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
              ) : (
                  <Navigation className="w-4 h-4" />
              )}
              <span className="font-medium">{isLocating ? 'Определяем...' : 'Определить точно (GPS)'}</span>
            </button>
            <p className="text-[10px] text-[#F5ECD7]/40 text-center px-2">
              Для максимальной точности расчетов времени Прадошама.
            </p>
          </div>

          <div className="p-2">
            <div className="relative px-2 mb-2 mt-1">
              <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text"
                placeholder="Поиск по всему миру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1A1517] border border-[#C9A227]/20 rounded-xl pl-9 pr-8 py-2.5 text-sm text-[#F5ECD7] placeholder:text-zinc-600 focus:outline-none focus:border-[#C9A227]/50 transition-colors"
                autoFocus
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
              {/* Results */}
              {isLoading ? (
                <div className="p-8 flex justify-center">
                  <Loader2 className="w-6 h-6 text-[#C9A227] animate-spin" />
                </div>
              ) : results.length > 0 ? (
                <div className="py-1">
                  {results.map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectLocation(result.lat, result.lon, result.name || result.display_name)}
                      className="w-full px-4 py-3 hover:bg-[#1A1517] rounded-xl transition-colors text-left flex items-start gap-3"
                    >
                      <MapPin className="w-4 h-4 text-[#C9A227]/60 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#F5ECD7]">
                          {result.name || result.display_name.split(',')[0]}
                        </p>
                        <p className="text-xs text-zinc-500 truncate max-w-[240px]">
                          {result.display_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 2 ? (
                <div className="p-6 text-center text-[#F5ECD7]/50 text-sm font-light">
                  Ничего не найдено
                </div>
              ) : (
                <div className="p-6 text-center text-[#F5ECD7]/30 text-xs font-light">
                  Введите название города, чтобы найти его координаты в базе данных.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
