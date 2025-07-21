import locationService from '../services/location.service.js';
import logger from '../utils/logger.js';

class LocationController {

  // . Update location consent and process location
  async updateLocationConsent(req, res) {
    try {
      const userId = req.user.id;
      const { 
        consentLevel, 
        coordinates, 
        accuracy,
        source = 'gps'
      } = req.body;

      // Validate consent level
      const validConsentLevels = ['none', 'continent', 'country_only', 'region_only', 'city_only', 'full'];
      if (!validConsentLevels.includes(consentLevel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid consent level'
        });
      }

      // Validate coordinates if provided
      if (coordinates && (!Array.isArray(coordinates) || coordinates.length !== 2)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates format. Expected [longitude, latitude]'
        });
      }

      // Update location consent
      const result = await locationService.updateLocationConsent(
        userId, 
        consentLevel, 
        coordinates
      );

      // Get location-based insights if consent given
      let insights = [];
      if (consentLevel !== 'none' && coordinates) {
        const locationInsights = await locationService.getLocationBasedInsights(
          userId, 
          coordinates
        );
        insights = locationInsights.insights || [];
      }

      res.json({
        success: true,
        consentLevel,
        insights,
        message: 'Location consent updated successfully'
      });

      logger.info(`Location consent updated: User ${userId} - Level: ${consentLevel}`);

    } catch (error) {
      logger.error('Update location consent failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get location insights'
      });
    }
  }

  // . Process IP-based location (fallback)
  async processIPLocation(req, res) {
    try {
      const userId = req.user.id;
      const { consentLevel = 'country_only' } = req.body;
      
      const locationData = await locationService.getLocationFromRequest(req, consentLevel);
      
      if (locationData.hasUserConsent) {
        await locationService.updateLocationConsent(userId, consentLevel);
      }

      res.json({
        success: true,
        data: {
          location: locationData,
          source: 'ip',
          message: 'Location estimated from IP address'
        }
      });

    } catch (error) {
      logger.error('IP location processing failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process IP location'
      });
    }
  }

  // . Get nearby support resources
  async getNearbyResources(req, res) {
    try {
      const userId = req.user.id;
      const { coordinates, radiusKm = 25, resourceType } = req.query;

      if (!coordinates) {
        return res.status(400).json({
          success: false,
          message: 'Coordinates required for nearby resource search'
        });
      }

      let parsedCoordinates;
      try {
        parsedCoordinates = JSON.parse(coordinates);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates format'
        });
      }

      // Mock resources for now (integrate with real APIs in production)
      const mockResources = [
        {
          name: 'Community Mental Health Center',
          type: 'counseling_center',
          distance: 2.5,
          phone: '+1-555-0123',
          address: '123 Health St',
          services: ['individual_therapy', 'group_therapy', 'crisis_support'],
          acceptsInsurance: true,
          rating: 4.5
        },
        {
          name: 'Crisis Support Hotline',
          type: 'crisis_line',
          distance: 0,
          phone: '988',
          services: ['24_7_support', 'crisis_intervention', 'suicide_prevention'],
          free: true,
          rating: 4.8
        }
      ];

      // Filter by resource type if specified
      let filteredResources = mockResources;
      if (resourceType) {
        filteredResources = mockResources.filter(r => r.type === resourceType);
      }

      res.json({
        success: true,
        data: {
          resources: filteredResources,
          count: filteredResources.length,
          radiusKm: parseFloat(radiusKm),
          searchLocation: parsedCoordinates
        }
      });

    } catch (error) {
      logger.error('Get nearby resources failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get nearby resources'
      });
    }
  }

  // . Get current location consent status
  async getLocationConsent(req, res) {
    try {
      const userId = req.user.id;
      const User = (await import('../models/user.model.js')).default;
      
      const user = await User.findById(userId).select('preferences location');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: {
          hasConsent: user.preferences?.shareLocation || false,
          consentLevel: user.preferences?.locationShareLevel || 'none',
          hasLocationData: !!(user.location && user.location.city),
          lastUpdate: user.location?.consentTimestamp || null
        }
      });

    } catch (error) {
      logger.error('Get location consent failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get location consent status'
      });
    }
  }

  // . Reverse geocode coordinates to address
  async reverseGeocode(req, res) {
    try {
      const { latitude, longitude } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude required'
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      if (!locationService.validateLocation({ coordinates: [lng, lat] })) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates'
        });
      }

      const addressData = await locationService.reverseGeocode(lat, lng);

      res.json({
        success: true,
        data: {
          latitude: lat,
          longitude: lng,
          address: addressData
        }
      });

    } catch (error) {
      logger.error('Reverse geocoding failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reverse geocode coordinates'
      });
    }
  }

  // . Get aggregated location stats (anonymized)
  async getLocationStats(req, res) {
    try {
      const { timeRange = '7d' } = req.query;
      
      // Calculate date range
      const now = new Date();
      let startDate;
      
      switch (timeRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      const Mood = (await import('../models/mood.model.js')).default;

      // Get aggregated stats without exposing individual data
      const stats = await Mood.aggregate([
        {
          $match: {
            'location.hasUserConsent': true,
            'privacy': { $in: ['public', 'local_community'] },
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              country: '$location.country',
              emotion: '$emotion'
            },
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' }
          }
        },
        {
          $group: {
            _id: '$_id.country',
            emotions: {
              $push: {
                emotion: '$_id.emotion',
                count: '$count',
                avgIntensity: '$avgIntensity'
              }
            },
            totalMoods: { $sum: '$count' }
          }
        },
        {
          $match: {
            totalMoods: { $gte: 5 } // Only show countries with at least 5 public moods
          }
        },
        { $sort: { totalMoods: -1 } },
        { $limit: 20 }
      ]);

      res.json({
        success: true,
        data: {
          timeRange,
          stats,
          count: stats.length,
          note: 'Data is aggregated and anonymized to protect user privacy'
        }
      });

    } catch (error) {
      logger.error('Get location stats failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get location statistics'
      });
    }
  }

  // . Crisis support endpoints (high priority)
  async getCrisisResources(req, res) {
    try {
      const { coordinates, urgencyLevel = 'crisis' } = req.body;
      
      if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
        return res.status(400).json({
          success: false,
          message: 'Valid coordinates required for crisis resources'
        });
      }

      // Always include national crisis lines
      const nationalCrisisLines = [
        {
          name: 'Suicide & Crisis Lifeline',
          type: 'crisis_line',
          phone: '988',
          services: ['24_7_support', 'crisis_intervention', 'suicide_prevention'],
          free: true,
          available: '24/7',
          languages: ['English', 'Spanish'],
          priority: 'critical'
        },
        {
          name: 'Crisis Text Line',
          type: 'text_support',
          contact: 'Text HOME to 741741',
          services: ['text_support', 'crisis_intervention'],
          free: true,
          available: '24/7',
          priority: 'critical'
        }
      ];

      // Mock local crisis resources (integrate with real APIs)
      const localCrisisResources = [
        {
          name: 'Local Emergency Crisis Center',
          type: 'crisis_center',
          phone: '+1-555-CRISIS',
          address: '456 Emergency Blvd',
          services: ['walk_in_crisis', 'emergency_intervention', 'mobile_crisis'],
          distance: 5.2,
          available: '24/7'
        }
      ];

      res.json({
        success: true,
        data: {
          urgencyLevel,
          nationalResources: nationalCrisisLines,
          localResources: localCrisisResources,
          totalResources: nationalCrisisLines.length + localCrisisResources.length,
          immediateHelp: {
            emergency: '911',
            crisis: '988',
            text: 'HOME to 741741'
          }
        }
      });

    } catch (error) {
      logger.error('Get crisis resources failed:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to get crisis resources',
        immediateHelp: {
          emergency: '911',
          crisis: '988',
          text: 'HOME to 741741'
        }
      });
    }
  }
}

