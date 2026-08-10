import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const API_KEY = process.env.TMDB_API_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'TMDB API key yapılandırılmamış' },
        { status: 500 }
      );
    }

    const pathSegment = params.path.join('/');
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    searchParams.set('api_key', API_KEY);

    if (!searchParams.get('language')) {
      searchParams.set('language', 'tr-TR');
    }

    const url = `${TMDB_BASE}/${pathSegment}?${searchParams.toString()}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KINO-App/1.0',
      },
      next: {
        revalidate: 120,
      },
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `TMDB upstream error: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const data = await upstream.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('[TMDB Proxy] Hata:', err);
    return NextResponse.json(
      { error: 'TMDB proxy sunucu hatası' },
      { status: 502 }
    );
  }
}
