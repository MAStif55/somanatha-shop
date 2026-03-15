import { useState, useRef, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import Cropper, { Area } from 'react-easy-crop';
import { Loader2, Video, X, Play, Pause } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

interface VideoUploadProps {
    value?: string;
    onChange: (url: string) => void;
    storagePath?: string;
}

export default function VideoUpload({
    value,
    onChange,
    storagePath = 'videos'
}: VideoUploadProps) {
    const { locale } = useLanguage();
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    // Original Video Selected
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [originalVideoUrl, setOriginalVideoUrl] = useState<string | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);

    // Trimming State
    const [startTime, setStartTime] = useState<number>(0);
    const [endTime, setEndTime] = useState<number>(0);

    const videoRef = useRef<HTMLVideoElement>(null); // For Cropper component internally
    const hiddenVideoRef = useRef<HTMLVideoElement>(null); // For our strict loop playback control
    const ffmpegRef = useRef(new FFmpeg());
    const [progress, setProgress] = useState(0);

    // Cropping State
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspectRatio, setAspectRatio] = useState<number | undefined>(1); // Default 1:1 Square
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    // Storyboard State
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const THUMB_COUNT = 8; // Number of frames to extract

    // Playback State
    const [isPlayingPreview, setIsPlayingPreview] = useState(false);
    const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

    const loadFFmpeg = async () => {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const ffmpeg = ffmpegRef.current;

        if (ffmpeg.loaded) return;

        ffmpeg.on('progress', ({ progress }) => {
            setProgress(Math.round(progress * 100));
        });

        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            processFileSelection(file);
        }
    };

    const MAX_FILE_SIZE_MB = 100;

    const processFileSelection = (file: File) => {
        if (!file.type.startsWith('video/')) {
            alert(locale === 'ru' ? 'Пожалуйста, загрузите видео' : 'Please upload a video file');
            return;
        }

        // Safety guard: reject files over 100MB to prevent WASM memory exhaustion
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            alert(locale === 'ru'
                ? `Файл слишком большой (${fileSizeMB.toFixed(0)} МБ). Максимум — ${MAX_FILE_SIZE_MB} МБ.`
                : `File too large (${fileSizeMB.toFixed(0)} MB). Maximum is ${MAX_FILE_SIZE_MB} MB.`);
            return;
        }

        // Check for Apple QuickTime formats or HEVC likelihood
        if (file.type === 'video/quicktime' || file.name.toLowerCase().endsWith('.mov')) {
            alert(locale === 'ru'
                ? 'Примечание: Видео в формате .MOV (iPhone) будет автоматически конвертировано в универсальный формат .MP4 прямо в вашем браузере.'
                : 'Note: .MOV (iPhone) videos will be automatically converted to universally compatible .MP4 format right in your browser.');
        }

        setSelectedFile(file);
        const url = URL.createObjectURL(file);
        setOriginalVideoUrl(url);
    };

    const handleLoadedMetadata = async () => {
        if (hiddenVideoRef.current) {
            const dur = hiddenVideoRef.current.duration;
            setVideoDuration(dur);
            setStartTime(0);
            setEndTime(dur);
            setCurrentPlaybackTime(0);

            // Extract thumbnails for storyboard
            await generateThumbnails(hiddenVideoRef.current, dur);
        }
    };

    const generateThumbnails = async (videoNode: HTMLVideoElement, duration: number) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        const thumbs: string[] = [];
        const interval = duration / THUMB_COUNT;

        // Set low-res canvas for fast extraction
        canvas.width = 160;
        canvas.height = 90;

        for (let i = 0; i < THUMB_COUNT; i++) {
            const time = i * interval;
            videoNode.currentTime = time;

            // Wait for video to seek to the frame
            await new Promise<void>((resolve) => {
                const onSeeked = () => {
                    videoNode.removeEventListener('seeked', onSeeked);
                    resolve();
                };
                videoNode.addEventListener('seeked', onSeeked);
            });

            // Draw frame and save as base64
            context.drawImage(videoNode, 0, 0, canvas.width, canvas.height);
            thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
        }

        // Reset video to start
        videoNode.currentTime = 0;
        setThumbnails(thumbs);
    };

    const handleUploadAndProcess = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setProgress(0);
        try {
            await loadFFmpeg();
            const ffmpeg = ffmpegRef.current;

            // Write file to FFmpeg FS
            const inputExt = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
            const inputName = 'input' + (inputExt || '.mp4');
            await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));

            const outputName = 'output.mp4';
            const duration = endTime - startTime;

            // Build ffmpeg arguments
            const ffmpegArgs = [
                '-ss', startTime.toString(),
                '-i', inputName,
                '-t', duration.toString(),
            ];

            // Build video filters: crop (if set) + resolution cap at 720p
            const videoFilters: string[] = [];
            if (croppedAreaPixels) {
                const { width, height, x, y } = croppedAreaPixels;
                videoFilters.push(`crop=${width}:${height}:${x}:${y}`);
            }
            videoFilters.push(`scale='min(720,iw)':-2`);

            ffmpegArgs.push('-vf', videoFilters.join(','));

            // Finish arguments with balanced encoding and no audio
            ffmpegArgs.push(
                '-c:v', 'libx264',
                '-preset', 'fast',
                '-crf', '28',
                '-an', // mute entirely
                outputName
            );

            // Run command
            await ffmpeg.exec(ffmpegArgs);

            // Read result
            const data = await ffmpeg.readFile(outputName);
            const blob = new Blob([data as any], { type: 'video/mp4' });

            // Upload the fully processed reliable mp4 blob to Firebase Storage
            const filename = `${Date.now()}_preview.mp4`;
            const storageRef = ref(storage, `${storagePath}/${filename}`);
            await uploadBytes(storageRef, blob, { contentType: 'video/mp4' });

            const publicUrl = await getDownloadURL(storageRef);

            // Clean up memory
            await ffmpeg.deleteFile(inputName);
            await ffmpeg.deleteFile(outputName);

            // Return the URL upwards (no need to append #t hash anymore since it's already perfectly trimmed!)
            onChange(publicUrl);

            // Clean up UI local state
            setOriginalVideoUrl(null);
            setSelectedFile(null);
            setProgress(0);

        } catch (error: any) {
            console.error("Video processing/uploading failed", error);
            alert((locale === 'ru' ? "Ошибка обработки: " : "Processing error: ") + (error.message || 'Unknown error. Check console.'));
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFileSelection(file);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
    };

    const handleRemoveCurrent = async () => {
        if (value) {
            // Delete old video from Firebase Storage to free up space
            try {
                const refToDelete = ref(storage, value);
                await deleteObject(refToDelete);
            } catch (e) {
                // Silently fail — file may already be deleted or URL may not be a storage ref
                console.error("Failed to delete video from storage", e);
            }
        }
        onChange("");
    };

    const handleCancelSelection = () => {
        setSelectedFile(null);
        setOriginalVideoUrl(null);
        setIsPlayingPreview(false);
    };

    const togglePlayPreview = () => {
        if (!hiddenVideoRef.current) return;

        if (isPlayingPreview) {
            hiddenVideoRef.current.pause();
            setIsPlayingPreview(false);
        } else {
            // Ensure we are inside bounds before playing
            if (hiddenVideoRef.current.currentTime < startTime || hiddenVideoRef.current.currentTime > endTime) {
                hiddenVideoRef.current.currentTime = startTime;
            }
            hiddenVideoRef.current.play().catch(() => { });
            setIsPlayingPreview(true);
        }
    };

    // If a video preview already exists for this product
    if (value && !selectedFile) {
        return (
            <div className="bg-gray-50 border rounded-lg overflow-hidden p-4">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-gray-700">
                        {locale === 'ru' ? 'Текущее Live Photo' : 'Current Live Photo'}
                    </span>
                    <button
                        type="button"
                        onClick={handleRemoveCurrent}
                        className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded transition-colors"
                        title={locale === 'ru' ? 'Удалить видео' : 'Remove video'}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="relative aspect-video bg-black rounded overflow-hidden">
                    <video
                        src={value}
                        className="w-full h-full object-contain"
                        controls
                        loop
                        muted
                        playsInline
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {originalVideoUrl ? (
                <div className="bg-gray-50 border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-700">
                            {locale === 'ru' ? 'Обрезать видео' : 'Trim Video'}
                        </h4>
                        <button
                            type="button"
                            onClick={handleCancelSelection}
                            className="text-gray-500 hover:text-red-600 transition-colors"
                            disabled={uploading}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="relative aspect-video bg-black rounded overflow-hidden">
                        <Cropper
                            video={originalVideoUrl}
                            crop={crop}
                            zoom={zoom}
                            aspect={aspectRatio}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={(croppedArea, croppedAreaPixels) => {
                                setCroppedAreaPixels(croppedAreaPixels);
                            }}
                            ref={videoRef as any} // react-easy-crop manages the video element internally
                        />
                        {/* Hidden video element to track duration/time limits and run the custom loop */}
                        <video
                            ref={hiddenVideoRef}
                            src={originalVideoUrl}
                            className="hidden pointer-events-none"
                            onLoadedMetadata={handleLoadedMetadata}
                            muted
                            playsInline
                            onTimeUpdate={() => {
                                if (hiddenVideoRef.current) {
                                    const curr = hiddenVideoRef.current.currentTime;
                                    setCurrentPlaybackTime(curr);

                                    // Constraint: Strict loop between [startTime, endTime]
                                    if (isPlayingPreview && curr >= endTime) {
                                        hiddenVideoRef.current.currentTime = startTime;
                                    } else if (isPlayingPreview && curr < startTime) {
                                        hiddenVideoRef.current.currentTime = startTime;
                                    }
                                }
                            }}
                            onEnded={() => {
                                if (hiddenVideoRef.current && isPlayingPreview) {
                                    hiddenVideoRef.current.currentTime = startTime;
                                    hiddenVideoRef.current.play().catch(() => { });
                                }
                            }}
                        />
                    </div>

                    {/* Aspect Ratio Selector */}
                    <div className="flex gap-2 mb-4">
                        <button
                            type="button"
                            onClick={() => setAspectRatio(1)}
                            className={`px-3 py-1 text-xs rounded border ${aspectRatio === 1 ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            1:1 (Square)
                        </button>
                        <button
                            type="button"
                            onClick={() => setAspectRatio(4 / 3)}
                            className={`px-3 py-1 text-xs rounded border ${aspectRatio === 4 / 3 ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            4:3
                        </button>
                        <button
                            type="button"
                            onClick={() => setAspectRatio(16 / 9)}
                            className={`px-3 py-1 text-xs rounded border ${aspectRatio === 16 / 9 ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            16:9
                        </button>
                        <button
                            type="button"
                            onClick={() => setAspectRatio(undefined)}
                            className={`px-3 py-1 text-xs rounded border ${aspectRatio === undefined ? 'bg-blue-100 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                        >
                            {locale === 'ru' ? 'Оригинал' : 'Original'}
                        </button>
                    </div>

                    {/* Storyboard and Timeline Slider */}
                    <div className="pt-2 pb-6">
                        <div className="flex justify-between items-center text-sm font-medium text-gray-700 mb-2">
                            <div className="flex items-center gap-3">
                                <span>{locale === 'ru' ? 'Обрезка времени:' : 'Timeline Trim:'}</span>
                                <button
                                    type="button"
                                    onClick={togglePlayPreview}
                                    className="flex items-center justify-center p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
                                    title={isPlayingPreview ? "Pause Preview" : "Play Preview"}
                                >
                                    {isPlayingPreview ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                                </button>
                            </div>
                            <span className="text-blue-600 font-bold">
                                {startTime.toFixed(1)}s - {endTime.toFixed(1)}s
                            </span>
                        </div>

                        <div className="relative mt-2 rounded-lg overflow-hidden border border-gray-200">
                            {/* Filmstrip Background */}
                            <div className="flex w-full h-12 bg-black">
                                {thumbnails.map((thumb, idx) => (
                                    <div
                                        key={idx}
                                        className="flex-1 h-full bg-cover bg-center border-r border-[#ffffff20] last:border-0"
                                        style={{ backgroundImage: `url(${thumb})` }}
                                    />
                                ))}
                                {thumbnails.length === 0 && (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                                        <Loader2 className="animate-spin mr-2" size={14} />
                                        {locale === 'ru' ? 'Генерация кадров...' : 'Generating frames...'}
                                    </div>
                                )}
                            </div>

                            {/* RC Slider Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-full flex items-center -mx-2 px-2">
                                <Slider
                                    range
                                    min={0}
                                    max={videoDuration}
                                    step={0.1}
                                    value={[startTime, endTime]}
                                    onChange={(val) => {
                                        const [newStart, newEnd] = val as number[];

                                        // Auto-pause if they grab a slider
                                        if (isPlayingPreview && hiddenVideoRef.current) {
                                            hiddenVideoRef.current.pause();
                                            setIsPlayingPreview(false);
                                        }

                                        // Update state
                                        setStartTime(newStart);
                                        setEndTime(newEnd);

                                        // Live preview scrub - snap to whichever handle moved
                                        if (hiddenVideoRef.current) {
                                            if (Math.abs(newStart - startTime) > 0.05) {
                                                hiddenVideoRef.current.currentTime = newStart;
                                                setCurrentPlaybackTime(newStart);
                                            } else if (Math.abs(newEnd - endTime) > 0.05) {
                                                hiddenVideoRef.current.currentTime = newEnd;
                                                setCurrentPlaybackTime(newEnd);
                                            }
                                        }
                                    }}
                                    disabled={uploading || thumbnails.length === 0}
                                    trackStyle={[{ backgroundColor: 'transparent' }]} // We rely on the filmstrip
                                    handleStyle={[
                                        { borderColor: '#3b82f6', backgroundColor: '#3b82f6', height: 48, width: 8, marginTop: -24, borderRadius: 2, cursor: 'col-resize', boxShadow: '0 0 4px rgba(0,0,0,0.5)' },
                                        { borderColor: '#3b82f6', backgroundColor: '#3b82f6', height: 48, width: 8, marginTop: -24, borderRadius: 2, cursor: 'col-resize', boxShadow: '0 0 4px rgba(0,0,0,0.5)' }
                                    ]}
                                    railStyle={{ backgroundColor: 'rgba(0,0,0,0.4)', height: '100%' }} // Darkens unselected areas
                                />

                                {/* Dark overlay for unselected areas built manually since rc-slider track transparentizes */}
                                <div className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none transition-all duration-75" style={{ width: `${(startTime / videoDuration) * 100}%` }} />
                                <div className="absolute top-0 bottom-0 right-0 bg-black/60 pointer-events-none transition-all duration-75" style={{ width: `${(1 - endTime / videoDuration) * 100}%` }} />

                                {/* Blue border box for selected area */}
                                <div
                                    className="absolute top-0 bottom-0 border-y-2 border-blue-500 pointer-events-none transition-all duration-75"
                                    style={{
                                        left: `${(startTime / videoDuration) * 100}%`,
                                        right: `${(1 - endTime / videoDuration) * 100}%`
                                    }}
                                />

                                {/* Moving visual scrubber head */}
                                <div
                                    className="absolute top-0 bottom-0 w-[2px] bg-red-500 shadow-[0_0_5px_rgba(239,68,68,1)] pointer-events-none transition-all duration-75 z-20"
                                    style={{ left: `${(currentPlaybackTime / videoDuration) * 100}%` }}
                                >
                                    <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>0.0s</span>
                            <span>{videoDuration.toFixed(1)}s</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleUploadAndProcess}
                        disabled={uploading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 relative overflow-hidden"
                    >
                        {uploading && (
                            <div className="absolute left-0 top-0 bottom-0 bg-blue-500 opacity-50" style={{ width: `${progress}%`, transition: 'width 0.2s' }}></div>
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            {uploading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    {locale === 'ru' ? `Обработка... ${progress}%` : `Processing... ${progress}%`}
                                </>
                            ) : (
                                <>
                                    <Video size={20} />
                                    {locale === 'ru' ? 'Обрезать и загрузить' : 'Trim & Upload'}
                                </>
                            )}
                        </span>
                    </button>
                    <p className="text-xs text-center text-gray-500 mt-2">
                        {locale === 'ru'
                            ? 'Звук будет автоматически удален, а видео сжато для быстрой загрузки.'
                            : 'Audio will be automatically removed and video will be compressed for fast loading.'}
                    </p>
                </div>
            ) : (
                <label
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                >
                    <Video className={`mb-2 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} size={32} />
                    <span className="text-sm text-gray-500">
                        {dragOver
                            ? (locale === 'ru' ? 'Отпустите для выбора' : 'Drop to select')
                            : (locale === 'ru' ? 'Нажмите или перетащите видео для Live Photo' : 'Click or drop video for Live Photo')}
                    </span>
                    <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </label>
            )}
        </div>
    );
}
