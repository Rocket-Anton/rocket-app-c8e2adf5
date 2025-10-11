// Address normalization utilities

export interface NormalizedAddress {
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  locality?: string;
  weCount: number;
  etage?: string;
  lage?: string;
  notizAdresse?: string;
  notizWE?: string;
  status: string;
  normalizedKey: string; // For duplicate detection
}

/**
 * Normalize street names to handle different abbreviations and spellings
 */
export function normalizeStreet(street: string): string {
  if (!street) return '';
  
  let normalized = street.trim();
  
  // Convert to lowercase for comparison
  const lower = normalized.toLowerCase();
  
  // Expand common abbreviations
  const abbreviations: Record<string, string> = {
    'str.': 'strasse',
    'str ': 'strasse ',
    'straße': 'strasse',
    'stra?e': 'strasse', // OCR error
    'st.': 'strasse',
    'gasse': 'gasse',
    'weg': 'weg',
    'platz': 'platz',
    'allee': 'allee',
    'ring': 'ring',
    'ufer': 'ufer',
    'damm': 'damm',
  };
  
  // Replace abbreviations
  for (const [abbr, full] of Object.entries(abbreviations)) {
    if (lower.includes(abbr)) {
      normalized = normalized.replace(new RegExp(abbr, 'gi'), full);
      break;
    }
  }
  
  // Normalize umlauts
  normalized = normalizeUmlauts(normalized);
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Normalize umlauts and special characters
 */
export function normalizeUmlauts(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/Ä/g, 'ae')
    .replace(/Ö/g, 'oe')
    .replace(/Ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .toLowerCase();
}

/**
 * Normalize house number to handle different formats
 */
export function normalizeHouseNumber(houseNumber: string): string {
  if (!houseNumber) return '';
  
  // Trim and normalize whitespace
  let normalized = houseNumber.trim().replace(/\s+/g, '');
  
  // Convert to lowercase for consistent comparison
  normalized = normalized.toLowerCase();
  
  // Handle common variations: "1a", "1 a", "1-a" -> "1a"
  normalized = normalized.replace(/[\s\-_]/g, '');
  
  return normalized;
}

/**
 * Create a normalized key for duplicate detection
 * Format: "{normalizedStreet}_{normalizedHouseNumber}_{postalCode}_{city}"
 */
export function createNormalizedKey(
  street: string,
  houseNumber: string,
  postalCode: string,
  city: string
): string {
  const normStreet = normalizeStreet(street);
  const normHouseNumber = normalizeHouseNumber(houseNumber);
  const normPostalCode = postalCode.trim();
  const normCity = normalizeUmlauts(city.trim());
  
  return `${normStreet}_${normHouseNumber}_${normPostalCode}_${normCity}`;
}

/**
 * Consolidate duplicate addresses and sum up WE counts
 * Returns deduplicated addresses with correct WE counts
 */
export function consolidateAddresses(
  addresses: NormalizedAddress[]
): NormalizedAddress[] {
  const addressMap = new Map<string, NormalizedAddress>();
  
  for (const addr of addresses) {
    const key = addr.normalizedKey;
    
    if (addressMap.has(key)) {
      // Duplicate found - add WE count
      const existing = addressMap.get(key)!;
      existing.weCount += addr.weCount;
    } else {
      // New address
      addressMap.set(key, { ...addr });
    }
  }
  
  return Array.from(addressMap.values());
}

/**
 * Validate address and return validation errors
 */
export interface ValidationError {
  field: string;
  message: string;
  suggestion?: string;
}

export function validateAddress(
  address: NormalizedAddress,
  allAddresses: NormalizedAddress[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // Required fields
  if (!address.street || address.street.trim().length === 0) {
    errors.push({
      field: 'street',
      message: 'Straße fehlt',
    });
  }
  
  if (!address.houseNumber || address.houseNumber.trim().length === 0) {
    errors.push({
      field: 'houseNumber',
      message: 'Hausnummer fehlt',
    });
  }
  
  if (!address.postalCode || address.postalCode.trim().length === 0) {
    errors.push({
      field: 'postalCode',
      message: 'Postleitzahl fehlt',
      suggestion: suggestPostalCode(address, allAddresses),
    });
  }
  
  if (!address.city || address.city.trim().length === 0) {
    errors.push({
      field: 'city',
      message: 'Ort fehlt',
      suggestion: suggestCity(address, allAddresses),
    });
  }
  
  // Validate PLZ format (5 digits)
  if (address.postalCode && !/^\d{5}$/.test(address.postalCode.trim())) {
    errors.push({
      field: 'postalCode',
      message: 'Postleitzahl muss 5-stellig sein',
    });
  }
  
  return errors;
}

/**
 * Suggest postal code based on street and city from other valid addresses
 */
function suggestPostalCode(
  address: NormalizedAddress,
  allAddresses: NormalizedAddress[]
): string | undefined {
  if (!address.street || !address.city) return undefined;
  
  const normStreet = normalizeStreet(address.street);
  const normCity = normalizeUmlauts(address.city);
  
  // Find addresses with same street and city but with valid PLZ
  const matches = allAddresses.filter(a => 
    a.postalCode && 
    /^\d{5}$/.test(a.postalCode) &&
    normalizeStreet(a.street) === normStreet &&
    normalizeUmlauts(a.city) === normCity
  );
  
  if (matches.length > 0) {
    // Return the most common PLZ
    const plzCounts = new Map<string, number>();
    for (const match of matches) {
      const count = plzCounts.get(match.postalCode) || 0;
      plzCounts.set(match.postalCode, count + 1);
    }
    
    let maxCount = 0;
    let mostCommonPlz = '';
    for (const [plz, count] of plzCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonPlz = plz;
      }
    }
    
    return mostCommonPlz;
  }
  
  return undefined;
}

/**
 * Suggest city based on street and postal code from other valid addresses
 */
function suggestCity(
  address: NormalizedAddress,
  allAddresses: NormalizedAddress[]
): string | undefined {
  if (!address.street || !address.postalCode) return undefined;
  
  const normStreet = normalizeStreet(address.street);
  const postalCode = address.postalCode.trim();
  
  // Find addresses with same street and PLZ but with valid city
  const matches = allAddresses.filter(a => 
    a.city && 
    a.city.trim().length > 0 &&
    normalizeStreet(a.street) === normStreet &&
    a.postalCode === postalCode
  );
  
  if (matches.length > 0) {
    // Return the most common city
    const cityCounts = new Map<string, number>();
    for (const match of matches) {
      const count = cityCounts.get(match.city) || 0;
      cityCounts.set(match.city, count + 1);
    }
    
    let maxCount = 0;
    let mostCommonCity = '';
    for (const [city, count] of cityCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonCity = city;
      }
    }
    
    return mostCommonCity;
  }
  
  return undefined;
}
