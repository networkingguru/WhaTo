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
  // Food filters
  openNow?: boolean;
  categories?: string[]; // yelp category aliases
  sortBy?: 'best_match' | 'distance' | 'rating';
  // Movie/Show filters
  genreIds?: number[];
  sortTmdb?: 'popularity' | 'rating';
}

// Yelp restaurant categories commonly available
export const FOOD_CATEGORIES: { alias: string; title: string }[] = [
  { alias: 'chinese', title: 'Chinese' },
  { alias: 'japanese', title: 'Japanese' },
  { alias: 'korean', title: 'Korean' },
  { alias: 'thai', title: 'Thai' },
  { alias: 'vietnamese', title: 'Vietnamese' },
  { alias: 'indian', title: 'Indian' },
  { alias: 'mexican', title: 'Mexican' },
  { alias: 'italian', title: 'Italian' },
  { alias: 'pizza', title: 'Pizza' },
  { alias: 'burgers', title: 'Burgers' },
  { alias: 'steak', title: 'Steak' },
  { alias: 'seafood', title: 'Seafood' },
  { alias: 'sushi', title: 'Sushi' },
  { alias: 'mediterranean', title: 'Mediterranean' },
  { alias: 'american', title: 'American' },
  { alias: 'bbq', title: 'BBQ' },
  { alias: 'sandwiches', title: 'Sandwiches' },
  { alias: 'breakfast_brunch', title: 'Breakfast & Brunch' },
  { alias: 'cafes', title: 'Cafes' },
  { alias: 'vegan', title: 'Vegan' },
];

export const MOVIE_GENRES: { id: number; name: string }[] = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 14, name: 'Fantasy' },
  { id: 27, name: 'Horror' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Sci-Fi' },
  { id: 53, name: 'Thriller' },
];

export const SHOW_GENRES: { id: number; name: string }[] = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10764, name: 'Reality' },
  { id: 9648, name: 'Mystery' },
  { id: 10766, name: 'Soap' },
];
