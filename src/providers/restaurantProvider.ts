import { CardItem, CardProvider, FetchOptions } from './types';

// --- Yelp ---

interface YelpBusiness {
  id: string;
  name: string;
  image_url: string;
  rating: number;
  categories: { alias: string; title: string }[];
  price?: string;
  location: { display_address: string[] };
  url: string;
}

function mapYelpBusiness(biz: YelpBusiness): CardItem {
  const cuisine = biz.categories.map((c) => c.title).join(', ');
  const address = biz.location.display_address.join(', ');
  return {
    id: biz.id,
    title: biz.name,
    subtitle: cuisine,
    imageUrl: biz.image_url || null,
    rating: biz.rating,
    details: [cuisine, biz.price ?? '', address].filter(Boolean),
    sourceUrl: biz.url,
    meta: { source: 'yelp' },
  };
}

async function fetchFromYelp(
  latitude: number,
  longitude: number
): Promise<CardItem[] | null> {
  const apiKey = process.env.EXPO_PUBLIC_YELP_API_KEY;
  try {
    const response = await fetch(
      `https://api.yelp.com/v3/businesses/search?latitude=${latitude}&longitude=${longitude}&categories=restaurants&limit=20&sort_by=best_match`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return (data.businesses as YelpBusiness[]).map(mapYelpBusiness);
  } catch {
    return null;
  }
}

// --- Google Places ---

interface GooglePlace {
  place_id: string;
  name: string;
  photos?: { photo_reference: string }[];
  rating?: number;
  types: string[];
  price_level?: number;
  vicinity: string;
}

const PRICE_MAP: Record<number, string> = { 0: '', 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

function mapGooglePlace(place: GooglePlace): CardItem {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  const photoRef = place.photos?.[0]?.photo_reference;
  const imageUrl = photoRef
    ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoRef}&key=${apiKey}`
    : null;

  return {
    id: place.place_id,
    title: place.name,
    subtitle: place.types.filter((t) => t !== 'restaurant' && t !== 'point_of_interest' && t !== 'establishment').join(', ') || 'Restaurant',
    imageUrl,
    rating: place.rating ?? null,
    details: [
      PRICE_MAP[place.price_level ?? 0],
      place.vicinity,
    ].filter(Boolean),
    sourceUrl: null,
    meta: { source: 'google', placeId: place.place_id },
  };
}

async function fetchFromGoogle(
  latitude: number,
  longitude: number
): Promise<CardItem[] | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=restaurant&key=${apiKey}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return (data.results as GooglePlace[]).map(mapGooglePlace);
  } catch {
    return null;
  }
}

// --- Provider ---

export const restaurantProvider: CardProvider = {
  async fetchCards(options: FetchOptions): Promise<CardItem[]> {
    const { latitude, longitude } = options;
    if (latitude == null || longitude == null) return [];

    const yelpResult = await fetchFromYelp(latitude, longitude);
    if (yelpResult !== null) return yelpResult;

    const googleResult = await fetchFromGoogle(latitude, longitude);
    if (googleResult !== null) return googleResult;

    return [];
  },
};
