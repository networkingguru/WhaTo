export type Topic = 'food' | 'movie' | 'show';

export interface CardItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string | null;
  rating: number | null;
  details: string[];
  sourceUrl: string | null;
  meta: Record<string, unknown>;
}

export interface CardProvider {
  fetchCards(options: FetchOptions): Promise<CardItem[]>;
}

export interface FetchOptions {
  latitude?: number;
  longitude?: number;
  page?: number;
  radius?: number; // in miles
}
