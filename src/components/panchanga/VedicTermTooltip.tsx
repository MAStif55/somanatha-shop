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
  "нишитакала": "nishita_kala"
};

function getGlossaryKey(termId?: string, termName?: string): string | null {
  if (termId && typedGlossary[termId]) return termId;
  if (!termName) return null;

  const raw = termName.toLowerCase().trim();
  
  // Try exact match first
  if (keyMap[raw] && typedGlossary[keyMap[raw]]) return keyMap[raw];

  // Clean special characters
  const clean = raw.replace(/[^a-zа-я0-9\-_\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (keyMap[clean] && typedGlossary[keyMap[clean]]) return keyMap[clean];

  // Check parts (e.g. "Меша (Овен)" -> check "меша" and "овен")
  const parts = raw.split(/[\s()]+/);
  for (const part of parts) {
    const cleanPart = part.replace(/[^a-zа-я0-9\-_\s]/g, '').trim();
    if (cleanPart && keyMap[cleanPart] && typedGlossary[keyMap[cleanPart]]) {
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
