const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const REQUEST_TIMEOUT_MS = 7000;

function clean(value) {
  return String(value ?? '').trim();
}

function firstAddressPart(address, keys) {
  for (const key of keys) {
    const value = clean(address?.[key]);
    if (value) return value;
  }
  return '';
}

function buildAddressText(parts) {
  return [
    parts.street,
    parts.area,
    parts.city,
    parts.district,
    parts.state,
    parts.postcode,
  ].filter(Boolean).join(', ');
}

export async function reverseGeocodeLocation(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || typeof fetch !== 'function') {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '18',
      addressdetails: '1',
      'accept-language': 'en',
    });
    const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GoBooks attendance location lookup (OpenStreetMap Nominatim)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;
    const payload = await response.json();
    const address = payload?.address ?? {};
    const parts = {
      street: firstAddressPart(address, ['road', 'pedestrian', 'footway', 'residential', 'neighbourhood']),
      area: firstAddressPart(address, ['suburb', 'neighbourhood', 'quarter', 'hamlet', 'village', 'town']),
      city: firstAddressPart(address, ['city', 'town', 'municipality', 'village']),
      district: firstAddressPart(address, ['city_district', 'county', 'state_district']),
      state: clean(address.state),
      postcode: clean(address.postcode),
      country: clean(address.country),
    };
    const addressText = clean(payload.display_name) || buildAddressText(parts);

    return {
      ...parts,
      address: addressText,
      provider: 'OpenStreetMap Nominatim',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
