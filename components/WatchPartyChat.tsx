'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface ChatMessage {
  id: string;
  userId?: string;
  userName?: string;
  text: string;
  ts: number;
}

export default function WatchPartyChat({ socketRef, roomId }: { socketRef: any; roomId: string }) {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    const onMsg = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg].slice(-500));
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
    };
    s.on('chat:message', onMsg);
    return () => {
      try { s.off('chat:message', onMsg); } catch {}
    };
  }, [socketRef]);

  const canSend = useMemo(() => !!user && !!roomId && text.trim().length > 0, [user, roomId, text]);

  const send = () => {
    if (!canSend) return;
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const msg: ChatMessage = {
      id,
      userId: user?.uid,
      userName: userData?.username || user?.email || 'guest',
      text: text.trim(),
      ts: Date.now(),
    };
    socketRef.current?.emit('chat:message', { roomId, ...msg });
    setMessages((prev) => [...prev, msg].slice(-500));
    setText('');
    setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50);
  };

  return (
    <div className="flex flex-col h-[480px]">
      <div ref={listRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        {messages.map((m) => {
          const isMe = m.userId === user?.uid;
          return (
            <div key={m.id} className={`max-w-[80%] ${isMe ? 'ml-auto' : ''}`}>
              <div className={`rounded-lg p-3 shadow-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'} relative`}>
                <div>
                  <div className="text-xs mb-1 opacity-80">{m.userName || 'Kullanıcı'}</div>
                  <div className="break-words whitespace-pre-wrap leading-relaxed">{m.text}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Mesaj yazın"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          />
          <Button onClick={send} disabled={!canSend}>Gönder</Button>
        </div>
      </div>
    </div>
  );
}

