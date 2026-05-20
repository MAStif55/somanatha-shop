import React from 'react';
import { Metadata } from 'next';
import { getTithi, getNakshatra, getPradoshamDetails, GeoLocation } from '@/lib/astrology/calculations';
import HeroWidget from '@/components/panchanga/HeroWidget';
import LocationSelector from '@/components/panchanga/LocationSelector';
import UpcomingEvents from '@/components/panchanga/UpcomingEvents';

export const metadata: Metadata = {
  title: 'Ведический Лунный Календарь (Панчанга) | Somanatha',
  description: 'Точный ведический календарь для шиваитов. Расчет Титхи, Накшатры и времени Прадоша Кала для вашего города.',
};

export default function PanchangaPage({
  searchParams,
}: {
  searchParams: { lat?: string; lon?: string; city?: string }
}) {
  // Дефолтный город (Москва)
  const defaultLocation: GeoLocation = {
    latitude: 55.7558,
    longitude: 37.6173,
    name: 'Москва'
  };

  const lat = searchParams.lat ? parseFloat(searchParams.lat) : defaultLocation.latitude;
  const lon = searchParams.lon ? parseFloat(searchParams.lon) : defaultLocation.longitude;
  const cityName = searchParams.city || defaultLocation.name!;
  
  const location: GeoLocation = { latitude: lat, longitude: lon, name: cityName };
  const now = new Date();

  // Вычисления
  const tithi = getTithi(now);
  const nakshatra = getNakshatra(now);
  const pradosham = getPradoshamDetails(now, location);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header & Location */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-amber-50">Ведический Календарь</h1>
            <p className="text-zinc-500 mt-1">Швейцарская точность расчетов (Айанамша Лахири)</p>
          </div>
          <LocationSelector currentLocationName={cityName} />
        </div>

        {/* Main Widget */}
        <HeroWidget 
          tithi={tithi}
          nakshatra={nakshatra}
          pradosham={pradosham}
          location={location}
        />

        {/* Upcoming Events (Static mock for V1, or we can calculate next 30 days) */}
        <UpcomingEvents location={location} />
        
      </div>
    </div>
  );
}
