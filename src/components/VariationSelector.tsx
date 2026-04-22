'use client';

import { VariationGroup, VariationOption } from '@/types/product';
import { SelectedVariation } from '@/types/order';
import { formatPrice } from '@/utils/currency';

interface VariationSelectorProps {
    variations: VariationGroup[];
    selectedVariations: Record<string, string>; // groupId -> optionId
    onSelectionChange: (selectedVariations: Record<string, string>, details: SelectedVariation[]) => void;
    locale: 'en' | 'ru';
}

export default function VariationSelector({
    variations,
    selectedVariations,
    onSelectionChange,
    locale
}: VariationSelectorProps) {
    const handleSelect = (groupId: string, optionId: string) => {
        const newSelection = { ...selectedVariations, [groupId]: optionId };

        // Build the detailed selection info
        const details: SelectedVariation[] = variations.map(group => {
            const selectedOptionId = newSelection[group.id];
            const selectedOption = group.options.find(o => o.id === selectedOptionId);
            if (!selectedOption) return null;
            return {
                groupId: group.id,
                groupName: group.name[locale],
                optionId: selectedOption.id,
                optionLabel: selectedOption.label[locale],
                priceModifier: selectedOption.priceModifier,
            };
        }).filter((d): d is SelectedVariation => d !== null);

        onSelectionChange(newSelection, details);
    };

    if (!variations || variations.length === 0) return null;

    return (
        <div className="space-y-6 mb-8 p-6 bg-[#1A1517]/50 rounded-xl border border-[#C9A227]/20">
            {variations.map((group) => (
                <div key={group.id}>
                    <h4 className="text-sm font-bold text-[#C9A227] uppercase tracking-wider mb-3">
                        {group.name[locale]}
                    </h4>
                    <div className="flex flex-wrap gap-3">
                        {group.options.map((option) => {
                            const isSelected = selectedVariations[group.id] === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleSelect(group.id, option.id)}
                                    className={`
                                        relative group/pill
                                        px-4 py-2.5 rounded-lg border-2 transition-all duration-200
                                        flex flex-col items-center min-w-[100px]
                                        ${isSelected
                                            ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#E8D48B] shadow-[0_0_15px_rgba(201,162,39,0.2)]'
                                            : 'border-[#F5ECD7]/20 bg-[#0D0A0B]/50 text-[#F5ECD7]/80 hover:border-[#C9A227]/50 hover:text-[#F5ECD7]'
                                        }
                                    `}
                                >
                                    {(option.image || option.imageUrl) && (
                                        <>
                                            {/* Hover Pop-up Tooltip */}
                                            <div className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 opacity-0 pointer-events-none group-hover/pill:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/pill:translate-y-0 z-[100] flex flex-col items-center">
                                                <div className="w-48 aspect-square rounded-xl overflow-hidden border-2 border-[#C9A227] shadow-[0_15px_40px_rgba(0,0,0,0.8)] relative bg-[#0D0A0B]">
                                                    <img 
                                                        src={option.image?.url || option.imageUrl} 
                                                        alt={option.label[locale]} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-6 text-center text-[#E8D48B] font-medium text-xs">
                                                        {option.label[locale]}
                                                    </div>
                                                </div>
                                                {/* Golden Triangle Arrow */}
                                                <div className="w-3 h-3 bg-[#C9A227] transform rotate-45 -mt-1.5 shadow-lg"></div>
                                            </div>

                                            <div className={`w-12 h-12 mb-2 rounded-full overflow-hidden border transition-all duration-300 ${isSelected ? 'border-[#C9A227] shadow-[0_0_10px_rgba(201,162,39,0.3)]' : 'border-[#F5ECD7]/20 group-hover/pill:border-[#C9A227]/50'}`}>
                                                <img 
                                                    src={option.image?.thumbUrl || option.image?.url || option.imageUrl} 
                                                    alt={option.label[locale]} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            </div>
                                        </>
                                    )}
                                    <span className="font-medium text-sm text-center">
                                        {option.label[locale]}
                                    </span>
                                    {option.priceModifier !== 0 && (
                                        <span className={`text-xs mt-1 text-center ${isSelected ? 'text-[#C9A227]' : 'text-[#F5ECD7]/50'}`}>
                                            {option.priceModifier > 0 ? '+' : ''}{formatPrice(option.priceModifier)}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
