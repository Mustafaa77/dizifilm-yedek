'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import WatchPartyRoomClient from '@/components/WatchPartyRoomClient';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { WatchPartyRoom } from '@/lib/watchParty';
import { fetchMovieVideos, fetchTVVideos, getYouTubeTrailerUrl, TMDBVideo } from '@/lib/tmdb';

export default function WatchPartyRoomPage() {
    const params = useParams();
    const roomId = params.roomId as string;

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const roomRef = doc(db, 'watchparties', roomId);
                const snap = await getDoc(roomRef);

                if (!snap.exists()) {
                    setError(true);
                    setLoading(false);
                    return;
                }

                const room = snap.data() as WatchPartyRoom;

                // Fetch trailer from TMDB based on media type
                let videos: TMDBVideo[] = [];
                if (room.mediaType === 'movie') {
                    videos = await fetchMovieVideos(parseInt(room.movieId));
                } else {
                    videos = await fetchTVVideos(parseInt(room.movieId));
                }

                const trailerUrl = getYouTubeTrailerUrl(videos);

                // If no trailer found, provide a fallback generic video or just null
                if (trailerUrl) {
                    // We need raw youtube link for react-player rather than embed, or embed might work.
                    // getYouTubeTrailerUrl gives embed URL, react-player works best with watch?v= format but embed is fine.
                    // Actually react-player handles embed URL properly.
                    setVideoUrl(trailerUrl);
                } else {
                    // Fallback dummy video for testing if no trailer
                    setVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
                }

                setLoading(false);
            } catch (err) {
                console.error(err);
                setError(true);
                setLoading(false);
            }
        }

        if (roomId) {
            loadData();
        }
    }, [roomId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground animate-pulse">Oda Yükleniyor...</p>
            </div>
        );
    }

    if (error || !videoUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <h2 className="text-2xl font-bold text-destructive">Oda Bulunamadı</h2>
                <p className="text-muted-foreground">Bu izleme odası silinmiş veya geçersiz olabilir.</p>
            </div>
        );
    }

    return <WatchPartyRoomClient roomId={roomId} videoUrl={videoUrl} />;
}
