'use client';

import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, MoonStar, Sun, Sparkles, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { GeoLocation, getUpcomingEvents } from '@/lib/astrology/calculations';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday
} from 'date-fns';
import { ru } from 'date-fns/locale';
import PushSettingsModal from './PushSettingsModal';

interface UpcomingEventsProps {
    location: GeoLocation;
}

const eventStyles: Record<string, { icon: React.ReactNode; bg: string; border: string, dot: string }> = {
    pradosham:          { icon: <span className="text-xl leading-none">🕉</span>, bg: 'bg-[#C9A227]/10', border: 'border-[#C9A227]/25', dot: 'bg-[#C9A227] shadow-[0_0_5px_#C9A227]' },
    shivaratri:         { icon: <span className="text-xl leading-none">🕉</span>, bg: 'bg-[#C9A227]/10', border: 'border-[#C9A227]/25', dot: 'bg-[#C9A227] shadow-[0_0_5px_#C9A227]' },
    somavati_amavasya:  { icon: <span className="text-xl leading-none">🕉</span>, bg: 'bg-[#C9A227]/10', border: 'border-[#C9A227]/25', dot: 'bg-[#C9A227] shadow-[0_0_5px_#C9A227]' },
    ekadashi:           { icon: <Sparkles className="w-5 h-5 text-emerald-400" />, bg: 'bg-emerald-500/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400 shadow-[0_0_5px_#34d399]' },
    purnima:            { icon: <Sun className="w-5 h-5 text-amber-300" />, bg: 'bg-amber-500/10', border: 'border-amber-400/20', dot: 'bg-amber-300 shadow-[0_0_5px_#fcd34d]' },
    amavasya:           { icon: <MoonStar className="w-5 h-5 text-indigo-300" />, bg: 'bg-indigo-500/10', border: 'border-indigo-400/20', dot: 'bg-indigo-400 shadow-[0_0_5px_#818cf8]' },
    chaturthi:          { icon: <span className="text-xl leading-none">🐘</span>, bg: 'bg-orange-500/10', border: 'border-orange-400/20', dot: 'bg-orange-400 shadow-[0_0_5px_#fb923c]' },
};

