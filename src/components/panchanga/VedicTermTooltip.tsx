'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Info } from 'lucide-react';
import glossaryData from '../../../vedic_glossary_database.json';

interface GlossaryEntry {
  title: string;
  description: string;
  favorable?: string;
  unfavorable?: string;
}

const typedGlossary = glossaryData as Record<string, GlossaryEntry>;

const keyMap: Record<string, string> = {
  // Pakshas
  "растущая луна": "shukla_paksha",
  "убывающая луна": "krishna_paksha",
  "шукла пакша": "shukla_paksha",
  "кришна пакша": "krishna_paksha",

  // Tithis (names and numbers)
  "пратипада": "tithi_1",
  "двития": "tithi_2",
  "тритья": "tithi_3",
  "чатуртхи": "tithi_4",
  "панчами": "tithi_5",
  "шашти": "tithi_6",
  "саптами": "tithi_7",
  "аштами": "tithi_8",
  "навами": "tithi_9",
  "дашами": "tithi_10",
  "экадаши": "tithi_11",
  "двадаши": "tithi_12",
  "трайодаши": "tithi_13",
  "чатурдаши": "tithi_14",
  "пурнима": "purnima",
  "полнолуние": "purnima",
  "амавасья": "amavasya",
  "новолуние": "amavasya",

  // Nakshatras
  "ашвини": "ashvini",
  "бхарани": "bharani",
  "криттика": "krittika",
  "рохини": "rohini",
  "мригашира": "mrigashira",
  "ардра": "ardra",
  "пунарвасу": "punarvasu",
  "пушья": "pushya",
  "ашлеша": "ashlesha",
  "магха": "magha",
  "пурвапхалгуни": "purva_phalguni",
  "пурва пхалгуни": "purva_phalguni",
  "уттарапхалгуни": "uttara_phalguni",
  "уттара пхалгуни": "uttara_phalguni",
  "хаста": "hasta",
  "читра": "chitra",
  "свати": "svati",
  "вишакха": "vishakha",
  "анурадха": "anuradha",
  "джьештха": "jyeshtha",
  "мула": "mula",
  "пурвашадха": "purva_ashadha",
  "пурва ашадха": "purva_ashadha",
  "уттарашадха": "uttara_ashadha",
  "уттара ашадха": "uttara_ashadha",
  "шравана": "shravana",
  "дханишта": "dhanishta",
  "шатабхиша": "shatabhisha",
  "пурвабхадрапада": "purva_bhadrapada",
  "пурва бхадрапада": "purva_bhadrapada",
  "уттарабхадрапада": "uttara_bhadrapada",
  "уттара бхадрапада": "uttara_bhadrapada",
  "ревати": "revati",

  // Yogas
  "вишкамбха": "vishkambha",
  "прити": "priti",
  "аюшман": "ayushman",
  "саубхагья": "saubhagya",
  "шобхана": "shobhana",
  "атиганда": "atiganda",
  "сукарма": "sukarma",
  "дхрити": "dhriti",
  "шула": "shula",
  "ганда": "ganda",
  "вриддхи": "vriddhi",
  "дхрува": "dhruva",
  "вьягхата": "vyaghata",
  "харшана": "harshana",
  "ваджра": "vajra",
  "сиддхи": "siddhi",
  "вьятипата": "vyatipata",
  "вариян": "variyan",
  "паригха": "parigha",
  "шива": "shiva",
  "сиддха": "siddha",
  "садхья": "sadhya",
  "шубха": "shubha",
  "шукла": "shukla",
  "брахма": "brahma",
  "индра": "indra",
  "вайдхрити": "vaidhriti",

  // Karanas
  "бава": "bava",
  "балава": "balava",
  "каулава": "kaulava",
  "тайтила": "taitila",
  "гара": "gara",
  "ваниджа": "vanija",
  "вишти": "vishti",
  "бхадра": "vishti",
  "шакуни": "shakuni",
  "чатушпада": "chatushpada",
  "нага": "naga",
  "кинтугхна": "kintughna",

  // Varas
  "понедельник": "somavara",
  "вторник": "mangala_vara",
  "среда": "budha_vara",
  "четверг": "guru_vara",
  "пятница": "shukra_vara",
  "суббота": "shani_vara",
  "воскресенье": "ravivara",

  // Rashis (signs)
  "овен": "mesha",
  "телец": "vrishabha",
  "близнецы": "mithuna",
  "рак": "karka",
  "лев": "simha",
  "дева": "kanya",
  "весы": "tula",
  "скорпион": "vrischika",
  "стрелец": "dhanu",
  "козерог": "makara",
  "водолей": "kumbha",
  "рыбы": "meena",
  "меша": "mesha",
  "вришхабха": "vrishabha",
  "милла": "mithuna",
  "кумха": "kumbha",

  // Muhurtas / Kalas
  "брахмамухурта": "brahma_muhurta",
  "брахма-мухурта": "brahma_muhurta",
  "абхиджитмухурта": "abhijit_muhurta",
  "абхиджит-мухурта": "abhijit_muhurta",
  "раху кала": "rahu_kala",
  "рахукала": "rahu_kala",
  "ямагандам": "yamagandam",
  "гулика кала": "gulika_kala",
  "гуликакала": "gulika_kala",
  "прадоша кала": "pradosha_kala",
  "прадошакала": "pradosha_kala",
  "нишита кала": "nishita_kala",
  "нишитакала": "nishita_kala",

  // Festivals
  "махашиваратри": "maha_shivaratri",
  "маха шиваратри": "maha_shivaratri",
  "васанта наваратри": "vasanta_navaratri",
  "шарад наваратри": "sharad_navaratri",
  "гуру пурнима": "guru_purnima",
  "картик пурнима": "kartik_purnima",
  "трипурари пурнима": "kartik_purnima",
  "ганеш чатуртхи": "ganesh_chaturthi",
  "ганеша чатуртхи": "ganesh_chaturthi",
  "дивали": "diwali",
  "санкранти": "sankranti",
  "сурья санкранти": "sankranti",
  "хануман джаянти": "hanuman_jayanti",
  "кубера джаянти": "kubera_jayanti",
  "дхантерас": "dhanteras",
  "дхантрайодаши": "dhanteras",
  "шани джаянти": "shani_jayanti",
  "ганга дашара": "ganga_dussehra",
  "ганга дахара": "ganga_dussehra",

  // Lunar Months (Masa)
  "чайтра": "month_chaitra",
  "месяц чайтра": "month_chaitra",
  "чайтра маса": "month_chaitra",
  "вайшакха": "month_vaishakha",
  "месяц вайшакха": "month_vaishakha",
  "вайшакха маса": "month_vaishakha",
  "месяц джьештха": "month_jyeshtha",
  "джьештха маса": "month_jyeshtha",
  "ашадха": "month_ashadha",
  "месяц ашадха": "month_ashadha",
  "ашадха маса": "month_ashadha",
  "месяц шравана": "month_shravana",
  "шравана masa": "month_shravana",
  "шравана маса": "month_shravana",
  "бхадрапада": "month_bhadrapada",
  "месяц бхадрапада": "month_bhadrapada",
  "бхадрапада маса": "month_bhadrapada",
  "ашвина": "month_ashvina",
  "месяц ашвина": "month_ashvina",
  "ашвина маса": "month_ashvina",
  "картика": "month_kartika",
  "месяц картика": "month_kartika",
  "картика маса": "month_kartika",
  "маргаширша": "month_margashirsha",
  "месяц маргаширша": "month_margashirsha",
  "маргаширша маса": "month_margashirsha",
  "пауша": "month_pausha",
  "месяц пауша": "month_pausha",
  "пауша маса": "month_pausha",
  "месяц магха": "month_magha",
  "магха маса": "month_magha",
  "пхалгуна": "month_phalguna",
  "месяц пхалгуна": "month_phalguna",
  "пхалгуна маса": "month_phalguna"
};

