'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutSnippet() {
    const { locale } = useLanguage();

    return (
        <section className="py-16 sm:py-24 px-4 sm:px-6 bg-parchment-texture bg-[#0D0A0B] relative overflow-hidden">
            {/* Gradient Overlay to fade into footer */}
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0D0A0B] to-transparent z-10 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                    {/* Text Content */}
                    <div className="text-center lg:text-left">
                        <span className="text-[#C9A227] font-bold tracking-[0.2em] uppercase text-xs sm:text-sm mb-4 block">
                            {locale === 'ru' ? 'НАШ ПОДХОД' : 'Our Approach'}
                        </span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-ornamental text-[#E8D48B] text-glow-gold mb-6 sm:mb-8 leading-tight">
                            {locale === 'ru'
                                ? 'Древние знания в безупречном исполнении'
                                : 'Ancient Knowledge in Flawless Execution'}
                        </h2>
                        <div className="space-y-4 sm:space-y-6 text-[#F5ECD7]/70 text-base sm:text-lg leading-relaxed font-light">
                            <p>
                                {locale === 'ru'
                                    ? 'Соманатха — это проект, где сакральная геометрия обретает материальную форму. Мы создаем янтры и кавачи, опираясь на строгие ведические каноны и глубокое понимание астрологии.'
                                    : 'Somanatha is a project where sacred geometry takes material form. We create Yantras and Kavachas based on strict Vedic canons and a deep understanding of astrology.'}
                            </p>
                            <p>
                                {locale === 'ru'
                                    ? 'Для нас важен не только точный расчет, но и эстетика. Каждый артефакт изготавливается в благоприятные астрологические дни из высококачественных материалов с особым вниманием к деталям, чтобы служить долго и радовать глаз.'
                                    : 'For us, it is not only about precise calculation, but also aesthetics. Each artifact is crafted on auspicious astrological days from high-quality materials with special attention to detail, to serve long and please the eye.'}
                            </p>
                        </div>


                    </div>

                    {/* Visual Placeholder */}
                    <div className="relative">
                        <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-[#C9A227]/20 relative">
                            {/* Abstract Gradient Art representing 'Somanatha' vibe */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#8B6914] via-[#2D1B1F] to-[#0D0A0B]"></div>

                            {/* Mandala overlay - Complex Sacred Geometry */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-40">
                                {/* Rotating Outer Ring */}
                                <svg className="w-[140%] h-[140%] animate-spin-slow-reverse opacity-30 absolute" viewBox="0 0 200 200" fill="none" stroke="#C9A227" strokeWidth="0.2">
                                    <circle cx="100" cy="100" r="95" strokeDasharray="4 4" />
                                    <circle cx="100" cy="100" r="85" />
                                    {/* Petal-like curves */}
                                    <path d="M100 5 Q130 5 130 35 T160 65 T190 95" strokeOpacity="0.5" />
                                    <path d="M100 195 Q70 195 70 165 T40 135 T10 105" strokeOpacity="0.5" />
                                </svg>

                                {/* Main Geometric Structure */}
                                <svg className="w-[85%] h-[85%] animate-spin-slow" viewBox="0 0 200 200" fill="none" stroke="#C9A227" strokeWidth="0.8">
                                    {/* Concentric Circles */}
                                    <circle cx="100" cy="100" r="98" strokeOpacity="0.2" />
                                    <circle cx="100" cy="100" r="70" strokeOpacity="0.4" />

                                    {/* Intersecting Squares (Star) */}
                                    <rect x="55" y="55" width="90" height="90" transform="rotate(45 100 100)" strokeOpacity="0.6" />
                                    <rect x="55" y="55" width="90" height="90" transform="rotate(0 100 100)" strokeOpacity="0.6" />

                                    {/* Inner Triangles - Simplified Sri Yantra feel */}
                                    <polygon points="100,30 160,140 40,140" strokeOpacity="0.8" />
                                    <polygon points="100,170 160,60 40,60" strokeOpacity="0.8" />

                                    {/* Central Bindu */}
                                    <circle cx="100" cy="100" r="3" fill="#C9A227" />
                                </svg>
                            </div>

                            <div className="absolute bottom-8 left-8 right-8 p-6 bg-[#0D0A0B]/80 backdrop-blur-md border border-[#C9A227]/30 rounded-xl">
                                <p className="font-elegant italic text-[#F5ECD7] text-center text-xl">
                                    "Om Namah Shivaya"
                                </p>
                            </div>
                        </div>

                        {/* Decorative background circle */}
                        <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border border-[#C9A227]/10 rounded-full"></div>
                    </div>
                </div>
            </div>
        </section >
    );
}
