const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY || '';

async function apiFetch(endpoint) {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}${separator}api_key=${API_KEY}`;
  return fetch(url);
}

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export interface TMDBItem {
  id: number;
  title: string;
  name?: string; // TV series için
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  first_air_date?: string; // TV series için
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  adult: boolean;
  original_language: string;
  original_title: string;
  original_name?: string; // TV series için
  popularity: number;
  video: boolean;
  media_type?: string; // 'movie' veya 'tv'
}

// Movie için özel interface
export interface TMDBMovie extends TMDBItem {
  title: string;
  release_date: string;
  original_title: string;
}

// TV Series için özel interface
export interface TMDBTVSeries extends TMDBItem {
  name: string;
  first_air_date: string;
  original_name: string;
}

export interface TMDBMovieDetail extends TMDBMovie {
  runtime: number | null;
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string; logo_path: string | null }[];
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { iso_639_1: string; name: string }[];
  status: string;
  tagline: string | null;
  budget: number;
  revenue: number;
  imdb_id: string | null;
  videos?: { results: TMDBVideo[] };
}

export interface TMDBTVDetail extends TMDBTVSeries {
  seasons: never[];
  episode_run_time: number[];
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string; logo_path: string | null }[];
  production_countries: { iso_3166_1: string; name: string }[];
  spoken_languages: { iso_639_1: string; name: string }[];
  status: string;
  tagline: string | null;
  number_of_episodes: number;
  number_of_seasons: number;
  created_by: { id: number; name: string }[];
  networks: { id: number; name: string; logo_path: string | null }[];
  videos?: { results: TMDBVideo[] };
}

export interface TMDBSearchResult {
  page: number;
  results: TMDBItem[];
  total_pages: number;
  total_results: number;
}

export interface TMDBVideo {
  id: string;
  iso_639_1: string;
  iso_3166_1: string;
  key: string;
  name: string;
  site: string;
  size: number;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TMDBVideosResponse {
  id: number;
  results: TMDBVideo[];
}

export interface TMDBSeason {
  id: number;
  air_date: string;
  episode_count: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  air_date: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  vote_average: number;
  vote_count: number;
  runtime: number | null;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
  known_for_department: string;
}

export interface TMDBCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TMDBCredits {
  id: number;
  cast: TMDBCastMember[];
  crew: TMDBCrewMember[];
}

// Film detaylarını ID ile çekme
export async function fetchMovieById(movieId: number): Promise<TMDBMovieDetail | null> {
  try {
    const response = await apiFetch(`/movie/${movieId}?language=tr-TR`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Film detayları alınırken hata:", error);
    return null;
  }
}

// Dizi detaylarını ID ile çekme
export async function fetchTVById(tvId: number): Promise<TMDBTVDetail | null> {
  try {
    const response = await apiFetch(`/tv/${tvId}?language=tr-TR`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Dizi detayları alınırken hata:", error);
    return null;
  }
}

// Film videolarını çekme (fragman için)
export async function fetchMovieVideos(movieId: number): Promise<TMDBVideo[]> {
  try {
    const response = await apiFetch(`/movie/${movieId}/videos?language=en-US`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: TMDBVideosResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error("Film videoları alınırken hata:", error);
    return [];
  }
}

// Dizi videolarını çekme (fragman için)
export async function fetchTVVideos(tvId: number): Promise<TMDBVideo[]> {
  try {
    const response = await apiFetch(`/tv/${tvId}/videos?language=en-US`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: TMDBVideosResponse = await response.json();
    return data.results;
  } catch (error) {
    console.error("Dizi videoları alınırken hata:", error);
    return [];
  }
}

// Film oyuncu + ekip (credits)
export async function fetchMovieCredits(movieId: number): Promise<TMDBCredits | null> {
  try {
    const response = await apiFetch(`/movie/${movieId}/credits?language=tr-TR`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Film oyuncuları alınırken hata:", error);
    return null;
  }
}

// Dizi oyuncu + ekip (credits)
export async function fetchTVCredits(tvId: number): Promise<TMDBCredits | null> {
  try {
    const response = await apiFetch(`/tv/${tvId}/credits?language=tr-TR`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Dizi oyuncuları alınırken hata:", error);
    return null;
  }
}

// Benzer filmler
export async function fetchSimilarMovies(movieId: number): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/movie/${movieId}/similar?language=tr-TR&page=1`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    data.results = (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
    return data;
  } catch (error) {
    console.error("Benzer filmler alınırken hata:", error);
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}

// Benzer diziler
export async function fetchSimilarTVSeries(tvId: number): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/tv/${tvId}/similar?language=tr-TR&page=1`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    data.results = (data.results || []).map((item: any) => ({ ...item, media_type: 'tv' }));
    return data;
  } catch (error) {
    console.error("Benzer diziler alınırken hata:", error);
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}

// Önerilen filmler
export async function fetchMovieRecommendations(movieId: number): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/movie/${movieId}/recommendations?language=tr-TR&page=1`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    data.results = (data.results || []).map((item: any) => ({ ...item, media_type: 'movie' }));
    return data;
  } catch (error) {
    console.error("Önerilen filmler alınırken hata:", error);
    return { page: 1, results: [], total_pages: 0, total_results: 0 };
  }
}

