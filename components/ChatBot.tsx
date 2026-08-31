'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Message {
    role: 'user' | 'assistant';
    text: string;
}

interface ChatBotProps {
    // Optional page context — pass the movie/show title being viewed
    pageContext?: string;
}

const SUGGESTIONS = [
    'Film önerir misin? 🎬',
    'Watch Party nedir?',
    'En iyi IMDb filmleri',
    'Aksiyon dizisi öner',
];

export default function ChatBot({ pageContext }: ChatBotProps) {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            text: 'Merhaba! 👋 Ben NoxBot. Film ve dizi konularında sana yardımcı olabilirim. Ne sormak istersin?'
        }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async (text: string) => {
        const userMessage = text.trim();
        if (!userMessage || loading) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setLoading(true);

        try {
            // Build history in Gemini SDK format (exclude welcome message)
            const history = messages.slice(1).map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }],
            }));

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    context: pageContext,
                    history,
                }),
            });

            const data = await res.json();

            if (!res.ok || data.error) {
                throw new Error(data.error || 'Bir hata oluştu');
            }

            setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
        } catch (err: any) {
            setMessages(prev => [
                ...prev,
                { role: 'assistant', text: '⚠️ Üzgünüm, şu an yanıt veremiyorum. Lütfen tekrar dene.' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        send(input);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setOpen(prev => !prev)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${open
                    ? 'bg-destructive hover:bg-destructive/90 scale-90'
                    : 'bg-primary hover:bg-primary/90 hover:scale-110'
                    }`}
                aria-label="NoxBot Aç/Kapat"
            >
                {open
                    ? <X className="h-6 w-6 text-white" />
                    : (
                        <div className="relative">
                            <MessageCircle className="h-6 w-6 text-white" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-background animate-pulse" />
                        </div>
                    )
                }
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-3xl shadow-2xl border border-white/10 bg-background/95 backdrop-blur-xl flex flex-col transition-all duration-300 origin-bottom-right ${open ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
                }`}
                style={{ height: '500px' }}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-primary/10 rounded-t-3xl shrink-0">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">NoxBot</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                            Yapay Zeka Asistan
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scroll-smooth">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mb-0.5">
                                    <Bot className="h-4 w-4 text-primary" />
                                </div>
                            )}
                            <div
                                className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                                    : 'bg-muted rounded-bl-sm'
                                    }`}
                            >
                                {msg.text}
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center shrink-0 mb-0.5">
                                    <User className="h-4 w-4 text-primary" />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-end gap-2 justify-start">
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Bot className="h-4 w-4 text-primary" />
                            </div>
                            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Suggestions (only show if just the welcome message) */}
                {messages.length === 1 && !loading && (
                    <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                onClick={() => send(s)}
                                className="text-xs bg-muted hover:bg-primary/20 hover:text-primary border border-white/10 px-3 py-1.5 rounded-full transition-colors"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input */}
                <form
                    onSubmit={handleSubmit}
                    className="px-3 pb-3 pt-2 border-t border-white/10 flex gap-2 shrink-0"
                >
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        className="rounded-full bg-muted border-0 text-sm h-9"
                        disabled={loading}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="rounded-full h-9 w-9 shrink-0"
                        disabled={!input.trim() || loading}
                    >
                        {loading
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Send className="h-4 w-4" />
                        }
                    </Button>
                </form>
            </div>
        </>
    );
}
