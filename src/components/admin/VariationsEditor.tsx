'use client';

import { useState } from 'react';
import { VariationGroup, VariationOption } from '@/types/product';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import VariationImageUpload from './VariationImageUpload';

interface VariationsEditorProps {
    value: VariationGroup[];
    onChange: (variations: VariationGroup[]) => void;
    locale: 'en' | 'ru';
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const defaultOption = (): VariationOption => ({
    id: generateId(),
    label: { en: '', ru: '' },
    priceModifier: 0,
});

const defaultGroup = (): VariationGroup => ({
    id: generateId(),
    name: { en: '', ru: '' },
    options: [defaultOption()],
});

export default function VariationsEditor({ value, onChange, locale }: VariationsEditorProps) {
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(value.map(g => g.id)));

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) {
                next.delete(groupId);
            } else {
                next.add(groupId);
            }
            return next;
        });
    };

    const addGroup = () => {
        const newGroup = defaultGroup();
        onChange([...value, newGroup]);
        setExpandedGroups(prev => new Set(Array.from(prev).concat(newGroup.id)));
    };

    const removeGroup = (groupId: string) => {
        onChange(value.filter(g => g.id !== groupId));
    };

    const updateGroupName = (groupId: string, lang: 'en' | 'ru', name: string) => {
        onChange(value.map(g =>
            g.id === groupId
                ? { ...g, name: { ...g.name, [lang]: name } }
                : g
        ));
    };

    const addOption = (groupId: string) => {
        onChange(value.map(g =>
            g.id === groupId
                ? { ...g, options: [...g.options, defaultOption()] }
                : g
        ));
    };

    const removeOption = (groupId: string, optionId: string) => {
        onChange(value.map(g =>
            g.id === groupId
                ? { ...g, options: g.options.filter(o => o.id !== optionId) }
                : g
        ));
    };

    const updateOption = (groupId: string, optionId: string, updates: Partial<VariationOption>) => {
        onChange(value.map(g =>
            g.id === groupId
                ? {
                    ...g,
                    options: g.options.map(o =>
                        o.id === optionId ? { ...o, ...updates } : o
                    )
                }
                : g
        ));
    };

    return (
        <div className="space-y-4">
            {value.map((group) => (
                <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    {/* Group Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
                        <div className="flex items-center gap-3 flex-1">
                            <button
                                type="button"
                                onClick={() => toggleGroup(group.id)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                {expandedGroups.has(group.id) ? (
                                    <ChevronUp size={20} />
                                ) : (
                                    <ChevronDown size={20} />
                                )}
                            </button>
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                    type="text"
                                    value={group.name.ru}
                                    onChange={(e) => updateGroupName(group.id, 'ru', e.target.value)}
                                    placeholder={locale === 'ru' ? 'Название группы (RU)' : 'Group name (RU)'}
                                    className="px-3 py-1.5 border rounded text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                                <input
                                    type="text"
                                    value={group.name.en}
                                    onChange={(e) => updateGroupName(group.id, 'en', e.target.value)}
                                    placeholder={locale === 'ru' ? 'Название группы (EN)' : 'Group name (EN)'}
                                    className="px-3 py-1.5 border rounded text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeGroup(group.id)}
                            className="ml-3 text-red-500 hover:text-red-700 p-1"
                            title={locale === 'ru' ? 'Удалить группу' : 'Delete group'}
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>

                    {/* Group Content */}
                    {expandedGroups.has(group.id) && (
                        <div className="p-4 space-y-3">
                            {group.options.map((option, optionIndex) => (
                                <div key={option.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                                    <div className="text-gray-400 pt-2 cursor-grab">
                                        <GripVertical size={16} />
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">ID</label>
                                                <input
                                                    type="text"
                                                    value={option.id}
                                                    onChange={(e) => updateOption(group.id, option.id, { id: e.target.value })}
                                                    className="w-full px-3 py-1.5 border rounded text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    {locale === 'ru' ? 'Название (RU)' : 'Label (RU)'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={option.label.ru}
                                                    onChange={(e) => updateOption(group.id, option.id, {
                                                        label: { ...option.label, ru: e.target.value }
                                                    })}
                                                    placeholder={locale === 'ru' ? 'Медь 0.8мм' : 'Copper 0.8mm'}
                                                    className="w-full px-3 py-1.5 border rounded text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    {locale === 'ru' ? 'Название (EN)' : 'Label (EN)'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={option.label.en}
                                                    onChange={(e) => updateOption(group.id, option.id, {
                                                        label: { ...option.label, en: e.target.value }
                                                    })}
                                                    placeholder="Copper 0.8mm"
                                                    className="w-full px-3 py-1.5 border rounded text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">
                                                    {locale === 'ru' ? 'Доплата (₽)' : 'Price modifier (₽)'}
                                                </label>
                                                <input
                                                    type="number"
                                                    value={option.priceModifier}
                                                    onChange={(e) => updateOption(group.id, option.id, {
                                                        priceModifier: Number(e.target.value)
                                                    })}
                                                    className="w-full px-3 py-1.5 border rounded text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="w-48 shrink-0">
                                                <label className="block text-xs font-semibold text-gray-600 mb-2">
                                                    {locale === 'ru' ? 'Фото опции' : 'Option Photo'}
                                                </label>
                                                <VariationImageUpload
                                                    onUploadComplete={(img) => updateOption(group.id, option.id, { image: img, imageUrl: img.url })}
                                                />
                                            </div>
                                            {/* Unified Preview / Remove Logic */}
                                            {(option.image || option.imageUrl) && (
                                                <div className="flex-1 pt-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-full border border-gray-200 overflow-hidden shrink-0 bg-gray-50 shadow-sm">
                                                            <img 
                                                                src={option.image?.thumbUrl || option.image?.url || option.imageUrl} 
                                                                alt={option.label.en} 
                                                                className="w-full h-full object-cover" 
                                                            />
                                                        </div>
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className="text-xs text-green-600 font-medium">
                                                                {locale === 'ru' ? 'Загружено успешно' : 'Upload success'}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 truncate mt-0.5" title={option.image?.url || option.imageUrl}>
                                                                {option.image?.url || option.imageUrl}
                                                            </span>
                                                            <button 
                                                                onClick={() => updateOption(group.id, option.id, { image: undefined, imageUrl: undefined })}
                                                                className="text-[10px] text-red-500 hover:text-red-700 hover:underline text-left mt-1 w-fit uppercase font-semibold"
                                                            >
                                                                {locale === 'ru' ? 'Удалить фото' : 'Remove Photo'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeOption(group.id, option.id)}
                                        disabled={group.options.length <= 1}
                                        className="text-red-500 hover:text-red-700 p-1 disabled:opacity-30 disabled:cursor-not-allowed mt-6"
                                        title={locale === 'ru' ? 'Удалить опцию' : 'Delete option'}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => addOption(group.id)}
                                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 font-medium px-3 py-2"
                            >
                                <Plus size={16} />
                                {locale === 'ru' ? 'Добавить опцию' : 'Add option'}
                            </button>
                        </div>
                    )}
                </div>
            ))}

            <button
                type="button"
                onClick={addGroup}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 font-medium px-3 py-2 border border-dashed border-gray-300 rounded-lg w-full justify-center hover:border-gray-400 transition-colors"
            >
                <Plus size={16} />
                {locale === 'ru' ? 'Добавить группу вариаций' : 'Add variation group'}
            </button>
        </div>
    );
}
