'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { StorageRepository } from '@/lib/data';
import { Loader2, Upload, X, ImageIcon, Download, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductImage } from '@/types/product';
import ImageCropper from './ImageCropper';

/**
 * Image Upload Component with SEO Metadata
 * 
 * Features:
 * - Drag and drop support
 * - Automatic image optimization (resize + WebP conversion)
 * - Alt text and keywords editing for SEO
 * - Preview with download and remove buttons
 * - Firebase Storage integration
 * - Backwards compatible with string URLs
 */

interface ImageUploadProps {
    value: (string | ProductImage)[];
    onChange: (images: ProductImage[]) => void;
    storagePath?: string;
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
}

export default function ImageUpload({
    value,
    onChange,
    storagePath = 'uploads',
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85
}: ImageUploadProps) {
    const { locale } = useLanguage();
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    // Track previous length to detect new uploads
    const [prevLength, setPrevLength] = useState(value.length);

    // Cropping State
    const [croppingFile, setCroppingFile] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);

    // Auto-expand new images
    useEffect(() => {
        if (value.length > prevLength) {
            setExpandedIndex(value.length - 1);
        }
        setPrevLength(value.length);
    }, [value.length, prevLength]);

    // Robust normalization to handle various input shapes
    // IMPORTANT: Spread original object to preserve all fields (cardUrl, thumbUrl, etc.)
    const normalizedImages: ProductImage[] = value.map(img => {
        if (typeof img === 'string') {
            return { url: img, alt: { en: '', ru: '' }, keywords: [] };
        }
        // Spread the entire object to preserve cardUrl, thumbUrl, and any other fields
        return {
            ...img,
            url: img.url || '',
            alt: img.alt || { en: '', ru: '' },
            keywords: img.keywords || []
        };
    });

    // Variant definitions for multi-resolution upload
    const VARIANTS = [
        { suffix: '',      maxDim: maxWidth, quality: quality },      // full (1200px)
        { suffix: '_card', maxDim: 600,      quality: 0.82 },        // card (600px)
        { suffix: '_thumb', maxDim: 300,     quality: 0.75 },        // thumb (300px)
    ] as const;

    /**
     * Generates a single WebP variant at the given max dimension and quality.
     */
    const generateVariant = async (file: File, variantMaxDim: number, variantQuality: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                let { width, height } = img;

                // Scale down proportionally if larger than max
                if (width > variantMaxDim || height > variantMaxDim) {
                    if (width >= height) {
                        height = (height * variantMaxDim) / width;
                        width = variantMaxDim;
                    } else {
                        width = (width * variantMaxDim) / height;
                        height = variantMaxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to convert canvas to blob'));
                        }
                    },
                    'image/webp',
                    variantQuality
                );
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    };

    /** Shared upload metadata for long-term caching */
    const uploadMetadata = {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
    };

    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert(locale === 'ru' ? 'Пожалуйста, загрузите изображение' : 'Please upload an image file');
            return;
        }

        setUploading(true);
        try {
            const baseName = `${Date.now()}_${file.name.replace(/\.[^/.]+$/, '')}`;

            // Generate all variants in parallel
            const blobs = await Promise.all(
                VARIANTS.map(v => generateVariant(file, v.maxDim, v.quality))
            );

            // Upload all variants in parallel
            const uploadPromises = VARIANTS.map((v, i) => {
                const filename = `${storagePath}/${baseName}${v.suffix}.webp`;
                return StorageRepository.uploadFile(filename, blobs[i]);
            });

            const [fullUrl, cardUrl, thumbUrl] = await Promise.all(uploadPromises);

            // Create ProductImage with all variant URLs
            const newImage: ProductImage = {
                url: fullUrl,
                cardUrl,
                thumbUrl,
                alt: { en: '', ru: '' },
                keywords: []
            };

            onChange([...normalizedImages, newImage]);
            // setExpandedIndex handled by useEffect
        } catch (error: any) {
            console.error("Upload failed", error);
            let errorMessage = locale === 'ru' ? "Ошибка загрузки!" : "Upload failed!";
            if (error.code === 'storage/unauthorized') {
                errorMessage = locale === 'ru' ? "Нет прав доступа." : "Permission denied.";
            }
            alert(errorMessage);
        } finally {
            setUploading(false);
        }
    };

    const handleReplaceUpload = async (file: File) => {
        if (replacingIndex === null) return;
        setUploading(true);
        try {
            const baseName = `${Date.now()}_${file.name.replace(/\\.[^/.]+$/, '')}`;

            const blobs = await Promise.all(
                VARIANTS.map(v => generateVariant(file, v.maxDim, v.quality))
            );

            const uploadPromises = VARIANTS.map((v, i) => {
                const filename = `${storagePath}/${baseName}${v.suffix}.webp`;
                return StorageRepository.uploadFile(filename, blobs[i]);
            });

            const [fullUrl, cardUrl, thumbUrl] = await Promise.all(uploadPromises);

            const newImages = [...normalizedImages];
            const oldImage = newImages[replacingIndex];

            if (oldImage.url) {
                try { await StorageRepository.deleteFile(oldImage.url); } catch (e) { }
            }
            if (oldImage.cardUrl) {
                try { await StorageRepository.deleteFile(oldImage.cardUrl); } catch (e) { }
            }
            if (oldImage.thumbUrl) {
                try { await StorageRepository.deleteFile(oldImage.thumbUrl); } catch (e) { }
            }

            newImages[replacingIndex] = {
                ...oldImage,
                url: fullUrl,
                cardUrl,
                thumbUrl
            };

            onChange(newImages);
        } catch (error: any) {
            console.error("Replace upload failed", error);
            let errorMessage = locale === 'ru' ? "Ошибка замены!" : "Replace failed!";
            if (error.code === 'storage/unauthorized') {
                errorMessage = locale === 'ru' ? "Нет прав доступа." : "Permission denied.";
            }
            alert(errorMessage);
        } finally {
            setUploading(false);
            setReplacingIndex(null);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setFileName(file.name);
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCroppingFile(reader.result?.toString() || null);
            });
            reader.readAsDataURL(file);
            e.target.value = '';
        } else {
            setReplacingIndex(null);
        }
    };

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCroppingFile(reader.result?.toString() || null);
            });
            reader.readAsDataURL(file);
        }
    }, [normalizedImages, onChange]);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    }, []);

    const removeImage = (index: number) => {
        const newImages = [...normalizedImages];
        newImages.splice(index, 1);
        onChange(newImages);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const updateImageMetadata = (index: number, updates: Partial<ProductImage>) => {
        const newImages = [...normalizedImages];
        newImages[index] = { ...newImages[index], ...updates };
        onChange(newImages);
    };

    const updateAltText = (index: number, lang: 'en' | 'ru', value: string) => {
        const newImages = [...normalizedImages];
        const currentAlt = newImages[index].alt || { en: '', ru: '' };
        newImages[index] = {
            ...newImages[index],
            alt: { ...currentAlt, [lang]: value }
        };
        onChange(newImages);
    };

    const updateKeywords = (index: number, value: string) => {
        const keywords = value.split(',').map(k => k.trim()).filter(k => k);
        updateImageMetadata(index, { keywords });
    };

    const downloadImage = async (url: string, index: number) => {
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const downloadUrl = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = downloadUrl;
                            link.download = `image-${index + 1}.webp`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(downloadUrl);
                        }
                    }, 'image/webp');
                }
            };

            img.onerror = () => window.open(url, '_blank');
            img.src = url;
        } catch (error) {
            window.open(url, '_blank');
        }
    };

    const toggleExpand = (index: number) => {
        setExpandedIndex(expandedIndex === index ? null : index);
    };

    return (
        <div className="space-y-4">
            {croppingFile && (
                <ImageCropper
                    imageSrc={croppingFile}
                    onCropComplete={async (croppedBlob) => {
                        const file = new File([croppedBlob], fileName, { type: 'image/webp' });
                        setCroppingFile(null);
                        if (replacingIndex !== null) {
                            await handleReplaceUpload(file);
                        } else {
                            await handleUpload(file);
                        }
                    }}
                    onCancel={() => {
                        setCroppingFile(null);
                        setFileName('');
                        setReplacingIndex(null);
                    }}
                />
            )}
            {/* Image Grid */}
            <div className="space-y-3">
                {normalizedImages.map((image, idx) => (
                    <div key={idx} className="bg-gray-50 border rounded-lg overflow-hidden">
                        {/* Image Preview Row */}
                        <div className="flex items-center gap-3 p-3">
                            <div className="relative w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                <img src={image.url} alt={image.alt[locale as 'en' | 'ru'] || ''} className="w-full h-full object-cover" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-600 truncate">
                                    {image.alt.ru || image.alt.en || (locale === 'ru' ? 'Нет alt-текста' : 'No alt text')}
                                </div>
                                {image.keywords && image.keywords.length > 0 && (
                                    <div className="text-xs text-gray-400 mt-1">
                                        {image.keywords.slice(0, 3).join(', ')}
                                        {image.keywords.length > 3 && '...'}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setReplacingIndex(idx);
                                        if (replaceInputRef.current) {
                                            replaceInputRef.current.click();
                                        }
                                    }}
                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                    title={locale === 'ru' ? 'Заменить изображение' : 'Replace Image'}
                                >
                                    {uploading && replacingIndex === idx ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleExpand(idx)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title={locale === 'ru' ? 'Редактировать SEO' : 'Edit SEO'}
                                >
                                    {expandedIndex === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => downloadImage(image.url, idx)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title={locale === 'ru' ? 'Скачать' : 'Download'}
                                >
                                    <Download size={18} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title={locale === 'ru' ? 'Удалить' : 'Delete'}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Expanded Metadata Editor */}
                        {expandedIndex === idx && (
                            <div className="border-t bg-white p-4 space-y-3">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                                    {locale === 'ru' ? 'SEO Метаданные' : 'SEO Metadata'}
                                </div>

                                {/* Alt Text RU */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Alt-текст (RU) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={image.alt.ru}
                                        onChange={(e) => updateAltText(idx, 'ru', e.target.value)}
                                        placeholder="Описание изображения для SEO и доступности"
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Alt Text EN */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Alt Text (EN)
                                    </label>
                                    <input
                                        type="text"
                                        value={image.alt.en}
                                        onChange={(e) => updateAltText(idx, 'en', e.target.value)}
                                        placeholder="Image description for SEO and accessibility"
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                {/* Keywords */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {locale === 'ru' ? 'Ключевые слова' : 'Keywords'}
                                    </label>
                                    <input
                                        type="text"
                                        value={(image.keywords || []).join(', ')}
                                        onChange={(e) => updateKeywords(idx, e.target.value)}
                                        placeholder={locale === 'ru' ? 'янтра, медь, ведический (через запятую)' : 'yantra, copper, vedic (comma-separated)'}
                                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        {locale === 'ru' ? 'Разделяйте запятыми' : 'Separate with commas'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Upload Zone */}
            <label
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
            >
                {uploading ? (
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                ) : (
                    <>
                        <ImageIcon className={`mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} size={32} />
                        <span className="text-sm text-gray-500">
                            {dragOver
                                ? (locale === 'ru' ? 'Отпустите для загрузки' : 'Drop to upload')
                                : (locale === 'ru' ? 'Нажмите или перетащите изображение' : 'Click or drag image')}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">WebP, {locale === 'ru' ? 'до' : 'up to'} {maxWidth}px</span>
                    </>
                )}
                <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
                <input
                    type="file"
                    accept="image/*"
                    ref={replaceInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                />
            </label>
        </div>
    );
}
