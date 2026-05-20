import { Body, MakeTime, Ecliptic, SearchRiseSet, Observer, SearchTransit, Equator, GeoVector } from 'astronomy-engine';

export type GeoLocation = {
  latitude: number;
  longitude: number;
  timezone?: string;
  name?: string;
};

// Константы
const DAYS_IN_TITHI = 30; // 15 Shukla + 15 Krishna
const DEGREES_IN_TITHI = 360 / DAYS_IN_TITHI; // 12 degrees
const NAKSHATRA_DEGREES = 360 / 27; // 13.333...

/**
 * Рассчитывает Айанамшу Лахири на заданную дату.
 * Используем формулу прецессии для конвертации тропического зодиака в сидерический.
 */
export function getLahiriAyanamsa(date: Date): number {
  const time = MakeTime(date);
  // Количество юлианских столетий с эпохи J2000
  // time.ut уже является количеством дней с эпохи J2000 (JD 2451545.0)
  const t = time.ut / 36525.0;
  // Прецессия: ~1.39697 градусов за 100 лет, базовое значение в 2000 году ~23.85
  return 23.852777 + (t * 1.39697);
}

/**
 * Возвращает сидерическую долготу тела (с учетом айанамши).
 */
export function getSiderealLongitude(body: Body, date: Date): number {
  const time = MakeTime(date);
  const eqj = GeoVector(body, time, true);
  const ecliptic = Ecliptic(eqj);
  const tropicalLon = ecliptic.elon;
  const ayanamsa = getLahiriAyanamsa(date);
  
  let siderealLon = tropicalLon - ayanamsa;
  if (siderealLon < 0) siderealLon += 360;
  return siderealLon;
}

/**
 * Рассчитывает текущий Титхи (лунный день).
 */
export function getTithi(date: Date) {
  const moonLon = getSiderealLongitude(Body.Moon, date);
  const sunLon = getSiderealLongitude(Body.Sun, date);
  
  // Угловое расстояние между Луной и Солнцем
  let diff = moonLon - sunLon;
  if (diff < 0) diff += 360;
  
  const tithiIndex = Math.floor(diff / DEGREES_IN_TITHI); // 0 до 29
  const progress = (diff % DEGREES_IN_TITHI) / DEGREES_IN_TITHI; // от 0 до 1
  
  const isShukla = tithiIndex < 15; // Растущая Луна
  const number = (tithiIndex % 15) + 1; // Номер дня от 1 до 15
  
  const names = [
    'Пратипад', 'Двития', 'Трития', 'Чатуртхи', 'Панчами',
    'Шашти', 'Саптами', 'Аштами', 'Навами', 'Дашами',
    'Экадаши', 'Двадаши', 'Трайодаши', 'Чатурдаши', 'Пурнима / Амавасья'
  ];
  
  let name = names[number - 1];
  if (number === 15) {
    name = isShukla ? 'Пурнима' : 'Амавасья';
  }

  return {
    index: tithiIndex,
    number,
    isShukla,
    name,
    pakshaName: isShukla ? 'Шукла Пакша' : 'Кришна Пакша',
    progress,
    isPradosham: number === 13,
    isMasaShivaratri: !isShukla && number === 14,
  };
}

/**
 * Рассчитывает текущую Накшатру (созвездие Луны).
 */
export function getNakshatra(date: Date) {
  const moonLon = getSiderealLongitude(Body.Moon, date);
  
  const index = Math.floor(moonLon / NAKSHATRA_DEGREES); // 0 to 26
  const progress = (moonLon % NAKSHATRA_DEGREES) / NAKSHATRA_DEGREES; // 0 to 1
  
  const names = [
    'Ашвини', 'Бхарани', 'Криттика', 'Рохини', 'Мригашира', 'Ардра', 'Пунарвасу',
    'Пушья', 'Ашлеша', 'Магха', 'Пурва Пхалгуни', 'Уттара Пхалгуни', 'Хаста',
    'Читра', 'Свати', 'Вишакха', 'Анурадха', 'Джьештха', 'Мула', 'Пурва Ашадха',
    'Уттара Ашадха', 'Шравана', 'Дхаништха', 'Шатабхиша', 'Пурва Бхадрапада',
    'Уттара Бхадрапада', 'Ревати'
  ];

  return {
    index,
    name: names[index],
    progress
  };
}

/**
 * Возвращает время рассвета и заката для заданного дня и координат.
 */
export function getSunTimes(date: Date, location: GeoLocation) {
  // Нормализуем дату на полдень по UTC для поиска рассвета/заката
  const noon = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
  const time = MakeTime(noon);
  const observer = new Observer(location.latitude, location.longitude, 0); // Высота 0м
  
  // SearchRiseSet(body, observer, direction (1=rise, -1=set), startTime, limitDays)
  const sunrise = SearchRiseSet(Body.Sun, observer, 1, time, 1);
  const sunset = SearchRiseSet(Body.Sun, observer, -1, time, 1);
  
  return {
    sunrise: sunrise ? sunrise.date : null,
    sunset: sunset ? sunset.date : null
  };
}

/**
 * Проверяет, является ли текущий день Прадошамом, и возвращает Прадоша Кала
 * (Обычно 1.5 часа до заката и 1.5 часа после).
 */
