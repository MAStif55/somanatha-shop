'use client';

import { useState, useCallback } from 'react';
import { uploadFile } from '@/actions/admin-actions';
import { Loader2, ImagePlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProductImage } from '@/types/product';

interface VariationImageUploadProps {
    onUploadComplete: (image: ProductImage) => void;
    storagePath?: string;
}

export default function VariationImageUpload({
    onUploadComplete,
    storagePath = 'uploads/variations'
}: VariationImageUploadProps) {
    const { locale } = useLanguage();
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // Variant definitions
    const VARIANTS = [
        { suffix: '',      maxDim: 1200, quality: 0.85 }, // full (1200px) for hover popup
        { suffix: '_thumb', maxDim: 300,  quality: 0.75 }, // thumb (300px) for small pill
    ];

    const generateVariant = async (file: File, variantMaxDim: number, variantQuality: number): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            img.onload = () => {
                let { width, height } = img;
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

                if (!ctx) return reject('No context');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject('Blob failed');
                }, 'image/webp', variantQuality);
            };

            img.onerror = () => reject('Load failed');
            img.src = URL.createObjectURL(file);
        });
    };

    const handleFile = async (file: File) => {
        if (!file.type.startsWith('image/')) return;
        
        setUploading(true);
        try {
            const baseName = `${Date.now()}_${file.name.replace(/\.[^/.]+$/, '')}`;
            
            const blobs = await Promise.all(
                VARIANTS.map(v => generateVariant(file, v.maxDim, v.quality))
            );

            const uploadPromises = VARIANTS.map((v, i) => {
                const filename = `${storagePath}/${baseName}${v.suffix}.webp`;
                const formData = new FormData();
                formData.append('file', blobs[i]);
                return uploadFile(filename, formData);
            });

            const [fullUrl, thumbUrl] = await Promise.all(uploadPromises);

            onUploadComplete({
                url: fullUrl,
                thumbUrl: thumbUrl,
                alt: { en: '', ru: '' }, // Keep generic. Advanced SEO should rely on main gallery.
                keywords: []
            });

        } catch (error) {
            console.error("Upload failed", error);
            alert(locale === 'ru' ? 'Ошибка загрузки!' : 'Upload failed!');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) handleFile(e.target.files[0]);
        e.target.value = '';
    };

    return (
        <label
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
            className={`flex items-center justify-center p-2 border-2 border-dashed rounded-lg transition-colors cursor-pointer min-h-[80px] w-full ${
                dragOver ? 'border-[#C9A227] bg-[#C9A227]/10' : 'border-gray-300 hover:border-[#C9A227] hover:bg-[#C9A227]/5'
            }`}
            title={locale === 'ru' ? 'Нажмите или перетащите файл для загрузки' : 'Click or drop file to upload'}
        >
            {uploading ? (
                <Loader2 className="animate-spin text-[#C9A227]" size={20} />
            ) : (
                <div className="flex flex-col items-center flex-1 text-center group">
                    <ImagePlus className={`mb-1 ${dragOver ? 'text-[#C9A227]' : 'text-gray-400 group-hover:text-[#C9A227]'}`} size={20} />
                    <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">
                        {dragOver ? (locale === 'ru' ? 'Отпустите файл' : 'Drop file') : (locale === 'ru' ? 'Загрузить фото' : 'Upload photo')}
                    </span>
                </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleChange} disabled={uploading} />
        </label>
    );
}
