// src/models/schemas/locationSchema.js - Reusable Location Schema
import mongoose from 'mongoose';

export const locationSchema = new mongoose.Schema({
  // Geographic coordinates
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    index: '2dsphere',
    validate: {
      validator: function(coords) {
        return coords && 
               Array.isArray(coords) &&
               coords.length === 2 && 
               coords[0] >= -180 && coords[0] <= 180 && // longitude
               coords[1] >= -90 && coords[1] <= 90;     // latitude
      },
      message: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90.'
    }
  },
  
  // Human-readable location data
  city: {
    type: String,
    trim: true,
    maxlength: 100
  },
  region: {
    type: String,
    trim: true,
    maxlength: 100
  },
  country: {
    type: String,
    trim: true,
    maxlength: 100
  },
  continent: {
    type: String,
    trim: true,
    maxlength: 50
  },
  address: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Timezone information
  timezone: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  // Privacy and consent settings
  hasUserConsent: {
    type: Boolean,
    default: false
  },
  shareLevel: {
    type: String,
    enum: ['none', 'continent', 'country', 'region', 'city'],
    default: 'country'
  },
  
  // Metadata
  accuracy: {
    type: Number, // in meters
    min: 0,
    max: 100000
  },
  source: {
    type: String,
    enum: ['gps', 'ip', 'manual', 'reverse_geocode', 'test'],
    default: 'gps'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { 
  _id: false,
  timestamps: false 
});

// Instance methods
locationSchema.methods.getDisplayLocation = function() {
  const parts = [];
  
  if (this.city) parts.push(this.city);
  if (this.region) parts.push(this.region);
  if (this.country) parts.push(this.country);
  
  return parts.length > 0 ? parts.join(', ') : 'Unknown location';
};

locationSchema.methods.getLocationString = function() {
  return this.getDisplayLocation();
};

locationSchema.methods.isValidLocation = function() {
  return this.coordinates && 
         Array.isArray(this.coordinates) && 
         this.coordinates.length === 2 &&
         this.coordinates[0] >= -180 && this.coordinates[0] <= 180 &&
         this.coordinates[1] >= -90 && this.coordinates[1] <= 90;
};

locationSchema.methods.getPrivacyFilteredLocation = function(shareLevel = this.shareLevel) {
  const location = {};
  
  switch (shareLevel) {
    case 'city':
      if (this.city) location.city = this.city;
      if (this.region) location.region = this.region;
      if (this.country) location.country = this.country;
      break;
    case 'region':
      if (this.region) location.region = this.region;
      if (this.country) location.country = this.country;
      break;
    case 'country':
      if (this.country) location.country = this.country;
      break;
    case 'continent':
      if (this.continent) location.continent = this.continent;
      break;
    case 'none':
    default:
      // Return minimal info
      break;
  }
  
  return location;
};

locationSchema.methods.hasValidCoordinates = function() {
  return this.coordinates && 
         Array.isArray(this.coordinates) && 
         this.coordinates.length === 2 &&
         this.coordinates[0] >= -180 && this.coordinates[0] <= 180 &&
         this.coordinates[1] >= -90 && this.coordinates[1] <= 90;
};

locationSchema.methods.getDistanceFrom = function(otherLocation) {
  if (!this.hasValidCoordinates() || !otherLocation.hasValidCoordinates()) {
    return null;
  }
  
  const [lng1, lat1] = this.coordinates;
  const [lng2, lat2] = otherLocation.coordinates;
  
  // Haversine formula for distance calculation
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

// Static methods
locationSchema.statics.createFromCoordinates = function(lng, lat, options = {}) {
  return {
    type: 'Point',
    coordinates: [lng, lat],
    ...options
  };
};

locationSchema.statics.createFromAddress = function(address, options = {}) {
  return {
    type: 'Point',
    coordinates: [0, 0], // Will be updated by geocoding
    address,
    source: 'manual',
    ...options
  };
};

// Pre-save middleware
locationSchema.pre('save', function(next) {
  if (this.coordinates && this.coordinates.length === 2) {
    this.lastUpdated = new Date();
  }
  next();
});

export default locationSchema; 