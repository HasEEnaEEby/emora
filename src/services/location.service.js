// src/services/location.service.js - Updated to work with your existing structure
import geoip from 'geoip-lite';
import axios from 'axios';
import User from '../models/user.model.js';
import Mood from '../models/mood.model.js';
import Vent from '../models/vent.model.js';
import logger from '../utils/logger.js';
import cacheService from '../utils/cache.js';

class LocationService {
  
  // . ENHANCED: Your existing method with consent support
  async getLocationFromRequest(req, consentLevel = 'city_only') {
    try {
      // Get IP address
      const ip = this.getClientIP(req);
      
      // Use IP geolocation with consent level
      const location = await this.getLocationFromIP(ip, consentLevel);
      
      if (!location) {
        return this.getDefaultLocation();
      }
      
      return location;
    } catch (error) {
      logger.error('Error getting location from request:', error);
      return this.getDefaultLocation();
    }
  }

  // . Your existing method (unchanged)
  getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           req.ip ||
           '127.0.0.1';
  }

  // . ENHANCED: Your existing method with consent levels
  async getLocationFromIP(ip, consentLevel = 'city_only') {
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

      // . NEW: Create location object based on consent level
      return this.createLocationWithConsent({
        coordinates: [geo.ll[1], geo.ll[0]], // [longitude, latitude]
        city: geo.city || 'Unknown',
        region: geo.region || 'Unknown',
        country: geo.country || 'Unknown',
        continent: this.getContinent(geo.country),
        timezone: geo.timezone || 'UTC'
      }, consentLevel, 'ip_estimate');

    } catch (error) {
      logger.error('Error in IP geolocation:', error);
      return this.getDefaultLocation();
    }
  }

  // . NEW: Create location object respecting consent level
  createLocationWithConsent(addressData, consentLevel = 'city_only', source = 'gps') {
    const baseLocation = {
      hasUserConsent: consentLevel !== 'none',
      consentTimestamp: consentLevel !== 'none' ? new Date() : null,
      shareLevel: consentLevel,
      source: source,
      type: 'Point'
    };

    switch (consentLevel) {
      case 'none':
        return {
          ...baseLocation,
          hasUserConsent: false,
          shareLevel: 'none'
        };

      case 'continent':
        return {
          ...baseLocation,
          continent: addressData.continent
        };

      case 'country_only':
        return {
          ...baseLocation,
          country: addressData.country,
          continent: addressData.continent
        };

      case 'region_only':
        return {
          ...baseLocation,
          region: addressData.region,
          country: addressData.country,
          continent: addressData.continent
        };

      case 'city_only':
        return {
          ...baseLocation,
          city: addressData.city,
          region: addressData.region,
          country: addressData.country,
          continent: addressData.continent
        };

      case 'full':
        return {
          ...baseLocation,
          coordinates: addressData.coordinates,
          city: addressData.city,
          region: addressData.region,
          country: addressData.country,
          continent: addressData.continent,
          timezone: addressData.timezone
        };

      default:
        return {
          ...baseLocation,
          city: addressData.city,
          country: addressData.country,
          continent: addressData.continent
        };
    }
  }

  // . ENHANCED: Your existing method with better reverse geocoding
  async getLocationFromCoordinates(lat, lon, consentLevel = 'city_only') {
    try {
      // Try reverse geocoding with multiple providers
      let addressData = await this.reverseGeocode(lat, lon);
      
      if (!addressData) {
        // Fallback to basic structure
        addressData = {
          coordinates: [parseFloat(lon), parseFloat(lat)],
          city: 'Unknown',
          region: 'Unknown',
          country: 'Unknown',
          continent: 'Unknown',
          timezone: 'UTC'
        };
      }

      return this.createLocationWithConsent(addressData, consentLevel, 'gps');
    } catch (error) {
      logger.error('Error in reverse geocoding:', error);
      return this.getDefaultLocation();
    }
  }

  // . NEW: Enhanced reverse geocoding
  async reverseGeocode(latitude, longitude) {
    const cacheKey = `geocode:${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    
    try {
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      // Try OpenStreetMap Nominatim (free)
      try {
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/reverse`,
          {
            params: {
              lat: latitude,
              lon: longitude,
              format: 'json',
              addressdetails: 1,
              zoom: 10
            },
            headers: {
              'User-Agent': 'Emora-App/1.0'
            },
            timeout: 5000
          }
        );

        const { address } = response.data;
        const result = {
          coordinates: [longitude, latitude],
          city: address.city || address.town || address.village || address.hamlet || 'Unknown',
          region: address.state || address.province || address.region || 'Unknown',
          country: address.country || 'Unknown',
          continent: this.getContinent(address.country_code),
          timezone: this.getTimezoneFromCoordinates(latitude, longitude)
        };

        // Cache for 24 hours
        await cacheService.set(cacheKey, result, 86400);
        return result;

      } catch (error) {
        logger.warn('OpenStreetMap geocoding failed:', error);
        
        // Fallback to coordinate-based estimation
        return {
          coordinates: [longitude, latitude],
          city: 'Unknown',
          region: 'Unknown',
          country: 'Unknown',
          continent: this.estimateContinent(latitude, longitude),
          timezone: this.getTimezoneFromCoordinates(latitude, longitude)
        };
      }

    } catch (error) {
      logger.error('Reverse geocoding failed:', error);
      return null;
    }
  }

  // . NEW: Estimate continent from coordinates
  estimateContinent(latitude, longitude) {
    if (latitude > 35 && longitude > -10 && longitude < 70) {
      return 'Europe';
    } else if (latitude > 10 && longitude > 70 && longitude < 150) {
      return 'Asia';
    } else if (latitude > 25 && longitude > -130 && longitude < -60) {
      return 'North America';
    } else if (latitude < -10 && longitude > -80 && longitude < -30) {
      return 'South America';
    } else if (latitude < -10 && longitude > 110 && longitude < 180) {
      return 'Oceania';
    } else if (latitude > -40 && latitude < 40 && longitude > -20 && longitude < 55) {
      return 'Africa';
    }
    return 'Unknown';
  }

  // . NEW: Simple timezone estimation
  getTimezoneFromCoordinates(latitude, longitude) {
    const timezoneOffset = Math.round(longitude / 15);
    return timezoneOffset >= 0 ? `UTC+${timezoneOffset}` : `UTC${timezoneOffset}`;
  }

  // . ENHANCED: Your existing method (unchanged)
  getDefaultLocation() {
    return {
      hasUserConsent: false,
      shareLevel: 'none',
      type: 'Point',
      coordinates: [0, 0],
      city: 'Unknown',
      region: 'Unknown',
      country: 'Unknown',
      continent: 'Unknown',
      timezone: 'UTC'
    };
  }

  // . Your existing method (unchanged)
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

  // . Your existing method (unchanged)
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

  // . NEW: Location consent management
  async updateLocationConsent(userId, consentLevel, coordinates = null) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error('User not found');

      // Update user preferences
      user.preferences = user.preferences || {};
      user.preferences.shareLocation = consentLevel !== 'none';
      user.preferences.locationShareLevel = consentLevel;
      
      if (coordinates && consentLevel !== 'none') {
        const [longitude, latitude] = coordinates;
        const locationData = await this.getLocationFromCoordinates(
          latitude, 
          longitude, 
          consentLevel
        );
        
        user.location = {
          ...user.location,
          ...locationData
        };
      }

      await user.save();

      logger.info(`Location consent updated for user ${userId}: ${consentLevel}`);
      return {
        success: true,
        consentLevel: consentLevel,
        message: 'Location consent updated successfully'
      };

    } catch (error) {
      logger.error('Failed to update location consent:', error);
      throw error;
    }
  }

  // . NEW: Get location-based insights
  async getLocationBasedInsights(userId, coordinates, radiusKm = 50) {
    const cacheKey = `location_insights:${userId}:${coordinates?.join(',') || 'none'}:${radiusKm}`;
    
    try {
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;

      if (!coordinates || coordinates.length !== 2) {
        return this.getGeneralInsights(userId);
      }

      const [longitude, latitude] = coordinates;
      const radiusInRadians = radiusKm / 6371; // Earth's radius in km

      // Get nearby mood patterns
      const nearbyMoodStats = await Mood.aggregate([
        {
          $match: {
            'location.hasUserConsent': true,
            'location.coordinates': {
              $geoWithin: {
                $centerSphere: [[longitude, latitude], radiusInRadians]
              }
            },
            userId: { $ne: userId },
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$emotion',
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' },
            commonTriggers: { $addToSet: '$triggers' },
            successfulCoping: { $addToSet: '$coping_strategies' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      // Get local support success stories
      const localSupportSuccess = await Vent.aggregate([
        {
          $match: {
            'location.hasUserConsent': true,
            'location.coordinates': {
              $geoWithin: {
                $centerSphere: [[longitude, latitude], radiusInRadians]
              }
            },
            'analytics.supportProvided': true,
            'followUp.improvementReported': { $in: ['better', 'much_better'] }
          }
        },
        {
          $group: {
            _id: '$issueCategory',
            successCount: { $sum: 1 },
            avgHelpfulness: { $avg: '$followUp.helpfulnessRating' },
            effectiveSupport: { $addToSet: '$analytics.resourcesShared' }
          }
        },
        { $sort: { successCount: -1 } }
      ]);

      const insights = {
        nearbyMoodTrends: nearbyMoodStats,
        localSupportResources: localSupportSuccess,
        radiusKm: radiusKm,
        insights: this.generateLocationInsights(nearbyMoodStats, localSupportSuccess)
      };

      // Cache for 30 minutes
      await cacheService.set(cacheKey, insights, 1800);
      return insights;

    } catch (error) {
      logger.error('Failed to get location-based insights:', error);
      return this.getGeneralInsights(userId);
    }
  }

  // . NEW: Generate insights from location data
  generateLocationInsights(moodStats, supportStats) {
    const insights = [];

    if (moodStats.length > 0) {
      const topEmotion = moodStats[0];
      insights.push({
        type: 'community_mood',
        message: `${topEmotion._id} is the most common emotion in your area recently. You're not alone in feeling this way.`,
        data: {
          emotion: topEmotion._id,
          count: topEmotion.count,
          avgIntensity: topEmotion.avgIntensity
        }
      });

      if (topEmotion.successfulCoping && topEmotion.successfulCoping.length > 0) {
        insights.push({
          type: 'local_coping_strategies',
          message: `People in your area have found success with: ${topEmotion.successfulCoping.flat().join(', ')}`,
          data: {
            strategies: topEmotion.successfulCoping
          }
        });
      }
    }

    if (supportStats.length > 0) {
      const topSupport = supportStats[0];
      insights.push({
        type: 'local_support_success',
        message: `${topSupport._id} support has been particularly effective in your area, with ${topSupport.successCount} success stories.`,
        data: {
          category: topSupport._id,
          successRate: topSupport.avgHelpfulness,
          resources: topSupport.effectiveSupport
        }
      });
    }

    return insights;
  }

  // . NEW: General insights for users without location
  async getGeneralInsights(userId) {
    try {
      const userMoodStats = await Mood.aggregate([
        {
          $match: {
            userId: userId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: '$emotion',
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        personalMoodTrends: userMoodStats,
        insights: [{
          type: 'personal_pattern',
          message: userMoodStats.length > 0 
            ? `Your most frequent emotion this month has been ${userMoodStats[0]._id}`
            : 'Start logging your and insights'
        }]
      };

    } catch (error) {
      logger.error('Failed to get general insights:', error);
      return { insights: [] };
    }
  }

  // . NEW: Get shared location data based on privacy settings
  getSharedLocationData(locationObj, shareLevel = 'city_only') {
    if (!locationObj || !locationObj.hasUserConsent) {
      return null;
    }

    switch (shareLevel) {
      case 'none':
        return null;
      case 'continent':
        return { continent: locationObj.continent };
      case 'country_only':
        return { 
          country: locationObj.country, 
          continent: locationObj.continent 
        };
      case 'region_only':
        return {
          region: locationObj.region,
          country: locationObj.country,
          continent: locationObj.continent
        };
      case 'city_only':
        return {
          city: locationObj.city,
          region: locationObj.region,
          country: locationObj.country
        };
      case 'full':
        return locationObj;
      default:
        return {
          city: locationObj.city,
          country: locationObj.country
        };
    }
  }
}

export default new LocationService();