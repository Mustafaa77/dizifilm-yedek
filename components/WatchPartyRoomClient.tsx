'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    WatchPartyRoom, WatchPartyMessage,
    listenToWatchParty, listenToWatchPartyMessages,
    syncWatchParty, sendWatchPartyMessage, leaveWatchParty, joinWatchParty, updateWatchPartyVideo
} from '@/lib/watchParty';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Users, LogOut, Copy, Link as LinkIcon, Smile, Play, Pause, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

// Helper: Extract YouTube Video ID from various URL formats
function extractYoutubeId(url: string): string | null {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/ // raw ID
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Declare global YT types
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: (() => void) | undefined;
    }
}

export default function WatchPartyRoomClient({
    roomId,
    videoUrl
}: {
    roomId: string;
    videoUrl: string;
}) {
    const { user, userData } = useAuth();
    const router = useRouter();

    const [room, setRoom] = useState<WatchPartyRoom | null>(null);
    const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [customUrlInput, setCustomUrlInput] = useState('');

    // YouTube Player
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const ytPlayerRef = useRef<any>(null);
    const [ytReady, setYtReady] = useState(false);
    const [activeUrl, setActiveUrl] = useState(videoUrl);
    const [isPlaying, setIsPlaying] = useState(false);

    // Sync guards
    const isSyncingFromRemote = useRef(false);
    const lastSyncTimeSent = useRef(0);
    const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // ===================== YouTube IFrame API =====================

    // Load YouTube IFrame API script
    useEffect(() => {
        if (window.YT && window.YT.Player) return; // Already loaded

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScript = document.getElementsByTagName('script')[0];
        firstScript.parentNode?.insertBefore(tag, firstScript);
    }, []);

    // Create YT Player when API is ready and we have a video ID
    const initPlayer = useCallback((videoId: string) => {
        // Destroy old player if exists
        if (ytPlayerRef.current) {
            try { ytPlayerRef.current.destroy(); } catch (e) { /* ignore */ }
            ytPlayerRef.current = null;
        }
        setYtReady(false);

        if (!playerContainerRef.current || !videoId) return;

        // Create a fresh div inside the container for the iframe
        const playerDiv = document.createElement('div');
        playerDiv.id = 'yt-player-' + Date.now();
        playerContainerRef.current.innerHTML = '';
        playerContainerRef.current.appendChild(playerDiv);

        const createPlayer = () => {
            ytPlayerRef.current = new window.YT.Player(playerDiv.id, {
                videoId,
                width: '100%',
                height: '100%',
                playerVars: {
                    autoplay: 0,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    fs: 1,
                },
                events: {
                    onReady: () => {
                        setYtReady(true);
                    },
                    onStateChange: (event: any) => {
                        // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3
                        if (isSyncingFromRemote.current) {
                            isSyncingFromRemote.current = false;
                            return;
                        }
                        if (event.data === 1) { // PLAYING
                            setIsPlaying(true);
                        } else if (event.data === 2) { // PAUSED
                            setIsPlaying(false);
                        }
                    }
                }
            });
        };

        if (window.YT && window.YT.Player) {
            createPlayer();
        } else {
            // Wait for API to load
            window.onYouTubeIframeAPIReady = createPlayer;
        }
    }, []);

    // When activeUrl changes, re-init the player
    useEffect(() => {
        const videoId = extractYoutubeId(activeUrl);
        if (videoId) {
            // Small delay to ensure the API script has loaded
            const timeout = setTimeout(() => initPlayer(videoId), 300);
            return () => clearTimeout(timeout);
        }
    }, [activeUrl, initPlayer]);

    // ===================== Firestore Listeners =====================

    useEffect(() => {
        if (!user || !userData) return;

        const attemptJoin = async () => {
            const ok = await joinWatchParty(roomId, user.uid, userData.username || user.displayName || 'Misafir', userData.avatarUrl);
            if (!ok) {
                toast.error('Oda bulunamadı veya doldu');
                router.push('/watch-party');
            }
        };
        attemptJoin();

        const unsubRoom = listenToWatchParty(roomId, (updatedRoom) => {
            setRoom(updatedRoom);
        });

        const unsubMessages = listenToWatchPartyMessages(roomId, (msgs) => {
            setMessages(msgs);
        });

        return () => {
            unsubRoom();
            unsubMessages();
            leaveWatchParty(roomId, user.uid);
        };
    }, [roomId, user, userData, router]);

    // Track active URL from Firestore room
    useEffect(() => {
        const newUrl = room?.customVideoUrl || videoUrl;
        if (newUrl && newUrl !== activeUrl) {
            setActiveUrl(newUrl);
        }
        // Pre-fill input
        if (room && !customUrlInput) {
            setCustomUrlInput(room.customVideoUrl || videoUrl);
        }
    }, [room?.customVideoUrl, videoUrl]);

    // ===================== Sync Logic =====================

    // Host: Periodically sync time to Firestore
    useEffect(() => {
        if (!room || room.hostId !== user?.uid) return;

        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
        }

        if (isPlaying && ytReady && ytPlayerRef.current) {
            syncIntervalRef.current = setInterval(() => {
                if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
                    const currentTime = ytPlayerRef.current.getCurrentTime();
                    syncWatchParty(roomId, 'playing', currentTime);
                }
            }, 5000);
        }

        return () => {
            if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
        };
    }, [isPlaying, ytReady, room?.hostId, user?.uid, roomId]);

    // Host: Sync play/pause state changes to Firestore
    useEffect(() => {
        if (!room || room.hostId !== user?.uid || !ytReady || !ytPlayerRef.current) return;

        const currentTime = ytPlayerRef.current.getCurrentTime?.() || 0;
        if (isPlaying) {
            syncWatchParty(roomId, 'playing', currentTime);
        } else {
            syncWatchParty(roomId, 'paused', currentTime);
        }
    }, [isPlaying]);

    // Guest: React to room state changes
    useEffect(() => {
        if (!room || !ytReady || !ytPlayerRef.current) return;
        if (room.hostId === user?.uid) return; // Host doesn't react to own changes

        try {
            const playerState = ytPlayerRef.current.getPlayerState?.();

            if (room.status === 'playing') {
                if (playerState !== 1) { // Not playing
                    isSyncingFromRemote.current = true;
                    ytPlayerRef.current.playVideo();
                    setIsPlaying(true);
                }
            } else {
                if (playerState === 1) { // Playing
                    isSyncingFromRemote.current = true;
                    ytPlayerRef.current.pauseVideo();
                    setIsPlaying(false);
                }
            }

            // Sync time
            const localTime = ytPlayerRef.current.getCurrentTime?.() || 0;
            if (Math.abs(localTime - room.currentTime) > 3) {
                isSyncingFromRemote.current = true;
                ytPlayerRef.current.seekTo(room.currentTime, true);
            }
        } catch (e) {
            // Player might not be ready yet
        }
    }, [room?.status, room?.currentTime, ytReady, user?.uid]);

    // ===================== Actions =====================

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim() || !user || !userData) return;
        sendWatchPartyMessage(roomId, user.uid, userData.username || user.displayName || 'Misafir', chatInput.trim());
        setChatInput('');
    };

    const copyInvite = () => {
        navigator.clipboard.writeText(roomId);
        toast.success('Oda kodu kopyalandı!');
    };

    const handleCustomUrlUpdate = async () => {
        if (!customUrlInput.trim()) return;
        const videoId = extractYoutubeId(customUrlInput.trim());
        if (!videoId) {
            toast.error('Geçersiz YouTube linki! Lütfen geçerli bir YouTube video URL\'si girin.');
            return;
        }
        try {
            toast.info('Video linki güncelleniyor...');
            await updateWatchPartyVideo(roomId, customUrlInput.trim());
            toast.success('Video başarıyla güncellendi!');
        } catch (e: any) {
            toast.error('Güncelleme başarısız: ' + e.message);
        }
    };

    const handleHostPlay = () => {
        if (!ytReady || !ytPlayerRef.current) return;
        ytPlayerRef.current.playVideo();
    };

    const handleHostPause = () => {
        if (!ytReady || !ytPlayerRef.current) return;
        ytPlayerRef.current.pauseVideo();
    };

    // ===================== Render =====================

    if (!room) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const isHost = room.hostId === user?.uid;
    const participantList = Object.values(room.participants || {});
    const currentVideoId = extractYoutubeId(activeUrl);

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] min-h-[600px]">

                {/* Left Side: Video Player */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center justify-between bg-muted/30 p-4 rounded-2xl">
                        <div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                                {room.title}
                            </h1>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                                <p className="text-sm text-muted-foreground mr-4">
                                    {isHost ? 'Yönetici Sizsiniz' : 'Yönetici videoyu kontrol ediyor'}
                                </p>
                                <div className="bg-background/50 border border-primary/20 px-3 py-1 rounded-full text-xs font-mono font-bold text-primary flex items-center gap-2">
                                    Kod: {roomId}
                                    <span title="Kodu Kopyala" className="flex items-center">
                                        <Copy
                                            className="h-3 w-3 cursor-pointer hover:text-white transition-colors"
                                            onClick={copyInvite}
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="destructive" className="rounded-xl" size="sm" onClick={() => router.push('/watch-party')}>
                                <LogOut className="h-4 w-4 mr-2" />
                                Ayrıl
                            </Button>
                        </div>
                    </div>

                    {isHost && (
                        <div className="bg-muted/10 p-3 rounded-2xl flex flex-col sm:flex-row items-center gap-3 mb-2">
                            <div className="flex-1 w-full flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                                <Input
                                    placeholder="YouTube video linki yapıştırın..."
                                    value={customUrlInput}
                                    onChange={(e) => setCustomUrlInput(e.target.value)}
                                    className="h-8 rounded-lg text-sm bg-background/50"
                                />
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <Button size="sm" onClick={handleCustomUrlUpdate} className="h-8 rounded-lg shrink-0" disabled={!customUrlInput.trim()}>
                                    Güncelle
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* YouTube Player Container */}
                    <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                        {currentVideoId ? (
                            <div
                                ref={playerContainerRef}
                                className="absolute inset-0 w-full h-full"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                <p>Henüz bir video seçilmedi</p>
                            </div>
                        )}
                    </div>

                    {/* Host Controls */}
                    {isHost && ytReady && (
                        <div className="flex items-center gap-3 justify-center">
                            <Button
                                size="sm"
                                variant={isPlaying ? "outline" : "default"}
                                className="rounded-xl"
                                onClick={isPlaying ? handleHostPause : handleHostPlay}
                            >
                                {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                {isPlaying ? 'Durdur' : 'Oynat'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Right Side: Chat & Participants */}
                <div className="w-full lg:w-80 flex flex-col gap-4">

                    {/* Participants */}
                    <div className="bg-muted/20 rounded-3xl p-4 shadow-lg border border-white/5">
                        <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Katılımcılar ({participantList.length})
                        </h3>
                        <ScrollArea className="h-28 pr-2">
                            <div className="space-y-3">
                                {participantList.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                                            <AvatarImage src={p.avatarUrl || ''} />
                                            <AvatarFallback className="bg-primary/20 text-xs">
                                                {p.username.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium leading-none">{p.username}</span>
                                            {p.role === 'host' && (
                                                <span className="text-[10px] text-primary mt-1">Yönetici</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Chat Box */}
                    <div className="flex-1 bg-muted/20 rounded-3xl flex flex-col shadow-lg border border-white/5 overflow-hidden">
                        <div className="p-4 bg-muted/30 border-b border-white/5">
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Sohbet</h3>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            <div className="space-y-4">
                                {messages.length === 0 ? (
                                    <div className="text-center text-xs text-muted-foreground py-8">
                                        Henüz mesaj yok. İlk mesajı siz gönderin!
                                    </div>
                                ) : (
                                    messages.map((msg, i) => {
                                        const isMe = msg.userId === user?.uid;
                                        return (
                                            <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                {!isMe && (
                                                    <span className="text-[10px] text-muted-foreground mb-1 ml-1">
                                                        {msg.username}
                                                    </span>
                                                )}
                                                <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'
                                                    }`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>

                        <form onSubmit={sendMessage} className="relative p-3 bg-muted/30 border-t border-white/5 flex gap-2">
                            {showEmojiPicker && (
                                <div className="absolute bottom-16 right-4 z-50 shadow-2xl">
                                    <EmojiPicker
                                        onEmojiClick={(e) => {
                                            setChatInput(prev => prev + e.emoji);
                                            setShowEmojiPicker(false);
                                        }}
                                        theme={Theme.DARK}
                                    />
                                </div>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="rounded-full shrink-0"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <Smile className="h-5 w-5" />
                            </Button>
                            <Input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Bir şeyler yazın..."
                                className="rounded-full bg-background/50 border-white/10"
                            />
                            <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!chatInput.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
}
