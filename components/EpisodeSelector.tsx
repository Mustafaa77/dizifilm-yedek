'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TMDBSeason, TMDBEpisode, fetchTVSeasons, fetchSeasonEpisodes } from '@/lib/tmdb';
import { Play, Calendar, Clock } from 'lucide-react';

interface EpisodeSelectorProps {
  tvId: number | string;
  seasons?: any[];
  onEpisodeSelect: (seasonNumber: number, episodeNumber: number) => void;
}

export default function EpisodeSelector({ tvId, seasons = [], onEpisodeSelect }: EpisodeSelectorProps) {
  const router = useRouter();
  const [episodes, setEpisodes] = useState<TMDBEpisode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Seçilen sezonun bölümlerini yükle
  useEffect(() => {
    const loadEpisodes = async () => {
      if (!selectedSeason) return;
      
      setLoading(true);
      try {
        const episodesData = await fetchSeasonEpisodes(
          typeof tvId === 'string' ? parseInt(tvId) : tvId, 
          selectedSeason
        );
        setEpisodes(episodesData);
      } catch (err) {
        console.error('Bölümler yüklenirken hata:', err);
        setError('Bölümler yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };

    if (tvId && selectedSeason) {
      loadEpisodes();
    }
  }, [tvId, selectedSeason]);

  // Sezon değişikliği
  const handleSeasonChange = (value: string) => {
    setSelectedSeason(parseInt(value));
  };

  // İlk sezon seçimi
  useEffect(() => {
    if (seasons && seasons.length > 0) {
      // 0. sezon genelde özel bölümler olduğu için, varsa 1. sezonu seç
      const defaultSeason = seasons.find(s => s.season_number === 1) || seasons[0];
      setSelectedSeason(defaultSeason.season_number);
    }
  }, [seasons]);

  // Bölüm izleme sayfasına yönlendirme
  const handleWatchEpisode = (seasonNumber: number, episodeNumber: number) => {
    onEpisodeSelect(seasonNumber, episodeNumber);
  };

  if (loading && seasons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bölümler Yükleniyor...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hata</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bölümler</CardTitle>
          <Select value={selectedSeason.toString()} onValueChange={handleSeasonChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sezon seçin" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.season_number.toString()}>
                  {season.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {episodes.length > 0 ? (
            episodes.map((episode) => (
              <Card key={episode.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="relative w-full md:w-1/3 h-[120px]">
                    {episode.still_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                        alt={episode.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground">Görsel Yok</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">
                        {episode.episode_number}. {episode.name}
                      </h3>
                      <Button 
                        size="sm" 
                        onClick={() => handleWatchEpisode(episode.season_number, episode.episode_number)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Play className="h-4 w-4 mr-1" /> İzle
                      </Button>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                      {episode.air_date && (
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(episode.air_date).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                      {episode.runtime && (
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {episode.runtime} dk
                        </div>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2">{episode.overview || "Bu bölüm için açıklama bulunmuyor."}</p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Bu sezon için bölüm bilgisi bulunamadı.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}