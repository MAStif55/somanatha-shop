import React from 'react';
import { Metadata } from 'next';
import { getTithi, getNakshatra, getPradoshamDetails, GeoLocation } from '@/lib/astrology/calculations';
import HeroWidget from '@/components/panchanga/HeroWidget';
import LocationSelector from '@/components/panchanga/LocationSelector';
import UpcomingEvents from '@/components/panchanga/UpcomingEvents';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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
    <main className="min-h-screen flex flex-col bg-[#0D0A0B]">
      <Header variant="solid" />
      
      <div className="flex-1 relative">
        {/* Subtle background decoration similar to site */}
        <div className="absolute inset-0 bg-hero-premium opacity-30 pointer-events-none mix-blend-screen" />
        
        <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Header & Location */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
              <div>
                <h1 className="text-4xl font-ornamental text-[#E8D48B] tracking-wide">Ведический Календарь</h1>
                <p className="text-[#C9A227]/80 text-sm mt-2 uppercase tracking-wider">Швейцарская точность расчетов</p>
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

            {/* Upcoming Events */}
            <UpcomingEvents location={location} />
            
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
