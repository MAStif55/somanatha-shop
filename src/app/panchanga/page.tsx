import React from 'react';
import { Metadata } from 'next';
import { getDailyPanchanga, GeoLocation } from '@/lib/astrology/calculations';
import HeroWidget from '@/components/panchanga/HeroWidget';
import DailyDetails from '@/components/panchanga/DailyDetails';
import LocationSelector from '@/components/panchanga/LocationSelector';
import UpcomingEvents from '@/components/panchanga/UpcomingEvents';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Ведический Лунный Календарь (Панчанга) | Somanatha',
  description: 'Точный ведический календарь для шиваитов. Расчет Титхи, Накшатры, Йоги, Караны, мухурт и времени Прадоша Кала для вашего города.',
};

export default function PanchangaPage({
  searchParams,
}: {
  searchParams: { lat?: string; lon?: string; city?: string }
}) {
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

  // Полная Панчанга на сегодня
  const panchanga = getDailyPanchanga(now, location);

  return (
    <main className="min-h-screen flex flex-col bg-[#1A1517] relative">
      <div className="absolute top-0 left-0 w-full h-[60vh] bg-hero-premium z-0">
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#1A1517] via-[#1A1517]/60 to-transparent pointer-events-none"></div>
      </div>
      
      <div 
        className="absolute inset-0 bg-sacred-pattern pointer-events-none z-0"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 25vh, rgba(0, 0, 0, 1) 55vh)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 25vh, rgba(0, 0, 0, 1) 55vh)'
        }}
      />
      
      <div className="absolute top-0 left-0 w-full h-[50vh] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#C9A227] opacity-5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-[#8B6914] opacity-5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-20">
        <Header variant="transparent" />
      </div>
      
      <div className="flex-1 relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-10">
            <div>
              <h1 className="text-4xl font-ornamental text-[#E8D48B] tracking-wide text-glow-gold">Ведический Календарь</h1>
              <p className="text-[#C9A227]/80 text-sm mt-2 uppercase tracking-wider font-elegant italic">Джйотиш — наука о свете</p>
            </div>
              <LocationSelector currentLocationName={cityName} />
            </div>

            {/* Луна + Титхи + Накшатра */}
            <HeroWidget 
              tithi={panchanga.tithi}
              nakshatra={panchanga.nakshatra}
              pradosham={panchanga.pradosham}
              location={location}
            />

            {/* Полная Панчанга: Йога, Карана, Мухурты */}
            <DailyDetails panchanga={panchanga} />

            {/* Ближайшие события */}
            <UpcomingEvents location={location} />
            
          </div>
        </div>

      <Footer />
    </main>
  );
}
