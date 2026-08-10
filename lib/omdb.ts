const API_KEY = "b4dba5bb";
const BASE_URL = "https://www.omdbapi.com/";

export interface Movie {
  imdbID: string;
  Title: string;
  Year: string;
  Type: string;
  Poster: string;
  Plot?: string;
  Genre?: string;
  Director?: string;
  Actors?: string;
  imdbRating?: string;
  Runtime?: string;
  Released?: string;
  Writer?: string;
  Awards?: string;
  Country?: string;
  Language?: string;
  Metascore?: string;
  DVD?: string;
  BoxOffice?: string;
  Production?: string;
  Website?: string;
  Response?: string;
  Error?: string;
}

export interface SearchResult {
  Search?: Movie[];
  totalResults?: string;
  Response: string;
  Error?: string;
}

// IMDB ID ile detay çekme
export async function fetchDetailsByImdbId(imdbId: string): Promise<Movie | null> {
  try {
    const res = await fetch(`${BASE_URL}?i=${imdbId}&apikey=${API_KEY}&plot=full`);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    if (data.Response === "True") {
      return data;
    } else {
      console.error('OMDb API Error:', data.Error);
      return null;
    }
  } catch (error) {
    console.error("Film detayları alınırken hata:", error);
    return null;
  }
}

// IMDb fragman URL'si oluştur
export function getImdbTrailerUrl(imdbId: string): string {
  return `https://www.imdb.com/title/${imdbId}/videogallery/?ref_=tt_pv_vi_sm`;
}

// YouTube fragman embed URL'si oluştur
export function getYouTubeEmbedUrl(title: string, year: string, type: string = 'movie'): string {
  const typeText = type === 'series' ? 'series' : 'movie';
  const searchQuery = `${title} ${year} ${typeText} trailer`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
}

// Gelişmiş arama fonksiyonu - kategorilere göre arama
export async function searchByTitle(title: string, type?: string, year?: string, page = 1): Promise<SearchResult> {
  try {
    let url = `${BASE_URL}?s=${encodeURIComponent(title)}&apikey=${API_KEY}&page=${page}`;
    
    if (type && type !== "all") {
      url += `&type=${type}`;
    }
    
    if (year && year !== "all") {
      url += `&y=${year}`;
    }
    
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Resmi olmayan filmleri filtrele
    if (data.Response === "True" && data.Search) {
      data.Search = data.Search.filter((movie: Movie) => 
        movie.Poster && movie.Poster !== 'N/A' && movie.Poster.includes('http')
      );
      
      // Filtreleme sonrası sonuç sayısını güncelle
      if (data.Search.length === 0) {
        return { Response: "False", Error: "Resimli sonuç bulunamadı" };
      }
    }
    
    return data;
  } catch (error) {
    console.error("Arama sırasında hata:", error);
    return { Response: "False", Error: "Arama sırasında hata oluştu" };
  }
}

