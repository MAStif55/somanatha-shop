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
                                        px-4 py-2.5 rounded-lg border-2 transition-all duration-200
                                        flex flex-col items-center min-w-[100px]
                                        ${isSelected
                                            ? 'border-[#C9A227] bg-[#C9A227]/10 text-[#E8D48B] shadow-[0_0_15px_rgba(201,162,39,0.2)]'
                                            : 'border-[#F5ECD7]/20 bg-[#0D0A0B]/50 text-[#F5ECD7]/80 hover:border-[#C9A227]/50 hover:text-[#F5ECD7]'
                                        }
                                    `}
                                >
                                    <span className="font-medium text-sm">
                                        {option.label[locale]}
                                    </span>
                                    {option.priceModifier !== 0 && (
                                        <span className={`text-xs mt-1 ${isSelected ? 'text-[#C9A227]' : 'text-[#F5ECD7]/50'}`}>
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
