export interface RouteResult {
  durationText: string; // e.g., "15 mins"
  distanceText: string; // e.g., "4 miles"
  googleMapsUrl: string;
}

// Regex for UK Postcodes (Standard formats)
const UK_POSTCODE_REGEX = /([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/i;

// Helper to cleanup address for geocoding
// Priority: 1. Extracted Postcode 2. Cleaned Address
const cleanAddressForGeocode = (addr: string): string => {
  if (!addr || addr === 'TBD') return '';

  // Try to find a postcode first
  const postcodeMatch = addr.match(UK_POSTCODE_REGEX);
  if (postcodeMatch && postcodeMatch[0]) {
    return postcodeMatch[0].toUpperCase();
  }

  // Fallback: Remove newlines and extra spaces
  return addr.replace(/\n/g, ', ').replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
};

const cleanAddressForUrl = (addr: string): string => {
    if (!addr) return '';
    return addr.replace(/\n/g, ', ').replace(/\s+/g, ' ').trim();
}

export const getGoogleMapsUrl = (origin: string, destination: string) => {
  const o = encodeURIComponent(cleanAddressForUrl(origin));
  const d = encodeURIComponent(cleanAddressForUrl(destination));
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}`;
};

async function geocode(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const query = encodeURIComponent(cleanAddressForGeocode(address));
    
    // Skip empty queries
    if (!query || query.length < 3) return null;

    // Using Nominatim (OpenStreetMap) - Requires User-Agent
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
      headers: { 'User-Agent': 'FieldServiceAssistant/1.0' }
    });
    
    if (!response.ok) return null;

    const data = await response.json();
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch (e) {
    console.warn('Geocoding failed for:', address, e);
    return null;
  }
}

export async function estimateTravelTime(origin: string, destination: string): Promise<RouteResult | null> {
  const googleMapsUrl = getGoogleMapsUrl(origin, destination);
  
  if (!origin || !destination) return null;

  try {
    // 1. Geocode both addresses
    const [start, end] = await Promise.all([geocode(origin), geocode(destination)]);
    
    if (!start || !end) {
      // Return null to trigger fallback UI
      return null; 
    }

    // 2. Get Route from OSRM
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`
    );
    
    if (!response.ok) return null;

    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const seconds = data.routes[0].duration;
      const meters = data.routes[0].distance;
      
      const mins = Math.round(seconds / 60);
      const miles = (meters * 0.000621371).toFixed(1);

      return {
        durationText: `${mins} mins`,
        distanceText: `${miles} mi`,
        googleMapsUrl
      };
    }
  } catch (error) {
    console.error("Routing failed", error);
  }

  return null;
}

export const getCurrentPosition = (): Promise<{ lat: number; lon: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err)
    );
  });
};

export const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'FieldServiceAssistant/1.0' } }
    );
    if (!response.ok) throw new Error('Reverse geocoding failed');
    const data = await response.json();
    // Construct a readable address
    const addr = data.address;
    // Prioritize specific fields
    const parts = [
       addr.road || addr.pedestrian,
       addr.house_number,
       addr.city || addr.town || addr.village,
       addr.postcode
    ].filter(Boolean);
    
    return parts.join(', ') || data.display_name;
  } catch (e) {
    console.error(e);
    return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  }
};