// Kategori bazlı arama - düzeltilmiş versiyon
export async function searchByGenre(genre: string, type?: string, page = 1): Promise<SearchResult> {
  try {
    // Kategori ID'lerini kullanarak doğrudan OMDb'den çek
    const categoryIds: { [key: string]: string[] } = {
      'action': ["tt0468569", "tt0137523", "tt0076759", "tt0080684", "tt4154756", "tt1375666", "tt0133093", "tt0816692"],
      'aksiyon': ["tt0468569", "tt0137523", "tt0076759", "tt0080684", "tt4154756", "tt1375666", "tt0133093", "tt0816692"],
      'comedy': ["tt0109830", "tt0386676", "tt0460649", "tt0108778", "tt2467372", "tt0898266", "tt0412142", "tt0264235"],
      'komedi': ["tt0109830", "tt0386676", "tt0460649", "tt0108778", "tt2467372", "tt0898266", "tt0412142", "tt0264235"],
      'drama': ["tt0111161", "tt0068646", "tt0071562", "tt0108052", "tt0050083", "tt0073486", "tt0099685", "tt0047478"],
      'horror': ["tt0081505", "tt0078748", "tt0073195", "tt0067116", "tt0090605", "tt0114746", "tt0119396", "tt0253474"],
      'korku': ["tt0081505", "tt0078748", "tt0073195", "tt0067116", "tt0090605", "tt0114746", "tt0119396", "tt0253474"],
      'romance': ["tt0110357", "tt0120338", "tt0112471", "tt0038650", "tt0098635", "tt0088247", "tt0268978", "tt0338013"],
      'romantik': ["tt0110357", "tt0120338", "tt0112471", "tt0038650", "tt0098635", "tt0088247", "tt0268978", "tt0338013"],
      'sci-fi': ["tt0076759", "tt0080684", "tt1375666", "tt0133093", "tt0088763", "tt0078748", "tt0816692", "tt0482571"],
      'bilim kurgu': ["tt0076759", "tt0080684", "tt1375666", "tt0133093", "tt0088763", "tt0078748", "tt0816692", "tt0482571"],
      'thriller': ["tt0102926", "tt0114369", "tt1130884", "tt0167404", "tt0482571", "tt0338013", "tt0268978", "tt0120815"],
      'gerilim': ["tt0102926", "tt0114369", "tt1130884", "tt0167404", "tt0482571", "tt0338013", "tt0268978", "tt0120815"],
      'animation': ["tt0114709", "tt0120623", "tt0317219", "tt0435761", "tt0382932", "tt1049413", "tt0892769", "tt0910970"],
      'animasyon': ["tt0114709", "tt0120623", "tt0317219", "tt0435761", "tt0382932", "tt1049413", "tt0892769", "tt0910970"],
      'fantasy': ["tt0120737", "tt0167260", "tt0167261", "tt0241527", "tt0926084", "tt1201607", "tt0304141", "tt0417741"],
      'fantastik': ["tt0120737", "tt0167260", "tt0167261", "tt0241527", "tt0926084", "tt1201607", "tt0304141", "tt0417741"],
      'crime': ["tt0099685", "tt0070047", "tt0112641", "tt0407887", "tt0172495", "tt0317248", "tt0110912", "tt0095016"],
      'suç': ["tt0099685", "tt0070047", "tt0112641", "tt0407887", "tt0172495", "tt0317248", "tt0110912", "tt0095016"]
    };

    const movieIds = categoryIds[genre.toLowerCase()] || categoryIds['action'];
    
    // Rastgele film seç ve detaylarını çek
    const selectedIds = movieIds.slice((page - 1) * 10, page * 10);
    const movies = await Promise.all(
      selectedIds.map(id => fetchDetailsByImdbId(id))
    );
    
    const validMovies = movies.filter(movie => 
      movie && movie.Poster && movie.Poster !== 'N/A' && movie.Poster.includes('http')
    ) as Movie[];
    
    return {
      Search: validMovies,
      totalResults: movieIds.length.toString(),
      Response: "True"
    };
  } catch (error) {
    console.error("Kategori araması sırasında hata:", error);
    return { Response: "False", Error: "Kategori araması sırasında hata oluştu" };
  }
}

// Popüler filmler için önceden belirlenmiş listeler - sadece resimli olanlar
export const popularMovieIds = [
  "tt0111161", // The Shawshank Redemption
  "tt0068646", // The Godfather
  "tt0071562", // The Godfather: Part II
  "tt0468569", // The Dark Knight
  "tt0050083", // 12 Angry Men
  "tt0108052", // Schindler's List
  "tt0167260", // The Lord of the Rings: The Return of the King
  "tt0110912", // Pulp Fiction
  "tt0120737", // The Lord of the Rings: The Fellowship of the Ring
  "tt0060196", // The Good, the Bad and the Ugly
  "tt0137523", // Fight Club
  "tt0109830", // Forrest Gump
  "tt1375666", // Inception
  "tt0080684", // Star Wars: Episode V - The Empire Strikes Back
  "tt0167261", // The Lord of the Rings: The Two Towers
  "tt0073486", // One Flew Over the Cuckoo's Nest
  "tt0099685", // Goodfellas
  "tt0076759", // Star Wars: Episode IV - A New Hope
  "tt0047478", // Seven Samurai
  "tt0317248", // City of God
];