const fallbackGlossary: Record<string, GlossaryEntry> = {
  "maha_shivaratri": {
    title: "Махашиваратри 🔱",
    description: "Великая ночь Шивы. Самый священный день в году для почитателей Шивы. Время строгого поста, молитв, воспевания мантры «Ом Намах Шивая» и медитации. Считается, что искреннее поклонение в эту ночь освобождает душу от оков кармы.",
    favorable: "Слушание и пение мантр, всенощное бдение (джагаран), предложение Шиве листьев бильвы, молока и воды (абхишека), строгий пост.",
    unfavorable: "Сон в ночное время, переедание, употребление зернобобовых и невегетарианской пищи, ссоры."
  },
  "vasanta_navaratri": {
    title: "Васанта Наваратри 🌸",
    description: "Весенний фестиваль Божественной Матери (Деви). Девять дней, символизирующих пробуждение природы и празднующих победу Шакти (женской божественной энергии) над силами невежества. Посвящен поклонению различным формам Дурги.",
    favorable: "Чтение священных текстов (Деви Махатмья), медитация на Богиню, совершение пудж, пост на фруктах и молоке.",
    unfavorable: "Грубость, злость, употребление тяжелой пищи, начало агрессивных действий."
  },
  "sharad_navaratri": {
    title: "Шарад Наваратри 🌺",
    description: "Главный осенний фестиваль Божественной Матери. Девять священных ночей года, посвященные различным ипостасям Деви (Дурге, Лакшми и Сарасвати). Символизирует очищение ума, обретение духовных богатств и мудрости.",
    favorable: "Поклонение Деви, пение бхаджанов, аскезы, соблюдение чистоты мыслей и тела.",
    unfavorable: "Ссоры в семье, эгоистичные поступки, употребление алкоголя и невегетарианской пищи."
  },
  "guru_purnima": {
    title: "Гуру Пурнима 🕉",
    description: "День выражения почтения и благодарности духовным учителям (Гуру), наставникам и мудрецу Вьясе (автору Вед). Полнолуние в месяце Ашадха считается моментом излияния особой милости учителей на своих учеников.",
    favorable: "Посещение учителей, принесение даров (дакшина), изучение священных писаний, благотворительность, медитация на стопы Гуру.",
    unfavorable: "Проявление неуважения к старшим и наставникам, гордость, споры."
  },
  "kartik_purnima": {
    title: "Картик Пурнима 🔱",
    description: "Священное полнолуние в месяце Картика, также известное как Трипурари Пурнима. В этот день Господь Шива уничтожил три демонических города (Трипура) одной стрелой, восстановив гармонию во вселенной.",
    favorable: "Омовение в священных реках, зажигание масляных или глиняных лампад (дип) в храмах и у водоемов, поклонение Шиве и Вишну.",
    unfavorable: "Гнев, насилие, причинение вреда живым существам, ложь."
  },
  "ganesh_chaturthi": {
    title: "Ганеша Чатуртхи 🐘",
    description: "День явления Господа Ганеши — сына Шивы и Парвати, повелителя ганов и устранителя любых препятствий на пути к духовному и материальному благу.",
    favorable: "Поклонение Ганеше (Ганеша-пуджа), предложение сладостей (модаков), чтение мантры «Ом Гам Ганапатайе Намах», начало новых добрых дел.",
    unfavorable: "Смотреть на Луну в этот вечер (по легенде, это приносит ложные обвинения), уныние, лень."
  },
  "diwali": {
    title: "Дивали 🪔",
    description: "Великий ведический фестиваль огней. Символизирует победу добра над злом, знания над невежеством и света над тьмой. Связан с возвращением Господа Рамы в Айодхью и почитанием Богини процветания Лакшми.",
    favorable: "Уборка и украшение дома, зажигание лампад и свечей, совершение Лакшми-пуджи, дарение подарков, прощение обид.",
    unfavorable: "Пребывание в темноте и унынии, жадность, ссоры."
  },
  "sankranti": {
    title: "Сурья Санкранти ☀️",
    description: "Момент перехода Солнца из одного знака зодиака в другой (Раши Санкранти). Это время трансформации, когда космические энергии нестабильны. Рекомендуется посвятить этот день духовным практикам, а не материальным делам.",
    favorable: "Чтение священных писаний, джапа (повторение мантр), медитация, раздача милостыни, поминовение предков.",
    unfavorable: "Начало важных проектов, крупные покупки, путешествия, подписание договоров."
  },
  "hanuman_jayanti": {
    title: "Хануман Джаянти 🐒",
    description: "День явления Господа Ханумана — божественного преданного Господа Рамы, символа безграничной верности, преданности, силы и мужества.",
    favorable: "Чтение Хануман Чалисы и Рамаяны, повторение мантр Раме и Хануману, благотворительность, пост, подношение Хануману сладостей и цветов.",
    unfavorable: "Проявление лени, неуважение к старшим, ложь, употребление невегетарианской пищи."
  },
  "kubera_jayanti": {
    title: "Кубера Джаянти 💰",
    "description": "День явления Господа Куберы — божественного казначея и хранителя сокровищ Вселенной. В этот день молятся о мудром управлении финансами и процветании.",
    "favorable": "Молитвы и пуджи Кубере и Лакшми, уборка дома, планирование бюджета, покупка сейфа или шкатулки для денег, благотворительность.",
    "unfavorable": "Жадность, скупость, участие в азартных играх, ссоры из-за денег."
  },
  "dhanteras": {
    title: "Дхантерас (Дхантрайодаши) 🪔",
    description: "Первый день празднования Дивали, посвященный призыву процветания. Также день явления Дханвантари (бога медицины и Аюрведы) и поклонения Кубере.",
    favorable: "Покупка посуды, металлических изделий, золота или серебра, зажигание лампад у входа в дом, покупка веника (символа очищения), аюрведические процедуры.",
    unfavorable: "Оформление кредитов, возврат долгов в этот день, покупка острых предметов (ножей, ножниц), проявление уныния."
  },
  "shani_jayanti": {
    title: "Шани Джаянти 🪐",
    description: "День явления Шанидева (планеты Сатурн) — великого судьи и владыки кармы. Благоприятное время для практик, гармонизирующих влияние Сатурна в гороскопе.",
    favorable: "Повторение мантр Шани, аскеза, помощь нуждающимся и пожилым людям, подношение черного кунжута или горчичного масла.",
    unfavorable: "Нарушение обещаний, несправедливость, лень, начало эгоистичных материальных дел."
  },
  "ganga_dussehra": {
    title: "Ганга Дашара 🌊",
    description: "Праздник нисхождения священной реки Ганги с небес на Землю благодаря аскезе царя Бхагиратхи. Считается, что омовение в Ганге в этот день смывает грехи.",
    favorable: "Омовение в священных реках или добавление капли воды Ганги в ванну, молитвы богине Ганге, пожертвования (особенно 10 видов даров), медитация.",
    unfavorable: "Загрязнение воды, проявление агрессии, совершение неблаговидных поступков."
  }
};

