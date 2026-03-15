
import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { useTranslation } from '@/contexts/LanguageContext';
// import { Slider } from '@/components/ui/slider'; // Removed unused import
import { X, Check, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import getCroppedImg from '@/utils/canvasUtils';

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedBlob: Blob) => void;
    onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
    const { t, locale } = useTranslation();
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = useCallback(async () => {
        try {
            if (!croppedAreaPixels) return;
            const croppedImage = await getCroppedImg(
                imageSrc,
                croppedAreaPixels,
                rotation
            );
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
            alert('Error creating cropped image');
        }
    }, [imageSrc, croppedAreaPixels, rotation, onCropComplete]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl overflow-hidden shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-900">
                        {locale === 'ru' ? 'Кадрирование' : 'Crop Image'}
                    </h3>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <div className="relative flex-1 bg-gray-900 overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropCompleteCallback}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        rotation={rotation}
                    />
                </div>

                <div className="p-6 space-y-6 bg-white border-t">
                    <div className="flex flex-col space-y-2">
                        <div className="flex justify-between text-sm text-gray-600 font-medium">
                            <span>{locale === 'ru' ? 'Масштаб' : 'Zoom'}</span>
                            <span>{Math.round(zoom * 100)}%</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <ZoomOut size={16} className="text-gray-400" />
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <ZoomIn size={16} className="text-gray-400" />
                        </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                        <div className="flex justify-between text-sm text-gray-600 font-medium">
                            <span>{locale === 'ru' ? 'Поворот' : 'Rotation'}</span>
                            <span>{rotation}°</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <RotateCcw size={16} className="text-gray-400" />
                            <input
                                type="range"
                                value={rotation}
                                min={0}
                                max={360}
                                step={1}
                                aria-labelledby="Rotation"
                                onChange={(e) => setRotation(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                            <span className="text-xs w-8 text-right">{rotation}°</span>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold transition-colors"
                        >
                            {locale === 'ru' ? 'Отмена' : 'Cancel'}
                        </button>
                        <button
                            type="button"
                            onClick={showCroppedImage}
                            className="flex-1 px-4 py-3 bg-orange-600 text-white hover:bg-orange-700 rounded-lg font-bold shadow-lg transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                        >
                            <Check size={20} />
                            {locale === 'ru' ? 'Сохранить' : 'Use Image'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