export const popularSeriesIds = [
  "tt0903747", // Breaking Bad
  "tt0944947", // Game of Thrones
  "tt1475582", // Sherlock
  "tt0141842", // The Sopranos
  "tt0306414", // The Wire
  "tt2306299", // Vikings
  "tt1520211", // The Walking Dead
  "tt0386676", // The Office
  "tt0417299", // Avatar: The Last Airbender
  "tt0455275", // Prison Break
  "tt0460649", // How I Met Your Mother
  "tt0108778", // Friends
  "tt0773262", // Dexter
  "tt1856010", // House of Cards
  "tt0436992", // Doctor Who
  "tt2467372", // Brooklyn Nine-Nine
  "tt0898266", // The Big Bang Theory
  "tt0412142", // House
  "tt0264235", // Lost
];

// Rastgele film/dizi ID'si
export function getRandomMovieId(): string {
  const allIds = [...popularMovieIds, ...popularSeriesIds];
  return allIds[Math.floor(Math.random() * allIds.length)];
}

// Popüler içerikleri çekme - resim kontrolü ile
export async function fetchPopularMovies(): Promise<Movie[]> {
  try {
    const movies = await Promise.all(
      popularMovieIds.slice(0, 12).map(id => fetchDetailsByImdbId(id))
    );
    return movies.filter(movie => 
      movie && movie.Poster && movie.Poster !== 'N/A' && movie.Poster.includes('http')
    ) as Movie[];
  } catch (error) {
    console.error('Popüler filmler yüklenirken hata:', error);
    return [];
  }
}

export async function fetchPopularSeries(): Promise<Movie[]> {
  try {
    const series = await Promise.all(
      popularSeriesIds.slice(0, 12).map(id => fetchDetailsByImdbId(id))
    );
    return series.filter(serie => 
      serie && serie.Poster && serie.Poster !== 'N/A' && serie.Poster.includes('http')
    ) as Movie[];
  } catch (error) {
    console.error('Popüler diziler yüklenirken hata:', error);
    return [];
  }
}

// Kategori bazlı popüler içerik getirme
export async function fetchMoviesByCategory(category: string, count = 8): Promise<Movie[]> {
  try {
    const categoryMovies: { [key: string]: string[] } = {
      'action': ["tt0468569", "tt0137523", "tt0076759", "tt0080684", "tt0317248", "tt0120737", "tt0167260", "tt0167261"],
      'comedy': ["tt0109830", "tt0386676", "tt0460649", "tt0108778", "tt2467372", "tt0898266", "tt0412142", "tt0264235"],
      'drama': ["tt0111161", "tt0068646", "tt0071562", "tt0108052", "tt0050083", "tt0073486", "tt0099685", "tt0047478"],
      'horror': ["tt0081505", "tt0078748", "tt0073195", "tt0067116", "tt0090605", "tt0114746", "tt0119396", "tt0253474"],
      'sci-fi': ["tt0076759", "tt0080684", "tt1375666", "tt0133093", "tt0088763", "tt0078748", "tt0816692", "tt0482571"]
    };

    const movieIds = categoryMovies[category.toLowerCase()] || popularMovieIds.slice(0, count);
    const movies = await Promise.all(
      movieIds.slice(0, count).map(id => fetchDetailsByImdbId(id))
    );
    return movies.filter(movie => 
      movie && movie.Poster && movie.Poster !== 'N/A' && movie.Poster.includes('http')
    ) as Movie[];
  } catch (error) {
    console.error('Kategori filmleri yüklenirken hata:', error);
    return [];
  }
}