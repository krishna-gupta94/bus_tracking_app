// MapTiler Geocoding, Reverse Geocoding, & Tile Service
// Designed for high-accuracy village, town, landmark, street, and address search

export const MAPTILER_API_KEY =
  process.env.NEXT_PUBLIC_MAPTILER_API_KEY || 'bpSZcLTiwDllGaecH4T9';

export interface GeocodeResult {
  id: string;
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  type: string;
  address?: {
    village?: string;
    hamlet?: string;
    town?: string;
    city?: string;
    suburb?: string;
    road?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

/**
 * Search locations using MapTiler Geocoding API (with Photon fallback)
 */
export async function searchLocations(query: string): Promise<GeocodeResult[]> {
  if (!query || query.trim().length < 2) return [];

  const trimmed = query.trim();

  // 1. Try MapTiler Geocoding API first
  try {
    const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(
      trimmed
    )}.json?key=${MAPTILER_API_KEY}&country=in&limit=8&autocomplete=true`;
    const response = await fetch(url);

    if (response.ok) {
      const json = await response.json();
      const features = json.features || [];

      if (features.length > 0) {
        return features.map((f: any, idx: number) => {
          const coords = f.center || f.geometry?.coordinates || [0, 0];
          const text = f.text || f.place_name?.split(',')[0] || 'Location';
          const placeName = f.place_name || text;

          return {
            id: `maptiler-${f.id || idx}-${coords[1]}-${coords[0]}`,
            name: text,
            fullName: placeName,
            lat: coords[1],
            lng: coords[0],
            type: f.place_type?.[0] || 'place',
            address: {
              city: f.context?.find((c: any) => c.id?.startsWith('place'))?.text,
              state: f.context?.find((c: any) => c.id?.startsWith('region'))?.text,
              postcode: f.context?.find((c: any) => c.id?.startsWith('postal_code'))?.text,
              country: f.context?.find((c: any) => c.id?.startsWith('country'))?.text || 'India',
            },
          };
        });
      }
    }
  } catch (err) {
    console.warn('MapTiler geocoding search error, falling back to Photon:', err);
  }

  // 2. Fallback to Photon
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=8&lang=en`;
    const response = await fetch(url);

    if (response.ok) {
      const json = await response.json();
      const features = json.features || [];

      if (features.length > 0) {
        return features.map((f: any, idx: number) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates || [0, 0];
          const name = props.name || props.street || props.city || 'Location';
          const parts = [
            props.name,
            props.street,
            props.district || props.county,
            props.city,
            props.state,
            props.country,
          ].filter(Boolean);

          return {
            id: `photon-${idx}-${coords[1]}-${coords[0]}`,
            name: name,
            fullName: parts.join(', ') || name,
            lat: coords[1],
            lng: coords[0],
            type: props.type || props.osm_value || 'village/place',
            address: {
              village: props.type === 'village' || props.osm_value === 'village' ? props.name : undefined,
              town: props.city,
              city: props.city,
              state: props.state,
              postcode: props.postcode,
              country: props.country,
            },
          };
        });
      }
    }
  } catch (err) {
    console.warn('Photon search error:', err);
  }

  return [];
}

/**
 * Reverse geocode coordinates using MapTiler Geocoding API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  name: string;
  address: string;
} | null> {
  // 1. Try MapTiler Reverse Geocoding
  try {
    const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_API_KEY}&limit=1`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      const first = data.features?.[0];
      if (first) {
        return {
          name: first.text || first.place_name?.split(',')[0] || '',
          address: first.place_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        };
      }
    }
  } catch (err) {
    console.warn('MapTiler reverse geocode failed, trying fallback:', err);
  }

  // 2. Fallback to Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SmartBus-College-Transit-App/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const primaryName =
        addr.village ||
        addr.hamlet ||
        addr.town ||
        addr.city ||
        addr.suburb ||
        addr.road ||
        addr.amenity ||
        data.name ||
        '';

      return {
        name: primaryName,
        address: data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      };
    }
  } catch (err) {
    console.warn('Nominatim reverse geocode failed:', err);
  }

  return {
    name: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
  };
}

/**
 * Official MapTiler Tile Providers
 */
export interface MapTileProvider {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string[];
}

export const MAP_PROVIDERS: Record<string, MapTileProvider> = {
  maptiler_streets: {
    id: 'maptiler_streets',
    name: 'MapTiler Streets v2',
    url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  maptiler_dark: {
    id: 'maptiler_dark',
    name: 'MapTiler Dark Transit',
    url: `https://api.maptiler.com/maps/dataviz-dark/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  maptiler_hybrid: {
    id: 'maptiler_hybrid',
    name: 'MapTiler Satellite Hybrid',
    url: `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${MAPTILER_API_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  maptiler_outdoor: {
    id: 'maptiler_outdoor',
    name: 'MapTiler Topo / Outdoor',
    url: `https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
  maptiler_basic: {
    id: 'maptiler_basic',
    name: 'MapTiler Basic',
    url: `https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}`,
    attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 20,
  },
};
