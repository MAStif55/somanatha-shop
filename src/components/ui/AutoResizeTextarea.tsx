import { useEffect, useRef } from 'react';

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    value: string;
}

export default function AutoResizeTextarea({ value, className, ...props }: AutoResizeTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const resizeTextarea = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to recalculate
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    useEffect(() => {
        resizeTextarea();
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            rows={1}
            className={`resize-none overflow-hidden transition-all duration-200 ${className}`}
            {...props}
            onInput={resizeTextarea}
        />
    );
}