function getGlossaryKey(termId?: string, termName?: string): string | null {
  if (termId && (typedGlossary[termId] || fallbackGlossary[termId])) return termId;
  if (!termName) return null;

  const raw = termName.toLowerCase().trim();
  
  // Try exact match first
  if (keyMap[raw] && (typedGlossary[keyMap[raw]] || fallbackGlossary[keyMap[raw]])) return keyMap[raw];

  // Clean special characters
  const clean = raw.replace(/[^a-zа-я0-9\-_\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (keyMap[clean] && (typedGlossary[keyMap[clean]] || fallbackGlossary[keyMap[clean]])) return keyMap[clean];

  // Check parts (e.g. "Меша (Овен)" -> check "меша" and "овен")
  const parts = raw.split(/[\s()]+/);
  for (const part of parts) {
    const cleanPart = part.replace(/[^a-zа-я0-9\-_\s]/g, '').trim();
    if (cleanPart && keyMap[cleanPart] && (typedGlossary[keyMap[cleanPart]] || fallbackGlossary[keyMap[cleanPart]])) {
      return keyMap[cleanPart];
    }
  }

  return null;
}

interface VedicTermTooltipProps {
  termId?: string;
  termName?: string;
  disableHover?: boolean;
  children: React.ReactNode;
}

export default function VedicTermTooltip({ termId, termName, disableHover = false, children }: VedicTermTooltipProps) {
  const [key, setKey] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const triggerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Detect touch device
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);

    // Resolve glossary key
    let resolvedName = termName;
    if (!resolvedName && typeof children === 'string') {
      resolvedName = children;
    }
    setKey(getGlossaryKey(termId, resolvedName));
  }, [termId, termName, children]);

  if (!key) {
    return <>{children}</>;
  }

  const entry = typedGlossary[key];

  const handleMouseEnter = () => {
    if (isTouchDevice || disableHover) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2
      });
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    // If it's a link or we're on mobile/touch, open details modal
    if (isTouchDevice || disableHover) {
      e.preventDefault();
      e.stopPropagation();
      setIsMobileOpen(true);
    }
  };

  const renderTrigger = () => {
    if (typeof children === 'string' || typeof children === 'number') {
      return (
        <span
          ref={triggerRef as React.RefObject<HTMLSpanElement>}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="border-b border-dashed border-[#C9A227]/50 cursor-pointer hover:text-[#E8D48B] hover:border-[#C9A227] transition-all inline-block"
        >
          {children}
        </span>
      );
    }

    try {
      const child = React.Children.only(children) as React.ReactElement<any>;
      return React.cloneElement(child, {
        ref: triggerRef,
        onMouseEnter: (e: any) => {
          handleMouseEnter();
          child.props.onMouseEnter?.(e);
        },
        onMouseLeave: (e: any) => {
          handleMouseLeave();
          child.props.onMouseLeave?.(e);
        },
        onClick: (e: any) => {
          handleClick(e);
          child.props.onClick?.(e);
        }
      });
    } catch (e) {
      return (
        <span
          ref={triggerRef as React.RefObject<HTMLSpanElement>}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="border-b border-dashed border-[#C9A227]/50 cursor-pointer hover:text-[#E8D48B] hover:border-[#C9A227] transition-all inline-block"
        >
          {children}
        </span>
      );
    }
  };

  return (
    <>
      {renderTrigger()}

      {/* Desktop Hover Tooltip */}
      {isHovered && coords && !isTouchDevice && !disableHover && createPortal(
        <div
          style={{
            position: 'absolute',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: 'translate(-50%, -100%)',
            marginBottom: '8px'
          }}
          className="z-[9999] w-80 p-5 rounded-2xl bg-[#0D0A0B]/95 backdrop-blur-xl border border-[#C9A227]/30 shadow-[0_10px_40px_rgba(0,0,0,0.85)] animate-in fade-in zoom-in-95 duration-250 text-[#F5ECD7] pointer-events-none"
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#C9A227]/10">
            <Info className="w-4 h-4 text-[#C9A227]" />
            <h4 className="font-semibold text-sm text-[#E8D48B] tracking-wide">{entry.title}</h4>
          </div>
          <p className="text-xs text-[#F5ECD7]/80 leading-relaxed mb-3 font-light">{entry.description}</p>
          
          {entry.favorable && (
            <div className="mt-2 text-[11px] text-emerald-400/90 leading-normal flex items-start gap-1">
              <span className="font-bold shrink-0">✓</span>
              <span><strong>Благоприятно:</strong> {entry.favorable}</span>
            </div>
          )}
          
          {entry.unfavorable && (
            <div className="mt-1 text-[11px] text-red-400/90 leading-normal flex items-start gap-1">
              <span className="font-bold shrink-0">✗</span>
              <span><strong>Неблагоприятно:</strong> {entry.unfavorable}</span>
            </div>
          )}

          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-[#0D0A0B] border-r border-b border-[#C9A227]/30 transform rotate-45"></div>
        </div>,
        document.body
      )}

      {/* Mobile Bottom Sheet Drawer */}
      {isMobileOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setIsMobileOpen(false)} />
          
          <div className="relative w-full max-w-md bg-[#0D0A0B]/98 border-t border-[#C9A227]/30 rounded-t-3xl p-6 shadow-[0_-10px_35px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom duration-300 flex flex-col gap-4 text-[#F5ECD7]">
            {/* Drag Handle Decoration */}
            <div className="w-12 h-1.5 rounded-full bg-white/10 mx-auto -mt-2 mb-2" />
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#C9A227]/10 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#C9A227]" />
                <h4 className="font-semibold text-lg text-[#E8D48B] tracking-wide">{entry.title}</h4>
              </div>
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="p-2 text-[#F5ECD7]/60 hover:text-white rounded-full hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <p className="text-sm text-[#F5ECD7]/80 leading-relaxed font-light">{entry.description}</p>
            
            {entry.favorable && (
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
                <p className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <span>✓</span> Благоприятно
                </p>
                <p className="text-xs text-emerald-200/80 leading-relaxed">{entry.favorable}</p>
              </div>
            )}
            
            {entry.unfavorable && (
              <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1.5">
                  <span>✗</span> Неблагоприятно
                </p>
                <p className="text-xs text-red-200/80 leading-relaxed">{entry.unfavorable}</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
