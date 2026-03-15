import { useState, useRef, useEffect } from 'react';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Link as LinkIcon, Quote, Eye, Edit } from 'lucide-react';
import Markdown from 'react-markdown';
import AutoResizeTextarea from '@/components/ui/AutoResizeTextarea';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder, className = '' }: MarkdownEditorProps) {
    const [mode, setMode] = useState<'write' | 'preview'>('write');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Sync ref for AutoResizeTextarea if possible, but AutoResize wraps the textarea.
    // We need to bypass the wrapper or improve AutoResizeTextarea to forward ref.
    // For now, let's target by ID or similar if ref forwarding isn't easy, 
    // OR update AutoResizeTextarea to forward refs (recommended).
    // Actually, let's just use document.activeElement or a simple ID for now to be safe and quick.
    const editorId = `markdown-editor-${Math.random().toString(36).substr(2, 9)}`;

    const insertFormatting = (prefix: string, suffix: string = '') => {
        const textarea = document.getElementById(editorId) as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const selection = text.substring(start, end);
        const after = text.substring(end);

        const newText = before + prefix + (selection || 'text') + suffix + after;

        onChange(newText);

        // Defer focus restoration
        setTimeout(() => {
            textarea.focus();
            const newCursorPos = start + prefix.length + (selection || 'text').length + suffix.length;
            // Improved cursor positioning: if selecting, wrap around. If empty, place cursor inside.
            if (selection) {
                textarea.setSelectionRange(start, start + prefix.length + selection.length + suffix.length);
            } else {
                // Logic to place cursor between tags for "text" or formatted block
                textarea.setSelectionRange(start + prefix.length, start + prefix.length + 4); // 4 is length of "text"
            }
        }, 0);
    };

    const handleToolbarClick = (type: string) => {
        if (mode === 'preview') setMode('write'); // Switch back to write on edit

        switch (type) {
            case 'bold': insertFormatting('**', '**'); break;
            case 'italic': insertFormatting('*', '*'); break;
            case 'h2': insertFormatting('\n## '); break;
            case 'h3': insertFormatting('\n### '); break;
            case 'ul': insertFormatting('\n- '); break;
            case 'ol': insertFormatting('\n1. '); break;
            case 'quote': insertFormatting('\n> '); break;
        }
    };

    return (
        <div className={`border rounded-lg overflow-hidden bg-white flex flex-col ${className}`}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b bg-gray-50 flex-wrap gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                    <ToolbarBtn icon={<Bold size={18} />} onClick={() => handleToolbarClick('bold')} title="Bold" />
                    <ToolbarBtn icon={<Italic size={18} />} onClick={() => handleToolbarClick('italic')} title="Italic" />
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <ToolbarBtn icon={<Heading1 size={18} />} onClick={() => handleToolbarClick('h2')} title="Heading 2" />
                    <ToolbarBtn icon={<Heading2 size={18} />} onClick={() => handleToolbarClick('h3')} title="Heading 3" />
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <ToolbarBtn icon={<List size={18} />} onClick={() => handleToolbarClick('ul')} title="Bullet List" />
                    <ToolbarBtn icon={<ListOrdered size={18} />} onClick={() => handleToolbarClick('ol')} title="Numbered List" />
                    <ToolbarBtn icon={<Quote size={18} />} onClick={() => handleToolbarClick('quote')} title="Quote" />
                </div>

                {/* Mode Toggle */}
                <div className="flex items-center bg-gray-200 rounded-lg p-1 gap-1">
                    <button
                        type="button"
                        onClick={() => setMode('write')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'write' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Edit size={14} /> Write
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('preview')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'preview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Eye size={14} /> Preview
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="relative min-h-[300px] bg-white">
                {mode === 'write' ? (
                    <AutoResizeTextarea
                        id={editorId}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full p-6 min-h-[300px] outline-none border-none focus:ring-0 text-gray-800 leading-relaxed font-mono text-base resize-none"
                    />
                ) : (
                    <div className="p-6 prose prose-stone max-w-none min-h-[300px] overflow-y-auto text-gray-900">
                        {value ? (
                            <Markdown
                                components={{
                                    h1: ({ ...props }) => <h3 className="text-2xl font-bold mt-6 mb-3 text-gray-900" {...props} />,
                                    h2: ({ ...props }) => <h4 className="text-xl font-bold mt-5 mb-2 text-gray-900" {...props} />,
                                    h3: ({ ...props }) => <h5 className="text-lg font-bold mt-4 mb-2 text-gray-900" {...props} />,
                                    p: ({ ...props }) => <p className="mb-4 text-gray-900" {...props} />,
                                    li: ({ ...props }) => <li className="text-gray-900" {...props} />,
                                    ul: ({ ...props }) => <ul className="list-disc pl-5 my-4 text-gray-900" {...props} />,
                                    ol: ({ ...props }) => <ol className="list-decimal pl-5 my-4 text-gray-900" {...props} />,
                                    strong: ({ ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                                }}
                            >
                                {value}
                            </Markdown>
                        ) : (
                            <p className="text-gray-400 italic">Nothing to preview...</p>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 border-t flex justify-between items-center">
                <span>{mode === 'write' ? 'Markdown enabled. Switch to Preview to see result.' : 'Preview Mode'}</span>
                <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noreferrer" className="hover:text-blue-600">Markdown Help</a>
            </div>
        </div>
    );
}

function ToolbarBtn({ icon, onClick, title }: { icon: React.ReactNode, onClick: () => void, title: string }) {
    return (
        <button
            type="button"
            onClick={(e) => { e.preventDefault(); onClick(); }}
            title={title}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-900 transition-colors"
        >
            {icon}
        </button>
    );
}
