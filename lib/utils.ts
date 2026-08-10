import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// TV izleme sayfası URL yardımcıları
export function buildTVWatchUrl(tvId: string | number, season: number, episode: number) {
  const id = typeof tvId === 'string' ? tvId : String(tvId);
  return `/tv/${id}/watch?season=${season}&episode=${episode}`;
}

export function buildTVDetailEpisodesAnchor(tvId: string | number) {
  const id = typeof tvId === 'string' ? tvId : String(tvId);
  return `/tv/${id}#episodes`;
}
