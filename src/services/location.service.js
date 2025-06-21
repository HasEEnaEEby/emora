import geoip from 'geoip-lite';
import logger from '../utils/logger.js';

class LocationService {
  async getLocationFromRequest(req) {
    try {
      // Get IP address
      const ip = this.getClientIP(req);
      
      // Use IP geolocation
      const location = await this.getLocationFromIP(ip);
      
      if (!location) {
        // Fallback to default location
        return this.getDefaultLocation();
      }
      
      return location;
    } catch (error) {
      logger.error('Error getting location from request:', error);
      return this.getDefaultLocation();
    }
  }

  getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.ip ||
           '127.0.0.1';
  }

  async getLocationFromIP(ip) {
    try {
      // Handle localhost/development
      if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) {
        return this.getDefaultLocation();
      }

      // Use geoip-lite for basic location
      const geo = geoip.lookup(ip);
      
      if (!geo) {
        return this.getDefaultLocation();
      }

      return {
        type: 'Point',
        coordinates: [geo.ll[1], geo.ll[0]], // [longitude, latitude]
        city: geo.city || 'Unknown',
        region: geo.region || 'Unknown',
        country: geo.country || 'Unknown',
        continent: this.getContinent(geo.country),
        timezone: geo.timezone || 'UTC'
      };
    } catch (error) {
      logger.error('Error in IP geolocation:', error);
      return this.getDefaultLocation();
    }
  }

  async getLocationFromCoordinates(lat, lon) {
    try {
      // For production, you might want to use a reverse geocoding service
      // like Google Maps API, OpenStreetMap Nominatim, etc.
      
      // For now, return a basic structure
      return {
        type: 'Point',
        coordinates: [parseFloat(lon), parseFloat(lat)],
        city: 'Unknown',
        region: 'Unknown',
        country: 'Unknown',
        continent: 'Unknown',
        timezone: 'UTC'
      };
    } catch (error) {
      logger.error('Error in reverse geocoding:', error);
      return this.getDefaultLocation();
    }
  }

  getDefaultLocation() {
    // Default to a neutral location (you can customize this)
    return {
      type: 'Point',
      coordinates: [0, 0], // [longitude, latitude]
      city: 'Unknown',
      region: 'Unknown',
      country: 'Unknown',
      continent: 'Unknown',
      timezone: 'UTC'
    };
  }

  getContinent(countryCode) {
    const continents = {
      'AD': 'Europe', 'AE': 'Asia', 'AF': 'Asia', 'AG': 'North America',
      'AI': 'North America', 'AL': 'Europe', 'AM': 'Asia', 'AO': 'Africa',
      'AQ': 'Antarctica', 'AR': 'South America', 'AS': 'Oceania', 'AT': 'Europe',
      'AU': 'Oceania', 'AW': 'North America', 'AX': 'Europe', 'AZ': 'Asia',
      'BA': 'Europe', 'BB': 'North America', 'BD': 'Asia', 'BE': 'Europe',
      'BF': 'Africa', 'BG': 'Europe', 'BH': 'Asia', 'BI': 'Africa',
      'BJ': 'Africa', 'BL': 'North America', 'BM': 'North America', 'BN': 'Asia',
      'BO': 'South America', 'BQ': 'North America', 'BR': 'South America', 'BS': 'North America',
      'BT': 'Asia', 'BV': 'Antarctica', 'BW': 'Africa', 'BY': 'Europe',
      'BZ': 'North America', 'CA': 'North America', 'CC': 'Asia', 'CD': 'Africa',
      'CF': 'Africa', 'CG': 'Africa', 'CH': 'Europe', 'CI': 'Africa',
      'CK': 'Oceania', 'CL': 'South America', 'CM': 'Africa', 'CN': 'Asia',
      'CO': 'South America', 'CR': 'North America', 'CU': 'North America', 'CV': 'Africa',
      'CW': 'North America', 'CX': 'Asia', 'CY': 'Europe', 'CZ': 'Europe',
      'DE': 'Europe', 'DJ': 'Africa', 'DK': 'Europe', 'DM': 'North America',
      'DO': 'North America', 'DZ': 'Africa', 'EC': 'South America', 'EE': 'Europe',
      'EG': 'Africa', 'EH': 'Africa', 'ER': 'Africa', 'ES': 'Europe',
      'ET': 'Africa', 'FI': 'Europe', 'FJ': 'Oceania', 'FK': 'South America',
      'FM': 'Oceania', 'FO': 'Europe', 'FR': 'Europe', 'GA': 'Africa',
      'GB': 'Europe', 'GD': 'North America', 'GE': 'Asia', 'GF': 'South America',
      'GG': 'Europe', 'GH': 'Africa', 'GI': 'Europe', 'GL': 'North America',
      'GM': 'Africa', 'GN': 'Africa', 'GP': 'North America', 'GQ': 'Africa',
      'GR': 'Europe', 'GS': 'Antarctica', 'GT': 'North America', 'GU': 'Oceania',
      'GW': 'Africa', 'GY': 'South America', 'HK': 'Asia', 'HM': 'Antarctica',
      'HN': 'North America', 'HR': 'Europe', 'HT': 'North America', 'HU': 'Europe',
      'ID': 'Asia', 'IE': 'Europe', 'IL': 'Asia', 'IM': 'Europe',
      'IN': 'Asia', 'IO': 'Asia', 'IQ': 'Asia', 'IR': 'Asia',
      'IS': 'Europe', 'IT': 'Europe', 'JE': 'Europe', 'JM': 'North America',
      'JO': 'Asia', 'JP': 'Asia', 'KE': 'Africa', 'KG': 'Asia',
      'KH': 'Asia', 'KI': 'Oceania', 'KM': 'Africa', 'KN': 'North America',
      'KP': 'Asia', 'KR': 'Asia', 'KW': 'Asia', 'KY': 'North America',
      'KZ': 'Asia', 'LA': 'Asia', 'LB': 'Asia', 'LC': 'North America',
      'LI': 'Europe', 'LK': 'Asia', 'LR': 'Africa', 'LS': 'Africa',
      'LT': 'Europe', 'LU': 'Europe', 'LV': 'Europe', 'LY': 'Africa',
      'MA': 'Africa', 'MC': 'Europe', 'MD': 'Europe', 'ME': 'Europe',
      'MF': 'North America', 'MG': 'Africa', 'MH': 'Oceania', 'MK': 'Europe',
      'ML': 'Africa', 'MM': 'Asia', 'MN': 'Asia', 'MO': 'Asia',
      'MP': 'Oceania', 'MQ': 'North America', 'MR': 'Africa', 'MS': 'North America',
      'MT': 'Europe', 'MU': 'Africa', 'MV': 'Asia', 'MW': 'Africa',
      'MX': 'North America', 'MY': 'Asia', 'MZ': 'Africa', 'NA': 'Africa',
      'NC': 'Oceania', 'NE': 'Africa', 'NF': 'Oceania', 'NG': 'Africa',
      'NI': 'North America', 'NL': 'Europe', 'NO': 'Europe', 'NP': 'Asia',
      'NR': 'Oceania', 'NU': 'Oceania', 'NZ': 'Oceania', 'OM': 'Asia',
      'PA': 'North America', 'PE': 'South America', 'PF': 'Oceania', 'PG': 'Oceania',
      'PH': 'Asia', 'PK': 'Asia', 'PL': 'Europe', 'PM': 'North America',
      'PN': 'Oceania', 'PR': 'North America', 'PS': 'Asia', 'PT': 'Europe',
      'PW': 'Oceania', 'PY': 'South America', 'QA': 'Asia', 'RE': 'Africa',
      'RO': 'Europe', 'RS': 'Europe', 'RU': 'Europe', 'RW': 'Africa',
      'SA': 'Asia', 'SB': 'Oceania', 'SC': 'Africa', 'SD': 'Africa',
      'SE': 'Europe', 'SG': 'Asia', 'SH': 'Africa', 'SI': 'Europe',
      'SJ': 'Europe', 'SK': 'Europe', 'SL': 'Africa', 'SM': 'Europe',
      'SN': 'Africa', 'SO': 'Africa', 'SR': 'South America', 'SS': 'Africa',
      'ST': 'Africa', 'SV': 'North America', 'SX': 'North America', 'SY': 'Asia',
      'SZ': 'Africa', 'TC': 'North America', 'TD': 'Africa', 'TF': 'Antarctica',
      'TG': 'Africa', 'TH': 'Asia', 'TJ': 'Asia', 'TK': 'Oceania',
      'TL': 'Asia', 'TM': 'Asia', 'TN': 'Africa', 'TO': 'Oceania',
      'TR': 'Asia', 'TT': 'North America', 'TV': 'Oceania', 'TW': 'Asia',
      'TZ': 'Africa', 'UA': 'Europe', 'UG': 'Africa', 'UM': 'Oceania',
      'US': 'North America', 'UY': 'South America', 'UZ': 'Asia', 'VA': 'Europe',
      'VC': 'North America', 'VE': 'South America', 'VG': 'North America', 'VI': 'North America',
      'VN': 'Asia', 'VU': 'Oceania', 'WF': 'Oceania', 'WS': 'Oceania',
      'YE': 'Asia', 'YT': 'Africa', 'ZA': 'Africa', 'ZM': 'Africa', 'ZW': 'Africa'
    };

    return continents[countryCode] || 'Unknown';
  }

  validateLocation(location) {
    if (!location || !location.coordinates) return false;
    
    const [lon, lat] = location.coordinates;
    
    return (
      typeof lon === 'number' && 
      typeof lat === 'number' &&
      lon >= -180 && lon <= 180 &&
      lat >= -90 && lat <= 90
    );
  }
}

export default new LocationService();
