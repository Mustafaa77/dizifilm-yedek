'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Play, Pause, Users, MessageSquare, Send, ArrowLeft, Copy, Share2, Info, Loader2, Star, Clock, Tv } from 'lucide-react';
import { TMDBMovieDetail, TMDBTVDetail, fetchMovieById, fetchTVById, getYouTubeTrailerUrl, getBackdropUrl } from '@/lib/tmdb';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

interface Message {
  id: string;
  userId: string;
  userName: string;
  text: string;
  ts: number;
  spoiler?: boolean;
}

interface Participant {
  userId: string;
  userName: string;
}

export default function WatchPartyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, userData } = useAuth();
  
  const roomId = params?.roomId as string;
  const movieId = searchParams.get('movieId');
  const tvId = searchParams.get('tvId');

  const [content, setContent] = useState<TMDBMovieDetail | TMDBTVDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [inputText, setInputText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  
  const socketRef = useRef<any>(null);
  const playerRef = useRef<any>(null);
  const isRemoteAction = useRef(false);

  useEffect(() => {
    if (!user) {
      toast.error('Watch Party için giriş yapmalısınız');
      router.push('/');
      return;
    }

    const loadData = async () => {
      try {
        if (movieId) {
          const data = await fetchMovieById(parseInt(movieId));
          setContent(data);
        } else if (tvId) {
          const data = await fetchTVById(parseInt(tvId));
          setContent(data);
        }
      } catch (error) {
        console.error('Content load error:', error);
      }
      setLoading(false);
    };

    loadData();

    // Socket Connection
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    const { io } = require('socket.io-client');
    const socket = io(WS_URL, { 
      transports: ['websocket'],
      reconnectionAttempts: 5,
      withCredentials: true
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      setWsConnected(true);
      socket.emit('room:join', { 
        roomId, 
        userId: user.uid, 
        userName: userData?.username || user.email || 'Kullanıcı',
        movieData: content
      });
    });

    socket.on('video:sync', (data: any) => {
      if (data.movieData && !content) setContent(data.movieData);
      setIsPlaying(data.playing);
      setParticipants(data.participants || []);
      if (data.time > 0) playerRef.current?.seekTo(data.time, 'seconds');
    });

    socket.on('video:play', (data: any) => {
      isRemoteAction.current = true;
      setIsPlaying(true);
      if (data.time) playerRef.current?.seekTo(data.time, 'seconds');
      setTimeout(() => (isRemoteAction.current = false), 100);
    });

    socket.on('video:pause', (data: any) => {
      isRemoteAction.current = true;
      setIsPlaying(false);
      setTimeout(() => (isRemoteAction.current = false), 100);
    });

    socket.on('video:seek', (data: any) => {
      isRemoteAction.current = true;
      playerRef.current?.seekTo(data.time, 'seconds');
      setTimeout(() => (isRemoteAction.current = false), 100);
    });

    socket.on('chat:message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.on('room:user-joined', (data: any) => {
      setParticipants(data.participants);
      toast.info(`${data.userName} odaya katıldı`);
    });

    socket.on('room:user-left', (data: any) => {
      setParticipants(data.participants);
      toast.info(`${data.userName} odadan ayrıldı`);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, movieId, user, userData]);

  const handlePlay = () => {
    if (isRemoteAction.current) return;
    socketRef.current?.emit('video:play', { roomId, time: playerRef.current?.getCurrentTime() || 0 });
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (isRemoteAction.current) return;
    socketRef.current?.emit('video:pause', { roomId, time: playerRef.current?.getCurrentTime() || 0 });
    setIsPlaying(false);
  };

  const handleSeek = (seconds: number) => {
    if (isRemoteAction.current) return;
    socketRef.current?.emit('video:seek', { roomId, time: seconds });
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    socketRef.current?.emit('chat:message', {
      roomId,
      text: inputText,
      userId: user?.uid,
      userName: userData?.username || user?.email || 'Kullanıcı'
    });
    setInputText('');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Oda linki kopyalandı!');
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground animate-pulse font-medium">Odaya bağlanılıyor...</p>
      </div>
    </div>
  );

  const videoUrl = content ? `https://www.youtube.com/watch?v=${content.videos?.results?.find(v => v.type === 'Trailer')?.key || content.videos?.results?.[0]?.key}` : '';

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background overflow-hidden selection:bg-primary/30">
      {/* Left side: Video & Info */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.back()}
              className="rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/10"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Ayrıl
            </Button>
            {content && (
              <div className="hidden md:flex flex-col">
                <span className="text-white font-bold text-sm line-clamp-1">{(content as TMDBMovieDetail).title || (content as TMDBTVDetail).name}</span>
                <span className="text-white/60 text-[10px] uppercase tracking-widest font-bold">Birlikte İzle</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 pointer-events-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={copyLink}
              className="rounded-full bg-primary/20 backdrop-blur-md text-primary hover:bg-primary/30 border border-primary/20"
            >
              <Copy className="h-4 w-4 mr-2" />
              Davet Linki
            </Button>
            <div className="flex -space-x-2">
              {participants.slice(0, 3).map((p, i) => (
                <Avatar key={i} className="h-8 w-8 border-2 border-background ring-2 ring-primary/20">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                    {p.userName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {participants.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold">
                  +{participants.length - 3}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 bg-black flex items-center justify-center relative group">
          {videoUrl ? (
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              width="100%"
              height="100%"
              playing={isPlaying}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              controls
              config={{
                youtube: {
                  playerVars: { showinfo: 0, rel: 0, modestbranding: 1, iv_load_policy: 3 }
                }
              }}
            />
          ) : (
            <div className="text-center space-y-6 max-w-sm px-6">
              <div className="h-20 w-20 rounded-3xl bg-muted/20 flex items-center justify-center mx-auto animate-pulse">
                <Play className="h-10 w-10 text-muted-foreground/40" />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-bold">Fragman Hazırlanıyor</p>
                <p className="text-sm text-muted-foreground">Video içeriği senkronize ediliyor, lütfen bekleyin...</p>
              </div>
            </div>
          )}
        </div>

        {/* Content Info (Desktop Bottom) */}
        <div className="hidden lg:block bg-background/40 p-6 border-t border-white/5 backdrop-blur-2xl">
          <div className="container mx-auto flex items-center gap-6">
            {content && (
              <>
                <div className="relative h-20 w-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl border border-white/10">
                  <Image src={getBackdropUrl(content.backdrop_path)} alt={(content as TMDBMovieDetail).title || (content as TMDBTVDetail).name} fill className="object-cover" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-black tracking-tight">{(content as TMDBMovieDetail).title || (content as TMDBTVDetail).name}</h1>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none rounded-full px-3">
                      {movieId ? 'FİLM' : 'DİZİ'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-yellow-500 fill-current" /> {content.vote_average.toFixed(1)} TMDB</span>
                    <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {(content as TMDBMovieDetail).runtime || (content as TMDBTVDetail).episode_run_time?.[0]} DK</span>
                    <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {participants.length} İZLEYİCİ</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Chat & Participants */}
      <div className="w-full lg:w-96 flex flex-col h-[40vh] lg:h-full border-l bg-background/50 backdrop-blur-2xl">
        <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl bg-muted/50 p-1">
              <TabsTrigger value="chat" className="rounded-xl flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Sohbet
              </TabsTrigger>
              <TabsTrigger value="users" className="rounded-xl flex items-center gap-2">
                <Users className="h-4 w-4" />
                Katılımcılar
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden p-0 m-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-10 space-y-2">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/20 mx-auto" />
                    <p className="text-xs text-muted-foreground font-medium">Sohbeti başlatın!</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "flex flex-col gap-1 max-w-[85%]",
                    msg.userId === user?.uid ? "ml-auto items-end" : "items-start"
                  )}>
                    <span className="text-[10px] font-bold text-muted-foreground px-2">
                      {msg.userId === user?.uid ? 'Sen' : msg.userName}
                    </span>
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-sm shadow-sm",
                      msg.userId === user?.uid 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted rounded-tl-none"
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            
            <form onSubmit={sendMessage} className="p-4 border-t bg-background/80 backdrop-blur-md">
              <div className="flex gap-2">
                <Input 
                  placeholder="Bir şeyler yaz..." 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="rounded-xl h-12 bg-muted/50 border-none focus:ring-2 focus:ring-primary/20"
                />
                <Button type="submit" size="icon" className="h-12 w-12 rounded-xl flex-shrink-0">
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="users" className="flex-1 overflow-hidden p-0 m-0">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 transition-all hover:bg-muted/50">
                    <Avatar className="h-10 w-10 border-2 border-background">
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {p.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{p.userName}</p>
                      <p className="text-[10px] text-muted-foreground">İzleyici</p>
                    </div>
                    {p.userId === user?.uid && <Badge variant="secondary" className="text-[9px] rounded-full">Sen</Badge>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