export default function UpcomingEvents({ location }: UpcomingEventsProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isPushModalOpen, setIsPushModalOpen] = useState(false);
    const [reminderEventName, setReminderEventName] = useState<string | undefined>(undefined);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    // We get events starting from the grid start date. 45 days is enough to cover any calendar month view.
    const allEvents = useMemo(() => {
        // Set time to noon to avoid timezone shift edge cases when calling startOfWeek
        const searchDate = new Date(startDate);
        searchDate.setHours(12, 0, 0, 0);
        return getUpcomingEvents(searchDate, 45, location);
    }, [startDate, location]);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const monthEvents = useMemo(() => {
        return allEvents.filter(e => isSameMonth(e.date, monthStart));
    }, [allEvents, monthStart]);

    const nextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
        setSelectedDate(null);
    };
    
    const prevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
        setSelectedDate(null);
    };
    
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    return (
        <>
            <div className="relative rounded-2xl overflow-hidden border border-[#C9A227]/15 bg-[#1A1517] flex flex-col xl:flex-row shadow-[0_0_40px_rgba(201,162,39,0.05)]">
                
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-64 h-32 rounded-full bg-[#C9A227] opacity-5 blur-[60px] pointer-events-none" />

                {/* Calendar Side */}
                <div className="xl:w-[450px] shrink-0 border-b xl:border-b-0 xl:border-r border-[#C9A227]/15 relative z-10"
                     style={{ background: 'linear-gradient(135deg, rgba(45,27,31,0.5) 0%, rgba(26,21,23,0.5) 100%)' }}>
                    
                    <div className="px-6 py-6 border-b border-[#C9A227]/10 flex items-center justify-between">
                        <button onClick={prevMonth} className="p-2 text-[#C9A227]/60 hover:text-[#C9A227] hover:bg-[#C9A227]/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-[#E8D48B] text-lg capitalize tracking-wide font-semibold text-glow-gold select-none">
                            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
                        </h3>
                        <button onClick={nextMonth} className="p-2 text-[#C9A227]/60 hover:text-[#C9A227] hover:bg-[#C9A227]/10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map(day => (
                                <div key={day} className="text-center text-[#F5ECD7]/40 text-xs font-bold uppercase tracking-widest py-2 select-none">
                                    {day}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, idx) => {
                                const dayEvents = allEvents.filter(e => isSameDay(e.date, day));
                                const isCurrentMonth = isSameMonth(day, monthStart);
                                const isSelected = selectedDate && isSameDay(day, selectedDate);
                                const isTodayDate = isToday(day);

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedDate(isSelected ? null : day)}
                                        className={`
                                            relative h-14 w-full rounded-xl flex flex-col items-center justify-center transition-all duration-300
                                            focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50
                                            ${!isCurrentMonth ? 'text-[#F5ECD7]/20 hover:text-[#F5ECD7]/40 hover:bg-white/5' : 'text-[#F5ECD7]/80 hover:bg-[#C9A227]/10 hover:text-[#E8D48B] hover:shadow-[0_0_15px_rgba(201,162,39,0.1)]'}
                                            ${isSelected ? 'bg-[#C9A227]/20 border border-[#C9A227]/50 text-[#E8D48B] shadow-[inset_0_0_15px_rgba(201,162,39,0.2)]' : 'border border-transparent'}
                                            ${isTodayDate && !isSelected ? 'border-[#C9A227]/30 text-[#E8D48B] bg-[#C9A227]/5' : ''}
                                        `}
                                    >
                                        <span className="text-sm font-medium z-10">{format(day, 'd')}</span>
                                        {dayEvents.length > 0 && (
                                            <div className="absolute bottom-1.5 flex gap-1 items-center justify-center">
                                                {dayEvents.slice(0, 3).map((e, i) => (
                                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${eventStyles[e.type]?.dot || eventStyles['amavasya'].dot}`} />
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Events List Side */}
                <div className="flex-1 max-h-[500px] xl:max-h-[600px] overflow-y-auto relative custom-scrollbar z-10 bg-black/20">
                    <div className="sticky top-0 bg-[#1A1517]/95 backdrop-blur-md z-20 px-6 py-4 border-b border-[#C9A227]/10 flex items-center justify-between shadow-sm">
                        <h4 className="text-[#E8D48B] text-sm uppercase tracking-[0.2em] font-bold">
                            {selectedDate ? format(selectedDate, 'd MMMM yyyy', { locale: ru }) : 'Все события месяца'}
                        </h4>
                        <button 
                            onClick={() => {
                                setReminderEventName(undefined);
                                setIsPushModalOpen(true);
                            }}
                            className="flex items-center gap-2 text-xs text-[#C9A227]/80 hover:text-[#C9A227] px-3 py-1.5 rounded-full border border-[#C9A227]/20 hover:bg-[#C9A227]/10 transition-colors"
                        >
                            <Bell className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Настроить пуши</span>
                        </button>
                    </div>

                    <div className="divide-y divide-[#C9A227]/5">
                        {(() => {
                            const eventsToDisplay = selectedDate 
                                ? monthEvents.filter(e => isSameDay(e.date, selectedDate))
                                : monthEvents;

                            if (eventsToDisplay.length === 0) {
                                return (
                                    <div className="px-6 py-20 flex flex-col items-center justify-center text-center opacity-60">
                                        <div className="w-16 h-16 rounded-full bg-[#C9A227]/5 flex items-center justify-center mb-4 border border-[#C9A227]/10">
                                            <CalendarIcon className="w-8 h-8 text-[#C9A227]/50" />
                                        </div>
                                        <p className="text-[#E8D48B] text-base font-semibold mb-1">Нет важных событий</p>
                                        <p className="text-[#F5ECD7]/50 text-sm max-w-[250px]">В выбранный период ведических праздников не предвидится.</p>
                                    </div>
                                );
                            }

                            return eventsToDisplay.map((event, idx) => {
                                const style = eventStyles[event.type] || eventStyles['amavasya'];
                                return (
                                    <div
                                        key={idx}
                                        className="px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:bg-[#C9A227]/5 transition-colors group"
                                    >
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${style.bg} ${style.border} shadow-lg`}>
                                                {style.icon}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <p className="font-semibold text-[#F5ECD7] text-lg group-hover:text-[#E8D48B] transition-colors">{event.title}</p>
                                                    {event.importance === 'high' && (
                                                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border bg-[#C9A227]/15 text-[#C9A227] border-[#C9A227]/30">
                                                            Важно
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[#C9A227]/80 text-sm capitalize mb-1.5 font-medium">
                                                    {format(event.date, 'EEEE, d MMMM', { locale: ru })}
                                                </p>
                                                <p className="text-[#F5ECD7]/50 text-sm max-w-md leading-relaxed">{event.description}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-3 shrink-0 ml-14 sm:ml-0 mt-2 sm:mt-0 w-full sm:w-auto">
                                            {event.type === 'pradosham' && event.details && (
                                                <div className="flex items-center gap-3 bg-[#0D0A0B]/50 px-4 py-2.5 rounded-xl border border-[#C9A227]/15 w-full sm:w-auto justify-between sm:justify-start">
                                                    <span className="text-[#F5ECD7]/40 text-[10px] uppercase tracking-widest font-bold">Пуджа:</span>
                                                    <span className="text-[#C9A227] font-mono text-sm tracking-wide">
                                                        {event.details.pradoshaKalaStart.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit', timeZone: location.timezone})}
                                                        {' – '}
                                                        {event.details.pradoshaKalaEnd.toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit', timeZone: location.timezone})}
                                                    </span>
                                                </div>
                                            )}
                                            {event.type === 'ekadashi' && event.details && (
                                                <div className="flex items-center gap-3 bg-[#0D0A0B]/50 px-4 py-2.5 rounded-xl border border-[#C9A227]/15 w-full sm:w-auto justify-between sm:justify-start">
                                                    <span className="text-[#F5ECD7]/40 text-[10px] uppercase tracking-widest font-bold">Парана:</span>
                                                    <span className="text-[#C9A227] font-mono text-sm tracking-wide">
                                                        {new Date(event.details.paranaStart).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit', timeZone: location.timezone})}
                                                        {' – '}
                                                        {new Date(event.details.paranaEnd).toLocaleTimeString('ru-RU', {hour: '2-digit', minute:'2-digit', timeZone: location.timezone})}
                                                    </span>
                                                </div>
                                            )}
                                            <button 
                                                onClick={() => {
                                                    setReminderEventName(event.title);
                                                    setIsPushModalOpen(true);
                                                }}
                                                className="flex items-center justify-center gap-2 text-xs uppercase tracking-wider font-semibold text-[#1A1517] px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA842C] hover:from-[#E8D48B] hover:to-[#D4AF37] rounded-xl transition-all shadow-[0_0_15px_rgba(201,162,39,0.2)] hover:shadow-[0_0_20px_rgba(201,162,39,0.4)] w-full sm:w-auto"
                                            >
                                                <Bell className="w-4 h-4" />
                                                Напомнить
                                            </button>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            <PushSettingsModal
                isOpen={isPushModalOpen}
                onClose={() => setIsPushModalOpen(false)}
                latitude={location.latitude}
                longitude={location.longitude}
                cityName={location.name || 'Ваш город'}
                reminderEventName={reminderEventName}
            />
        </>
    );
}