//   // . Find nearby community members
//   async getNearbyCommu,
//         message: 'Failed to update location consent'
//       });
//     }
//   }

//   // . Revoke location consent and anonymize data
//   async revokeLocationConsent(req, res) {
//     try {
//       const userId = req.user.id;

//       // Set consent to none
//       await locationService.updateLocationConsent(userId, 'none');

//       res.json({
//         success: true,
//         message: 'Location consent revoked successfully'
//       });

//       logger.info(`Location consent revoked for user ${userId}`);

//     } catch (error) {
//       logger.error('Revoke location consent failed:', error);
//       res.status(500).json({
//         success: false,
//         message: 'Failed to revoke location consent'
//       });
//     }
//   }

//   // . Get location-based insights and suggestions
//   async getLocationInsights(req, res) {
//     try {
//       const userId = req.user.id;
//       const { coordinates, radiusKm = 50 } = req.query;

//       let parsedCoordinates = null;
//       if (coordinates) {
//         try {
//           parsedCoordinates = JSON.parse(coordinates);
//           if (!Array.isArray(parsedCoordinates) || parsedCoordinates.length !== 2) {
//             throw new Error('Invalid coordinates format');
//           }
//         } catch (error) {
//           return res.status(400).json({
//             success: false,
//             message: 'Invalid coordinates format. Expected JSON array [longitude, latitude]'
//           });
//         }
//       }

//       const insights = await locationService.getLocationBasedInsights(
//         userId,
//         parsedCoordinates,
//         parseFloat(radiusKm)
//       );

//       res.json({
//         success: true,
//         data: insights
//       });

//     } catch (error) {
//       logger.error('Get location insights failed:', error);
//       res.status(500).json({
//         success: false})
//       }
//     }

