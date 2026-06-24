/**
 * @file Shared types for the Electric UPI project.
 * Single source of truth — import from here, never re-declare.
 */

export interface ChargerResult {
  id: string;
  title: string;
  hostName: string;
  isSuperhost: boolean;
  rating: number;
  reviewsCount: number;
  address: string;
  city: string;
  area: string | null;
  pincode: string | null;
  state: string | null;
  pricePerKwh: number;
  chargerType: string | null;
  powerKw: number | null;
  plugType: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  amenities: string[];
  vehicleSegments: string[];
  imageUrl: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  tags: string[];
  type: string;
  category: string;
}

export interface SearchResponse {
  data: ChargerResult[];
  total: number;
  page: number;
  hasMore: boolean;
}