// Dizi sezonlarını çekme
export async function fetchTVSeasons(tvId: number): Promise<TMDBSeason[]> {
  try {
    // Önce dizi detaylarını çekelim, sezon bilgileri burada yer alıyor
    const tvDetails = await fetchTVById(tvId);
    if (!tvDetails) return [];

    // Sezon bilgilerini döndür
    return tvDetails.seasons || [];
  } catch (error) {
    console.error("Dizi sezonları alınırken hata:", error);
    return [];
  }
}

// TMDB arama fonksiyonu
export async function searchTMDB(query: string, page: number = 1): Promise<{ results: TMDBSearchResult[], total_pages: number }> {
  try {
    const response = await apiFetch(`/search/multi?language=tr-TR&query=${encodeURIComponent(query)}&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      results: data.results.filter((item: any) => item.media_type === 'movie' || item.media_type === 'tv'),
      total_pages: data.total_pages
    };
  } catch (error) {
    console.error("Arama yapılırken hata:", error);
    return { results: [], total_pages: 0 };
  }
}

// Belirli bir sezonun bölümlerini çekme
export async function fetchSeasonEpisodes(tvId: number, seasonNumber: number): Promise<TMDBEpisode[]> {
  try {
    const response = await apiFetch(`/tv/${tvId}/season/${seasonNumber}?language=tr-TR`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.episodes || [];
  } catch (error) {
    console.error(`Sezon ${seasonNumber} bölümleri alınırken hata:`, error);
    return [];
  }
}

// YouTube fragman URL'si oluşturma
export function getYouTubeTrailerUrl(videos: TMDBVideo[]): string | null {
  const trailer = videos.find(
    video => video.type === "Trailer" && video.site === "YouTube"
  );

  if (trailer) {
    return `https://www.youtube.com/embed/${trailer.key}?autoplay=0&rel=0&modestbranding=1&controls=1&showinfo=0&fs=1&cc_load_policy=0&iv_load_policy=3&autohide=0&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`;
  }

  return null;
}

// Multi arama (film + dizi)
export async function searchMulti(query: string, page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/search/multi?language=tr-TR&query=${encodeURIComponent(query)}&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Sadece film ve dizi sonuçlarını filtrele
    data.results = data.results.filter((item: any) =>
      item.media_type === 'movie' || item.media_type === 'tv'
    );
    return data;
  } catch (error) {
    console.error("Arama sırasında hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Sadece film arama
export async function searchMovies(query: string, page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/search/movie?language=tr-TR&query=${encodeURIComponent(query)}&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'movie' }));
    return data;
  } catch (error) {
    console.error("Film arama sırasında hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Sadece dizi arama
export async function searchTVSeries(query: string, page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/search/tv?language=tr-TR&query=${encodeURIComponent(query)}&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'tv' }));
    return data;
  } catch (error) {
    console.error("Dizi arama sırasında hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Popüler filmleri çekme
export async function fetchPopularMovies(page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/movie/popular?language=tr-TR&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'movie' }));
    return data;
  } catch (error) {
    console.error("Popüler filmler alınırken hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Popüler dizileri çekme
export async function fetchPopularTVSeries(page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/tv/popular?language=tr-TR&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'tv' }));
    return data;
  } catch (error) {
    console.error("Popüler diziler alınırken hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// En çok oy alan filmleri çekme
export async function fetchTopRatedMovies(page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/movie/top_rated?language=tr-TR&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'movie' }));
    return data;
  } catch (error) {
    console.error("En çok oy alan filmler alınırken hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// En çok oy alan dizileri çekme
export async function fetchTopRatedTVSeries(page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/tv/top_rated?language=tr-TR&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'tv' }));
    return data;
  } catch (error) {
    console.error("En çok oy alan diziler alınırken hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Yakında çıkacak filmleri çekme
export async function fetchUpcomingMovies(page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/movie/upcoming?language=tr-TR&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'movie' }));
    return data;
  } catch (error) {
    console.error("Yakında çıkacak filmler alınırken hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Şu anda vizyonda olan filmleri çekme
export async function fetchNowPlayingMovies(page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/movie/now_playing?language=tr-TR&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'movie' }));
    return data;
  } catch (error) {
    console.error("Vizyondaki filmler alınırken hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Şu anda yayında olan dizileri çekme
export async function fetchOnTheAirTVSeries(page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/tv/on_the_air?language=tr-TR&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'tv' }));
    return data;
  } catch (error) {
    console.error("Yayındaki diziler alınırken hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Kategoriye göre film çekme
export async function fetchMoviesByGenre(genreId: number, page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/discover/movie?language=tr-TR&with_genres=${genreId}&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'movie' }));
    return data;
  } catch (error) {
    console.error("Kategoriye göre filmler alınırken hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Kategoriye göre dizi çekme
export async function fetchTVSeriesByGenre(genreId: number, page = 1): Promise<TMDBSearchResult> {
  try {
    const response = await apiFetch(`/discover/tv?language=tr-TR&with_genres=${genreId}&page=${page}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({ ...item, media_type: 'tv' }));
    return data;
  } catch (error) {
    console.error("Kategoriye göre diziler alınırken hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Yıla göre arama
export async function searchByYear(year: string, mediaType: string = 'all', page = 1): Promise<TMDBSearchResult> {
  try {
    let url = '';

    if (mediaType === 'movie') {
      url = `${BASE_URL}/discover/movie?language=tr-TR&primary_release_year=${year}&page=${page}`;
    } else if (mediaType === 'tv') {
      url = `${BASE_URL}/discover/tv?language=tr-TR&first_air_date_year=${year}&page=${page}`;
    } else {
      // Her ikisini de ara ve birleştir
      const [movieResults, tvResults] = await Promise.all([
        searchByYear(year, 'movie', page),
        searchByYear(year, 'tv', page)
      ]);

      return {
        page: page,
        results: [...movieResults.results, ...tvResults.results],
        total_pages: Math.max(movieResults.total_pages, tvResults.total_pages),
        total_results: movieResults.total_results + tvResults.total_results
      };
    }

    const response = await apiFetch(url.replace(BASE_URL, ""));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Media type ekle
    data.results = data.results.map((item: any) => ({
      ...item,
      media_type: mediaType === 'movie' ? 'movie' : 'tv'
    }));
    return data;
  } catch (error) {
    console.error("Yıla göre arama sırasında hata:", error);
    return {
      page: 1,
      results: [],
      total_pages: 0,
      total_results: 0
    };
  }
}

// Poster URL'si oluşturma
export function getPosterUrl(posterPath: string | null, size: string = 'w500'): string {
  if (!posterPath) {
    return 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop';
  }
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

// Backdrop URL'si oluşturma
export function getBackdropUrl(backdropPath: string | null, size: string = 'w1280'): string {
  if (!backdropPath) {
    return 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=1280&h=720&fit=crop';
  }
  return `https://image.tmdb.org/t/p/${size}${backdropPath}`;
}

// Başlık alma (film veya dizi)
export function getTitle(item: TMDBItem): string {
  return item.title || item.name || 'Başlık Yok';
}

// Yayın tarihi alma (film veya dizi)
export function getReleaseDate(item: TMDBItem): string {
  return item.release_date || item.first_air_date || '';
}

// Media type'a göre URL oluşturma
export function getDetailUrl(item: TMDBItem): string {
  const mediaType = item.media_type || 'movie';
  return `/${mediaType}?id=${item.id}`;
}

// Tür ID'lerini isimlerle eşleştirme
export const genreMap: { [key: number]: string } = {
  28: 'Aksiyon',
  12: 'Macera',
  16: 'Animasyon',
  35: 'Komedi',
  80: 'Suç',
  99: 'Belgesel',
  18: 'Drama',
  10751: 'Aile',
  14: 'Fantastik',
  36: 'Tarih',
  27: 'Korku',
  10402: 'Müzik',
  9648: 'Gizem',
  10749: 'Romantik',
  878: 'Bilim Kurgu',
  10770: 'TV Film',
  53: 'Gerilim',
  10752: 'Savaş',
  37: 'Vahşi Batı',
  // TV türleri
  10759: 'Aksiyon & Macera',
  10762: 'Çocuk',
  10763: 'Haber',
  10764: 'Reality',
  10765: 'Bilim Kurgu & Fantastik',
  10766: 'Pembe Dizi',
  10767: 'Talk Show',
  10768: 'Savaş & Politika'
};

// Popüler Film ID'leri listesi
export const popularMovieIds = [
  550, 155, 13, 680, 27205, 157336, 278, 238, 129, 11, 120, 122, 121,
  603, 807, 1124, 98, 1422, 244786, 496243, 8587, 105, 348, 497, 101,
  77, 10681, 299536, 324857, 769, 1891, 68718, 475557, 872585, 693134,
  111, 641, 1088, 389, 424, 19404, 274, 348350, 11324, 73, 107, 118340,
  284054, 313369, 128, 41154, 508965, 372058, 24428, 862, 240
];

// Popüler Dizi ID'leri listesi
export const popularTVIds = [
  1396, 60625, 1399, 1402, 63174, 71446, 60059, 1405, 1412, 4614, 1434, 1408, 1416, 1418, 1419, 1421, 1424, 1425
];

// Rastgele 7+ Puanlı Film ID'si (Genişletilmiş Liste)
export function getRandomMovieId(): number {
  return popularMovieIds[Math.floor(Math.random() * popularMovieIds.length)];
}
