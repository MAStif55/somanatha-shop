import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Somanatha — Vedic Store',
    short_name: 'Somanatha',
    description: 'Ведический магазин сакральных артефактов, янтр и кавач.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0809',
    theme_color: '#0A0809',
    icons: [
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
