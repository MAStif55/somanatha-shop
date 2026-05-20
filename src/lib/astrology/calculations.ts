import { Body, MakeTime, Ecliptic, SearchRiseSet, Observer, GeoVector } from 'astronomy-engine';

export type GeoLocation = {
  latitude: number;
  longitude: number;
  timezone?: string;
  name?: string;
};

// ════════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════════
const DEGREES_IN_TITHI = 12; // 360 / 30
const NAKSHATRA_DEGREES = 360 / 27; // 13.333...
const YOGA_DEGREES = 360 / 27; // Same as nakshatra but from sum

// ════════════════════════════════════════════════════════
//  CORE ASTRONOMY
// ════════════════════════════════════════════════════════

/**
 * Лахири Айанамша (Читра Пакша) на заданную дату.
 * Сидерический зодиак = тропический - айанамша.
 */
export function getLahiriAyanamsa(date: Date): number {
  const time = MakeTime(date);
  const t = time.ut / 36525.0; // Julian centuries from J2000
  return 23.852777 + (t * 1.39697);
}

/**
 * Сидерическая долгота небесного тела (с айанамшей Лахири).
 */
export function getSiderealLongitude(body: Body, date: Date): number {
  const time = MakeTime(date);
  const eqj = GeoVector(body, time, true);
  const ecliptic = Ecliptic(eqj);
  const ayanamsa = getLahiriAyanamsa(date);
  let lon = ecliptic.elon - ayanamsa;
  if (lon < 0) lon += 360;
  return lon;
}

// ════════════════════════════════════════════════════════
//  SUNRISE / SUNSET
// ════════════════════════════════════════════════════════

/**
 * Рассвет, закат и длительность светового дня.
 * astronomy-engine учитывает атмосферную рефракцию по умолчанию.
 */
export function getSunTimes(date: Date, location: GeoLocation) {
  const noon = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0));
  const time = MakeTime(noon);
  const observer = new Observer(location.latitude, location.longitude, 0);

  const sunrise = SearchRiseSet(Body.Sun, observer, 1, time, 1);
  const sunset = SearchRiseSet(Body.Sun, observer, -1, time, 1);

  let daylightMs = 0;
  if (sunrise && sunset) {
    daylightMs = sunset.date.getTime() - sunrise.date.getTime();
  }

  return {
    sunrise: sunrise ? sunrise.date : null,
    sunset: sunset ? sunset.date : null,
    daylightMs,
  };
}

// ════════════════════════════════════════════════════════
//  ТИТХИ (Лунный день)
// ════════════════════════════════════════════════════════

const TITHI_NAMES = [
  'Пратипад', 'Двития', 'Трития', 'Чатуртхи', 'Панчами',
  'Шашти', 'Саптами', 'Аштами', 'Навами', 'Дашами',
  'Экадаши', 'Двадаши', 'Трайодаши', 'Чатурдаши', 'Пурнима / Амавасья'
];

