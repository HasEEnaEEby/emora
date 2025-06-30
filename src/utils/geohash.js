// src/utils/geohash.js
/**
 * Simple geohash implementation for location-based emotion tracking
 * Used for efficient geographic queries and location clustering
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

class GeoHashService {
  /**
   * Encode latitude and longitude into geohash
   * @param {number} lat - Latitude (-90 to 90)
   * @param {number} lng - Longitude (-180 to 180)
   * @param {number} precision - Number of characters in geohash (default: 8)
   * @returns {string} Geohash string
   */
  encode(lat, lng, precision = 8) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new Error('Latitude and longitude must be numbers');
    }

    if (lat < -90 || lat > 90) {
      throw new Error('Latitude must be between -90 and 90');
    }

    if (lng < -180 || lng > 180) {
      throw new Error('Longitude must be between -180 and 180');
    }

    let latMin = -90.0;
    let latMax = 90.0;
    let lngMin = -180.0;
    let lngMax = 180.0;

    let geohash = '';
    let bits = 0;
    let bit = 0;
    let even = true;

    while (geohash.length < precision) {
      if (even) {
        // Longitude
        const mid = (lngMin + lngMax) / 2;
        if (lng >= mid) {
          bit = (bit << 1) | 1;
          lngMin = mid;
        } else {
          bit = bit << 1;
          lngMax = mid;
        }
      } else {
        // Latitude
        const mid = (latMin + latMax) / 2;
        if (lat >= mid) {
          bit = (bit << 1) | 1;
          latMin = mid;
        } else {
          bit = bit << 1;
          latMax = mid;
        }
      }

      even = !even;
      bits++;

      if (bits === 5) {
        geohash += BASE32[bit];
        bits = 0;
        bit = 0;
      }
    }

    return geohash;
  }

  /**
   * Decode geohash into latitude and longitude bounds
   * @param {string} geohash - Geohash string
   * @returns {object} Object with lat/lng bounds and center point
   */
  decode(geohash) {
    if (typeof geohash !== 'string') {
      throw new Error('Geohash must be a string');
    }

    let latMin = -90.0;
    let latMax = 90.0;
    let lngMin = -180.0;
    let lngMax = 180.0;

    let even = true;

    for (let i = 0; i < geohash.length; i++) {
      const char = geohash[i];
      const charIndex = BASE32.indexOf(char);

      if (charIndex === -1) {
        throw new Error(`Invalid geohash character: ${char}`);
      }

      for (let mask = 16; mask > 0; mask >>= 1) {
        if (even) {
          // Longitude
          const mid = (lngMin + lngMax) / 2;
          if (charIndex & mask) {
            lngMin = mid;
          } else {
            lngMax = mid;
          }
        } else {
          // Latitude
          const mid = (latMin + latMax) / 2;
          if (charIndex & mask) {
            latMin = mid;
          } else {
            latMax = mid;
          }
        }
        even = !even;
      }
    }

    return {
      bounds: {
        southwest: { lat: latMin, lng: lngMin },
        northeast: { lat: latMax, lng: lngMax }
      },
      center: {
        lat: (latMin + latMax) / 2,
        lng: (lngMin + lngMax) / 2
      },
      precision: geohash.length
    };
  }

  /**
   * Get neighboring geohashes
   * @param {string} geohash - Center geohash
   * @returns {object} Object with neighboring geohashes
   */
  neighbors(geohash) {
    if (typeof geohash !== 'string') {
      throw new Error('Geohash must be a string');
    }

    const decoded = this.decode(geohash);
    const { center } = decoded;
    const precision = geohash.length;

    // Calculate approximate step size
    const latStep = (decoded.bounds.northeast.lat - decoded.bounds.southwest.lat);
    const lngStep = (decoded.bounds.northeast.lng - decoded.bounds.southwest.lng);

    return {
      north: this.encode(center.lat + latStep, center.lng, precision),
      south: this.encode(center.lat - latStep, center.lng, precision),
      east: this.encode(center.lat, center.lng + lngStep, precision),
      west: this.encode(center.lat, center.lng - lngStep, precision),
      northeast: this.encode(center.lat + latStep, center.lng + lngStep, precision),
      northwest: this.encode(center.lat + latStep, center.lng - lngStep, precision),
      southeast: this.encode(center.lat - latStep, center.lng + lngStep, precision),
      southwest: this.encode(center.lat - latStep, center.lng - lngStep, precision)
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - First point latitude
   * @param {number} lng1 - First point longitude
   * @param {number} lat2 - Second point latitude
   * @param {number} lng2 - Second point longitude
   * @returns {number} Distance in kilometers
   */
  distance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} Radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get geohashes within a bounding box
   * @param {object} bounds - Bounding box with southwest and northeast points
   * @param {number} precision - Geohash precision
   * @returns {array} Array of geohashes covering the bounding box
   */
  boundingBoxHashes(bounds, precision = 6) {
    const { southwest, northeast } = bounds;
    
    if (!southwest || !northeast) {
      throw new Error('Bounding box must have southwest and northeast points');
    }

    const hashes = new Set();
    
    // Calculate step size based on precision
    const stepSize = this.getStepSize(precision);
    
    // Generate grid of points
    for (let lat = southwest.lat; lat <= northeast.lat; lat += stepSize.lat) {
      for (let lng = southwest.lng; lng <= northeast.lng; lng += stepSize.lng) {
        const hash = this.encode(lat, lng, precision);
        hashes.add(hash);
      }
    }
    
    return Array.from(hashes);
  }

  /**
   * Get approximate step size for given precision
   * @param {number} precision - Geohash precision
   * @returns {object} Step size for lat/lng
   */
  getStepSize(precision) {
    // Approximate step sizes (degrees) for different precisions
    const stepSizes = {
      1: { lat: 45, lng: 45 },
      2: { lat: 11.25, lng: 5.625 },
      3: { lat: 1.4, lng: 2.8 },
      4: { lat: 0.35, lng: 0.35 },
      5: { lat: 0.044, lng: 0.088 },
      6: { lat: 0.011, lng: 0.011 },
      7: { lat: 0.0014, lng: 0.0027 },
      8: { lat: 0.00034, lng: 0.00034 }
    };

    return stepSizes[precision] || stepSizes[6];
  }

  /**
   * Validate coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {boolean} True if valid
   */
  isValidCoordinate(lat, lng) {
    return typeof lat === 'number' && 
           typeof lng === 'number' && 
           lat >= -90 && lat <= 90 && 
           lng >= -180 && lng <= 180;
  }

  /**
   * Get timezone estimation from coordinates (basic implementation)
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {string} Estimated timezone
   */
  estimateTimezone(lat, lng) {
    if (!this.isValidCoordinate(lat, lng)) {
      return 'UTC';
    }

    // Very basic timezone estimation based on longitude
    // In a real implementation, you'd use a proper timezone service
    const offsetHours = Math.round(lng / 15);
    
    if (offsetHours === 0) return 'UTC';
    if (offsetHours > 0) return `UTC+${offsetHours}`;
    return `UTC${offsetHours}`;
  }
}

// Create singleton instance
const geoService = new GeoHashService();

export default geoService;