export function getPradoshamDetails(date: Date, location: GeoLocation) {
  const tithi = getTithi(date);
  
  // Прадошам выпадает на 13-й лунный день (Трайодаши)
  if (tithi.number !== 13) return null;
  
  const sunTimes = getSunTimes(date, location);
  if (!sunTimes.sunset) return null;
  
  // Прадоша Кала ~ 1 час 30 минут (90 минут) до и после заката
  // Для большей точности это 1 мухурта (~48 мин) до и после, но обычно берут окно в 3 часа.
  const sunsetTime = sunTimes.sunset.getTime();
  const windowMs = 90 * 60 * 1000; // 90 минут в миллисекундах
  
  const start = new Date(sunsetTime - windowMs);
  const end = new Date(sunsetTime + windowMs);
  
  return {
    isPradoshamDay: true,
    sunset: sunTimes.sunset,
    pradoshaKalaStart: start,
    pradoshaKalaEnd: end,
    paksha: tithi.isShukla ? 'Шукла (Растущая луна)' : 'Кришна (Убывающая луна)'
  };
}

/**
 * Ищет ближайшие важные события на N дней вперед.
 * Все даты рассчитываются астрономически из номера титхи и дня недели.
 *
 * Шиваитские события:
 *   - Прадошам: 13-й титхи (Трайодаши) в обе пакши
 *   - Маса Шиваратри: Кришна Пакша, 14-й титхи (Чатурдаши)
 *   - Сомавати Амавасья: Амавасья (новолуние), выпавшая на понедельник — особо свята для Шивы
 *
 * Общие ведические события:
 *   - Экадаши: 11-й титхи в обе пакши — день поста
 *   - Пурнима: 15-й титхи Шукла Пакша — полнолуние
 *   - Амавасья: 15-й титхи Кришна Пакша — новолуние (поминовение предков)
 *   - Санкашти Чатуртхи: 4-й титхи Кришна Пакша — почитание Ганеши
 */
export function getUpcomingEvents(startDate: Date, days: number, location: GeoLocation) {
  const events: Array<{
    type: string;
    title: string;
    date: Date;
    description: string;
    details: ReturnType<typeof getPradoshamDetails>;
    importance: 'high' | 'medium' | 'low';
  }> = [];

  for (let i = 1; i <= days; i++) {
    const checkDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const tithi = getTithi(checkDate);
    const dayOfWeek = checkDate.getUTCDay(); // 0=Sunday, 1=Monday, ...

    // ── ПРАДОШАМ (13-й титхи) ──
    if (tithi.number === 13) {
      const pradosham = getPradoshamDetails(checkDate, location);
      if (pradosham) {
        const dayName = dayOfWeek === 6 ? 'Шани Прадошам (Суббота)' :
                        dayOfWeek === 1 ? 'Сома Прадошам (Понедельник)' : 'Прадошам';
        events.push({
          type: 'pradosham',
          title: dayName,
          date: checkDate,
          description: 'Благоприятное время для поклонения Шиве. Пуджа в Прадоша Калу.',
          details: pradosham,
          importance: 'high',
        });
      }
    }

    // ── МАСА ШИВАРАТРИ (Кришна Чатурдаши) ──
    if (!tithi.isShukla && tithi.number === 14) {
      events.push({
        type: 'shivaratri',
        title: 'Маса Шиваратри',
        date: checkDate,
        description: 'Ежемесячная Шиваратри. Ночь бдения и медитации на Шиву.',
        details: null,
        importance: 'high',
      });
    }

    // ── ЭКАДАШИ (11-й титхи) ──
    if (tithi.number === 11) {
      events.push({
        type: 'ekadashi',
        title: `Экадаши (${tithi.isShukla ? 'Шукла' : 'Кришна'})`,
        date: checkDate,
        description: 'День поста и духовной практики. Воздержание от зерновых.',
        details: null,
        importance: 'medium',
      });
    }

    // ── ПУРНИМА (полнолуние — Шукла 15) ──
    if (tithi.isShukla && tithi.number === 15) {
      events.push({
        type: 'purnima',
        title: 'Пурнима (Полнолуние)',
        date: checkDate,
        description: 'Полнолуние. Благоприятный день для духовных практик и пуджи.',
        details: null,
        importance: 'medium',
      });
    }

    // ── АМАВАСЬЯ (новолуние — Кришна 15) ──
    if (!tithi.isShukla && tithi.number === 15) {
      const isSomavati = dayOfWeek === 1; // Понедельник
      events.push({
        type: isSomavati ? 'somavati_amavasya' : 'amavasya',
        title: isSomavati ? 'Сомавати Амавасья 🕉' : 'Амавасья (Новолуние)',
        date: checkDate,
        description: isSomavati
          ? 'Новолуние в понедельник — особо священна для Шивы. Мощное время для практик.'
          : 'Новолуние. День поминовения предков (Питри Тарпана).',
        details: null,
        importance: isSomavati ? 'high' : 'medium',
      });
    }

    // ── САНКАШТИ ЧАТУРТХИ (Кришна 4 — Ганеша) ──
    if (!tithi.isShukla && tithi.number === 4) {
      events.push({
        type: 'chaturthi',
        title: 'Санкашти Чатуртхи',
        date: checkDate,
        description: 'День почитания Ганеши. Пост до восхода Луны.',
        details: null,
        importance: 'low',
      });
    }

    if (events.length >= 8) break; // Показываем до 8 ближайших
  }

  // Sort by date, then by importance
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  return events;
}