export function getTithi(date: Date) {
  const moonLon = getSiderealLongitude(Body.Moon, date);
  const sunLon = getSiderealLongitude(Body.Sun, date);

  let diff = moonLon - sunLon;
  if (diff < 0) diff += 360;

  const tithiIndex = Math.floor(diff / DEGREES_IN_TITHI); // 0–29
  const progress = (diff % DEGREES_IN_TITHI) / DEGREES_IN_TITHI;

  const isShukla = tithiIndex < 15;
  const number = (tithiIndex % 15) + 1;

  let name = TITHI_NAMES[number - 1];
  if (number === 15) name = isShukla ? 'Пурнима' : 'Амавасья';

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

// ════════════════════════════════════════════════════════
//  НАКШАТРА (Лунное созвездие)
// ════════════════════════════════════════════════════════

const NAKSHATRA_NAMES = [
  'Ашвини', 'Бхарани', 'Криттика', 'Рохини', 'Мригашира', 'Ардра', 'Пунарвасу',
  'Пушья', 'Ашлеша', 'Магха', 'Пурва Пхалгуни', 'Уттара Пхалгуни', 'Хаста',
  'Читра', 'Свати', 'Вишакха', 'Анурадха', 'Джьештха', 'Мула', 'Пурва Ашадха',
  'Уттара Ашадха', 'Шравана', 'Дхаништха', 'Шатабхиша', 'Пурва Бхадрапада',
  'Уттара Бхадрапада', 'Ревати'
];

// Управители (деваты) накшатр
const NAKSHATRA_DEITIES = [
  'Ашвины', 'Яма', 'Агни', 'Брахма', 'Сома', 'Рудра (Шива)', 'Адити',
  'Брихаспати', 'Нага', 'Питри', 'Бхага', 'Арьяман', 'Савитар',
  'Тваштар', 'Ваю', 'Индра-Агни', 'Митра', 'Индра', 'Ниррити', 'Апас',
  'Вишведевы', 'Вишну', 'Васу', 'Варуна', 'Аджа Экапад',
  'Ахир Будхнья', 'Пушан'
];

export function getNakshatra(date: Date) {
  const moonLon = getSiderealLongitude(Body.Moon, date);

  const index = Math.floor(moonLon / NAKSHATRA_DEGREES);
  const progress = (moonLon % NAKSHATRA_DEGREES) / NAKSHATRA_DEGREES;

  // Ардра (index 5) управляется Рудрой — особо важна для шиваитов
  const isArdra = index === 5;

  return {
    index,
    name: NAKSHATRA_NAMES[index],
    deity: NAKSHATRA_DEITIES[index],
    progress,
    isArdra,
  };
}

// ════════════════════════════════════════════════════════
//  ЙОГА (сумма долгот Солнце + Луна)
// ════════════════════════════════════════════════════════

const YOGA_NAMES = [
  'Вишкамбха', 'Прити', 'Аюшман', 'Саубхагья', 'Шобхана',
  'Атиганда', 'Сукарма', 'Дхрити', 'Шула', 'Ганда',
  'Вриддхи', 'Дхрува', 'Вьягхата', 'Харшана', 'Ваджра',
  'Сиддхи', 'Вьятипата', 'Вариян', 'Париг', 'Шива',
  'Сиддха', 'Садхья', 'Шубха', 'Шукла', 'Брахма',
  'Индра', 'Вайдхрити'
];

export function getYoga(date: Date) {
  const moonLon = getSiderealLongitude(Body.Moon, date);
  const sunLon = getSiderealLongitude(Body.Sun, date);

  let sum = moonLon + sunLon;
  if (sum >= 360) sum -= 360;

  const index = Math.floor(sum / YOGA_DEGREES);
  const progress = (sum % YOGA_DEGREES) / YOGA_DEGREES;

  // Шива-йога — index 19
  const isShivaYoga = index === 19;

  return {
    index,
    name: YOGA_NAMES[index],
    progress,
    isShivaYoga,
  };
}

// ════════════════════════════════════════════════════════
//  КАРАНА (половина титхи)
// ════════════════════════════════════════════════════════

const KARANA_NAMES = [
  'Кимстугна', 'Бава', 'Балава', 'Каулава', 'Тайтила',
  'Гара', 'Ваниджа', 'Вишти (Бхадра)', 'Бава', 'Балава',
  'Каулава', 'Тайтила', 'Гара', 'Ваниджа', 'Вишти (Бхадра)',
  'Бава', 'Балава', 'Каулава', 'Тайтила', 'Гара',
  'Ваниджа', 'Вишти (Бхадра)', 'Бава', 'Балава', 'Каулава',
  'Тайтила', 'Гара', 'Ваниджа', 'Вишти (Бхадра)', 'Бава',
  'Балава', 'Каулава', 'Тайтила', 'Гара', 'Ваниджа',
  'Вишти (Бхадра)', 'Бава', 'Балава', 'Каулава', 'Тайтила',
  'Гара', 'Ваниджа', 'Вишти (Бхадра)', 'Бава', 'Балава',
  'Каулава', 'Тайтила', 'Гара', 'Ваниджа', 'Вишти (Бхадра)',
  'Шакуни', 'Чатушпад', 'Нага', 'Кимстугна'
];

export function getKarana(date: Date) {
  const moonLon = getSiderealLongitude(Body.Moon, date);
  const sunLon = getSiderealLongitude(Body.Sun, date);

  let diff = moonLon - sunLon;
  if (diff < 0) diff += 360;

  // Each karana = 6 degrees (half of tithi = 12/2)
  const index = Math.floor(diff / 6) % 60;

  // Simplified: 11 unique karanas cycling
  const FIXED_KARANAS = ['Шакуни', 'Чатушпад', 'Нага', 'Кимстугна'];
  const MOVING_KARANAS = ['Бава', 'Балава', 'Каулава', 'Тайтила', 'Гара', 'Ваниджа', 'Вишти (Бхадра)'];

  let name: string;
  if (index === 0) name = 'Кимстугна';
  else if (index >= 57) name = FIXED_KARANAS[index - 57];
  else name = MOVING_KARANAS[(index - 1) % 7];

  // Вишти (Бхадра) — неблагоприятная карана
  const isVishti = name === 'Вишти (Бхадра)';

  return { index, name, isVishti };
}

// ════════════════════════════════════════════════════════
//  МУХУРТЫ (временные окна для практик)
// ════════════════════════════════════════════════════════

/**
 * Брахма-мухурта: 96 минут до восхода, длится 48 минут.
 * Лучшее время для мантр, медитации и духовных практик.
 */
export function getBrahmaMuhurta(date: Date, location: GeoLocation) {
  const { sunrise } = getSunTimes(date, location);
  if (!sunrise) return null;

  const sunriseMs = sunrise.getTime();
  const start = new Date(sunriseMs - 96 * 60 * 1000); // 96 мин до восхода
  const end = new Date(sunriseMs - 48 * 60 * 1000);   // 48 мин до восхода

  return { start, end };
}

/**
 * Нишита Кала: астрономическая полночь ± 24 минуты.
 * Время проявления Шивы как Лингама. Главная пуджа на Махашиваратри.
 */
export function getNishitaKala(date: Date, location: GeoLocation) {
  const { sunrise, sunset } = getSunTimes(date, location);
  if (!sunrise || !sunset) return null;

  // Астрономическая полночь = середина между закатом и следующим восходом
  // Приблизительно: sunset + (24h - daylightDuration) / 2
  const sunsetMs = sunset.getTime();
  const nextSunrise = new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
  const nightDuration = nextSunrise.getTime() - sunsetMs;
  const midnightMs = sunsetMs + nightDuration / 2;

  const start = new Date(midnightMs - 24 * 60 * 1000); // -24 мин
  const end = new Date(midnightMs + 24 * 60 * 1000);   // +24 мин

  return { start, end, midnight: new Date(midnightMs) };
}

/**
 * Раху Кала: неблагоприятный период (~1/8 светового дня).
 * Порядок по дням недели: Sun=8, Mon=2, Tue=7, Wed=5, Thu=6, Fri=4, Sat=3
 * (Какая 1/8 часть дня приходится на Раху Калу).
 */
export function getRahuKala(date: Date, location: GeoLocation) {
  const { sunrise, sunset, daylightMs } = getSunTimes(date, location);
  if (!sunrise || !sunset || daylightMs === 0) return null;

  // Порядок слотов Раху Кала по дням (0=Sun..6=Sat)
  const rahuSlots = [8, 2, 7, 5, 6, 4, 3];
  const dayOfWeek = date.getUTCDay();
  const slot = rahuSlots[dayOfWeek];

  const partDuration = daylightMs / 8;
  const start = new Date(sunrise.getTime() + (slot - 1) * partDuration);
  const end = new Date(start.getTime() + partDuration);

  return { start, end };
}

/**
 * Ямагандам: ещё один неблагоприятный период (~1/8 светового дня).
 * Порядок по дням: Sun=5, Mon=4, Tue=3, Wed=2, Thu=1, Fri=7, Sat=6
 */
export function getYamagandam(date: Date, location: GeoLocation) {
  const { sunrise, sunset, daylightMs } = getSunTimes(date, location);
  if (!sunrise || !sunset || daylightMs === 0) return null;

  const yamaSlots = [5, 4, 3, 2, 1, 7, 6];
  const dayOfWeek = date.getUTCDay();
  const slot = yamaSlots[dayOfWeek];

  const partDuration = daylightMs / 8;
  const start = new Date(sunrise.getTime() + (slot - 1) * partDuration);
  const end = new Date(start.getTime() + partDuration);

  return { start, end };
}

// ════════════════════════════════════════════════════════
//  ПРАДОШАМ
// ════════════════════════════════════════════════════════

export function getPradoshamDetails(date: Date, location: GeoLocation) {
  const tithi = getTithi(date);
  if (tithi.number !== 13) return null;

  const sunTimes = getSunTimes(date, location);
  if (!sunTimes.sunset) return null;

  const sunsetMs = sunTimes.sunset.getTime();
  const start = new Date(sunsetMs - 90 * 60 * 1000); // 90 мин до заката
  const end = new Date(sunsetMs + 90 * 60 * 1000);   // 90 мин после

  return {
    isPradoshamDay: true,
    sunset: sunTimes.sunset,
    pradoshaKalaStart: start,
    pradoshaKalaEnd: end,
    paksha: tithi.isShukla ? 'Шукла (Растущая луна)' : 'Кришна (Убывающая луна)',
  };
}

// ════════════════════════════════════════════════════════
//  ПОЛНАЯ ПАНЧАНГА НА ДЕНЬ
// ════════════════════════════════════════════════════════

export function getDailyPanchanga(date: Date, location: GeoLocation) {
  const tithi = getTithi(date);
  const nakshatra = getNakshatra(date);
  const yoga = getYoga(date);
  const karana = getKarana(date);
  const sunTimes = getSunTimes(date, location);
  const brahmaMuhurta = getBrahmaMuhurta(date, location);
  const nishitaKala = getNishitaKala(date, location);
  const rahuKala = getRahuKala(date, location);
  const yamagandam = getYamagandam(date, location);
  const pradosham = getPradoshamDetails(date, location);

  // День недели (Вара)
  const VARA_NAMES = ['Равивара (Вс)', 'Сомавара (Пн)', 'Мангалавара (Вт)',
    'Будхавара (Ср)', 'Гурувара (Чт)', 'Шукравара (Пт)', 'Шанивара (Сб)'];
  const vara = VARA_NAMES[date.getUTCDay()];

  // Особые маркеры для шиваитов
  const isArdraNakshatra = nakshatra.isArdra;
  const isShivaYoga = yoga.isShivaYoga;
  const isSomvar = date.getUTCDay() === 1; // Понедельник — день Шивы

  return {
    tithi,
    nakshatra,
    yoga,
    karana,
    vara,
    sunTimes,
    brahmaMuhurta,
    nishitaKala,
    rahuKala,
    yamagandam,
    pradosham,
    // Шиваитские маркеры
    isArdraNakshatra,
    isShivaYoga,
    isSomvar,
  };
}

// ════════════════════════════════════════════════════════
//  БЛИЖАЙШИЕ СОБЫТИЯ
// ════════════════════════════════════════════════════════

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
    const nakshatra = getNakshatra(checkDate);
    const dayOfWeek = checkDate.getUTCDay();

    // ── ПРАДОШАМ (13-й титхи) ──
    if (tithi.number === 13) {
      const pradosham = getPradoshamDetails(checkDate, location);
      if (pradosham) {
        const dayName = dayOfWeek === 6 ? 'Шани Прадошам (Суббота)' :
                        dayOfWeek === 1 ? 'Сома Прадошам (Понедельник)' : 'Прадошам';
        events.push({
          type: 'pradosham', title: dayName, date: checkDate,
          description: 'Благоприятное время для поклонения Шиве. Пуджа в Прадоша Калу.',
          details: pradosham, importance: 'high',
        });
      }
    }

    // ── МАСА ШИВАРАТРИ (Кришна 14) ──
    if (!tithi.isShukla && tithi.number === 14) {
      events.push({
        type: 'shivaratri', title: 'Маса Шиваратри', date: checkDate,
        description: 'Ежемесячная Шиваратри. Ночь бдения и медитации на Шиву.',
        details: null, importance: 'high',
      });
    }

    // ── БХАЙРАВА АШТАМИ (Кришна 8 — Калаштами) ──
    if (!tithi.isShukla && tithi.number === 8) {
      events.push({
        type: 'bhairava', title: 'Калаштами (Бхайрава Аштами)', date: checkDate,
        description: 'День почитания Бхайравы — гневной формы Шивы. Пуджа и медитация.',
        details: null, importance: 'medium',
      });
    }

    // ── ЭКАДАШИ (11-й титхи) ──
    if (tithi.number === 11) {
      events.push({
        type: 'ekadashi', title: `Экадаши (${tithi.isShukla ? 'Шукла' : 'Кришна'})`, date: checkDate,
        description: 'День поста и духовной практики. Воздержание от зерновых.',
        details: null, importance: 'medium',
      });
    }

    // ── ПУРНИМА (Шукла 15) ──
    if (tithi.isShukla && tithi.number === 15) {
      events.push({
        type: 'purnima', title: 'Пурнима (Полнолуние)', date: checkDate,
        description: 'Полнолуние. Благоприятный день для духовных практик и пуджи.',
        details: null, importance: 'medium',
      });
    }

    // ── АМАВАСЬЯ (Кришна 15) ──
    if (!tithi.isShukla && tithi.number === 15) {
      const isSomavati = dayOfWeek === 1;
      events.push({
        type: isSomavati ? 'somavati_amavasya' : 'amavasya',
        title: isSomavati ? 'Сомавати Амавасья 🕉' : 'Амавасья (Новолуние)',
        date: checkDate,
        description: isSomavati
          ? 'Новолуние в понедельник — особо священна для Шивы.'
          : 'Новолуние. День поминовения предков (Питри Тарпана).',
        details: null, importance: isSomavati ? 'high' : 'medium',
      });
    }

    // ── САНКАШТИ ЧАТУРТХИ (Кришна 4) ──
    if (!tithi.isShukla && tithi.number === 4) {
      events.push({
        type: 'chaturthi', title: 'Санкашти Чатуртхи', date: checkDate,
        description: 'День почитания Ганеши. Пост до восхода Луны.',
        details: null, importance: 'low',
      });
    }

    // ── НАКШАТРА АРДРА (управляется Рудрой/Шивой) ──
    if (nakshatra.isArdra) {
      // Проверяем, не добавили ли уже (Ардра длится ~1 день)
      const alreadyAdded = events.some(e => e.type === 'ardra' && Math.abs(e.date.getTime() - checkDate.getTime()) < 24*60*60*1000);
      if (!alreadyAdded) {
        events.push({
          type: 'ardra', title: 'Луна в накшатре Ардра 🕉', date: checkDate,
          description: 'Ардра управляется Рудрой (Шивой). Мощный день для абхишеки и мантр.',
          details: null, importance: 'high',
        });
      }
    }

    if (events.length >= 12) break;
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}
