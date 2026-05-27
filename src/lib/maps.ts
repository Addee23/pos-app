const NOMINATIM_USER_AGENT = "LIA2-POS-Pickup-Email/1.0";
const DEFAULT_TEST_COORDINATES: GeoCoordinates = {
  lat: 59.3354,
  lon: 18.0617,
};

export type GeoCoordinates = {
  lat: number;
  lon: number;
};

export function buildGoogleMapsUrl(address: string): string {
  const query = address.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function buildGoogleMapsUrlFromCoords(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

/** Kartbild från Google Static Maps (kräver API-nyckel i .env). */
export function getGoogleStaticMapImageUrl(
  address: string,
  apiKey?: string | null,
): string | null {
  const query = address.trim();
  const key = apiKey?.trim();
  if (!query || !key) {
    return null;
  }

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", query);
  url.searchParams.set("zoom", "16");
  url.searchParams.set("size", "560x220");
  url.searchParams.set("scale", "2");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("markers", `color:0x1a4d5c|${query}`);
  url.searchParams.set("key", key);

  return url.toString();
}

export function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom);
}

export function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom,
  );
}

/** Fungerande kartförhandsbild (OpenStreetMap-ruta). */
export function getOsmTileImageUrl(lat: number, lon: number, zoom = 15): string {
  const x = lonToTileX(lon, zoom);
  const y = latToTileY(lat, zoom);
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
}

/** En hel kartbild med markör. Den används i mail när Google Static Maps saknar API-nyckel. */
export function getOsmStaticMapImageUrl(lat: number, lon: number, zoom = 15): string {
  const url = new URL("https://staticmap.openstreetmap.de/staticmap.php");
  url.searchParams.set("center", `${lat},${lon}`);
  url.searchParams.set("zoom", String(zoom));
  url.searchParams.set("size", "560x220");
  url.searchParams.set("markers", `${lat},${lon},red-pushpin`);
  return url.toString();
}

type NominatimResult = {
  lat: string;
  lon: string;
};

export async function geocodeAddress(
  address: string,
): Promise<GeoCoordinates | null> {
  const query = address.trim();
  if (!query) {
    return null;
  }

  try {
    const searchUrl = new URL("https://nominatim.openstreetmap.org/search");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("limit", "1");

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": NOMINATIM_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const results = (await response.json()) as NominatimResult[];
    const hit = results[0];
    if (!hit) {
      return null;
    }

    return {
      lat: Number(hit.lat),
      lon: Number(hit.lon),
    };
  } catch {
    return null;
  }
}

/** Extern URL för kartförhandsbild (e-post använder hellre inbäddad CID-bild). */
export async function getStaticMapImageUrlForAddress(
  address: string,
): Promise<string | null> {
  const googleUrl = getGoogleStaticMapImageUrl(
    address,
    process.env.GOOGLE_MAPS_API_KEY,
  );
  if (googleUrl) {
    return googleUrl;
  }

  const coords = knownCoordinatesForAddress(address) ?? (await geocodeAddress(address));
  if (!coords) {
    return null;
  }

  return getOsmTileImageUrl(coords.lat, coords.lon, 15);
}

export async function getPickupMapImageUrl(
  address: string,
): Promise<string | null> {
  return getStaticMapImageUrlForAddress(address);
}

function knownCoordinatesForAddress(address: string): GeoCoordinates | null {
  const normalized = address
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized.includes("drottninggatan 71") &&
    normalized.includes("stockholm")
  ) {
    return DEFAULT_TEST_COORDINATES;
  }

  return null;
}
