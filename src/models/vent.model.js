// src/models/vent.model.js - Enhanced beyond just emotions
import mongoose from 'mongoose';

const VentSchema = new mongoose.Schema({
  // Anonymous identifier (no user link by default)
  anonymousId: {
    type: String,
    required: true,
    index: true
  },
  
  userId: {
    type: mongoose.Schema.Types.Mixed,
    ref: 'User',
    required: false,
    index: true
  },

  content: {
    type: String,
    required: true,
    maxlength: 2000, // . INCREASED: More space for detailed vents
    trim: true
  },
  
  // . ENHANCED: Multiple emotions (people feel complex emotions)
  emotions: [{
    type: String,
    enum: [
      // Core emotions
      'joy', 'sadness', 'anger', 'fear', 'disgust', 'surprise',
      // Extended emotions
      'confused', 'grateful', 'proud', 'embarrassed', 'guilty', 'ashamed', 
      'jealous', 'envious', 'lonely', 'bored', 'tired', 'energetic', 'calm', 
      'peaceful', 'relaxed', 'motivated', 'inspired', 'confident', 'insecure', 
      'vulnerable', 'nostalgic', 'hopeful', 'hopeless', 'overwhelmed', 'stressed',
      'anxious', 'worried', 'frustrated', 'excited', 'content', 'disappointed',
      'relieved', 'shocked', 'curious', 'loved', 'unloved', 'accepted', 'rejected'
    ]
  }],
  
  // . NEW: Primary issue category (beyond emotions)
  issueCategory: {
    type: String,
    enum: [
      // Life areas
      'relationship_romantic', 'relationship_family', 'relationship_friends',
      'work_career', 'school_education', 'financial', 'health_physical', 
      'health_mental', 'identity_self', 'future_uncertainty', 'past_trauma',
      // Specific struggles
      'addiction_substance', 'addiction_behavioral', 'grief_loss', 'abuse',
      'discrimination', 'isolation', 'perfectionism', 'imposter_syndrome',
      'body_image', 'sexuality_gender', 'parenting', 'caregiving',
      // Existential
      'meaning_purpose', 'spiritual_religious', 'mortality', 'values_conflict',
      // Daily struggles
      'productivity', 'time_management', 'decision_making', 'communication',
      'boundaries', 'self_care', 'other'
    ],
    required: true
  },
  
  // . NEW: Urgency and severity indicators
  urgency: {
    level: {
      type: String,
      enum: ['low', 'medium', 'high', 'crisis'],
      default: 'medium'
    },
    suicidalThoughts: {
      type: Boolean,
      default: false
    },
    selfHarmThoughts: {
      type: Boolean,
      default: false
    },
    needsImmediateHelp: {
      type: Boolean,
      default: false
    }
  },
  
  // . NEW: What they're seeking
  seekingType: [{
    type: String,
    enum: [
      'just_venting', 'advice', 'validation', 'empathy', 'perspective',
      'resources', 'professional_help', 'someone_to_talk', 'distraction',
      'motivation', 'hope', 'practical_solutions'
    ]
  }],
  
  // . ENHANCED: Better triggers and context
  triggers: [{
    type: String,
    enum: [
      // Recent events
      'breakup', 'job_loss', 'death', 'diagnosis', 'accident', 'argument',
      'rejection', 'betrayal', 'failure', 'success_pressure', 'anniversary',
      // Ongoing situations
      'chronic_illness', 'unemployment', 'toxic_relationship', 'bullying',
      'financial_stress', 'academic_pressure', 'work_burnout', 'caregiver_stress',
      // Internal triggers
      'comparison', 'memories', 'fear_future', 'regret', 'guilt', 'shame',
      'perfectionism', 'impostor_syndrome', 'low_self_esteem',
      // External triggers
      'social_media', 'news', 'weather', 'hormones', 'substances', 'lack_sleep',
      'isolation', 'overstimulation', 'change', 'uncertainty', 'other'
    ]
  }],
  
  // . NEW: Duration and pattern
  duration: {
    type: String,
    enum: ['right_now', 'today', 'this_week', 'this_month', 'months', 'years', 'always'],
    default: 'right_now'
  },
  
  isRecurring: {
    type: Boolean,
    default: false
  },
  
  // Intensity of the overall experience
  intensity: {
    type: Number,
    min: 1,
    max: 10, // . CHANGED: 1-10 scale is more intuitive
    default: 5
  },
  
  // . ENHANCED: More specific tags
  tags: [{
    type: String,
    trim: true,
    maxlength: 50,
    enum: [
      // Life stages
      'teenager', 'young_adult', 'new_parent', 'midlife', 'senior',
      // Identities
      'lgbtq', 'poc', 'disability', 'neurodivergent', 'immigrant', 'veteran',
      // Situations
      'student', 'unemployed', 'single_parent', 'caregiver', 'chronic_illness',
      // Themes
      'first_time', 'recurring', 'breakthrough', 'setback', 'milestone',
      'anniversary', 'holiday_blues', 'seasonal', 'pandemic_related'
    ]
  }],
  
  // . ENHANCED: Location with better privacy
  location: {
    // Consent and privacy
    hasUserConsent: {
      type: Boolean,
      default: false
    },
    shareLevel: {
      type: String,
      enum: ['none', 'continent', 'country', 'region', 'city'],
      default: 'country'
    },
    
    // Geographic data
    city: String,
    region: String,
    country: String,
    continent: String,
    timezone: String,
    
    // Approximate coordinates (for regional support matching)
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false
    }
  },
  
  // Privacy settings
  privacy: {
    isPublic: {
      type: Boolean,
      default: true
    },
    allowReplies: {
      type: Boolean,
      default: true
    },
    allowReactions: {
      type: Boolean,
      default: true
    },
    allowMatching: { // . NEW: Allow matching with similar vents/people
      type: Boolean,
      default: true
    },
    blurContent: {
      type: Boolean,
      default: false
    },
    contentWarning: {
      type: String,
      enum: ['none', 'sensitive', 'triggering', 'explicit', 'self_harm', 'suicide'],
      default: 'none'
    },
    ageRestriction: {
      type: String,
      enum: ['all', '13+', '16+', '18+'],
      default: 'all'
    }
  },
  
  // . ENHANCED: More reaction types
  reactions: [{
    type: {
      type: String,
      enum: [
        // Support reactions
        'comfort', 'virtual_hug', 'listening', 'strength', 'hope',
        // Relation reactions  
        'relate', 'been_there', 'me_too', 'similar_experience',
        // Appreciation reactions
        'thank_you', 'brave', 'inspiring', 'helpful',
        // Resource reactions
        'resources_available', 'professional_help', 'crisis_support'
      ],
      required: true
    },
    anonymousId: String,
    message: { // . NEW: Optional supportive message
      type: String,
      maxlength: 200,
      trim: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // . ENHANCED: Better replies system
  replies: [{
    content: {
      type: String,
      required: true,
      maxlength: 1000, // . INCREASED: More space for helpful replies
      trim: true
    },
    anonymousId: String,
    replyType: { // . NEW: Type of reply
      type: String,
      enum: [
        'support', 'advice', 'shared_experience', 'resources', 
        'professional_perspective', 'peer_support', 'encouragement'
      ],
      default: 'support'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    isHelpful: { // . NEW: Track helpful replies
      type: Number,
      default: 0
    },
    reactions: [{
      type: {
        type: String,
        enum: ['helpful', 'relate', 'thank_you', 'disagree']
      },
      anonymousId: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  
  // . NEW: Matching and support system
  matching: {
    allowPeerMatching: {
      type: Boolean,
      default: true
    },
    preferredSupportType: [{
      type: String,
      enum: ['peer_support', 'professional', 'group_support', 'one_on_one', 'anonymous_only']
    }],
    matchedWith: [{ // Anonymous IDs of matched supporters
      anonymousId: String,
      matchType: {
        type: String,
        enum: ['similar_experience', 'professional', 'peer_volunteer', 'crisis_supporter']
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // . ENHANCED: Moderation with better safety
  moderation: {
    isFlagged: {
      type: Boolean,
      default: false
    },
    flaggedBy: [String],
    flaggedReason: {
      type: String,
      enum: [
        'inappropriate', 'spam', 'harassment', 'misinformation',
        'self_harm_content', 'suicide_content', 'graphic_content', 'other'
      ]
    },
    isHidden: {
      type: Boolean,
      default: false
    },
    moderatedAt: Date,
    
    // . NEW: AI safety screening
    aiScreening: {
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'crisis'],
        default: 'low'
      },
      flaggedConcerns: [{
        type: String,
        enum: ['suicide_risk', 'self_harm', 'violence', 'substance_abuse', 'eating_disorder']
      }],
      needsReview: {
        type: Boolean,
        default: false
      },
      screenedAt: {
        type: Date,
        default: Date.now
      }
    }
  },
  
  // . ENHANCED: Analytics for better support
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    reactionCount: {
      type: Number,
      default: 0
    },
    replyCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    helpfulnessScore: {
      type: Number,
      default: 0
    },
    
    // . NEW: Support tracking
    supportProvided: {
      type: Boolean,
      default: false
    },
    crisisInterventionTriggered: {
      type: Boolean,
      default: false
    },
    resourcesShared: [{
      type: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    followUpNeeded: {
      type: Boolean,
      default: false
    }
  },
  
  // . NEW: Follow-up and resolution tracking
  followUp: {
    hasFollowUp: {
      type: Boolean,
      default: false
    },
    improvementReported: {
      type: String,
      enum: ['much_worse', 'worse', 'same', 'better', 'much_better'],
      default: null
    },
    helpfulnessRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    wouldRecommend: {
      type: Boolean,
      default: null
    },
    additionalSupport: {
      type: String,
      maxlength: 500
    },
    followUpDate: Date
  },
  
  // Session and technical info
  sessionToken: {
    type: String,
    required: false,
    index: true
  },
  
  source: {
    type: String,
    enum: ['mobile', 'web', 'api', 'crisis_hotline', 'partner_app'],
    default: 'web'
  },
  
  version: {
    type: String,
    default: '2.0'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// . ENHANCED: Better indexes for matching and analytics
VentSchema.index({ createdAt: -1 });
VentSchema.index({ 'privacy.isPublic': 1, createdAt: -1 });
VentSchema.index({ issueCategory: 1, createdAt: -1 });
VentSchema.index({ 'urgency.level': 1, createdAt: -1 });
VentSchema.index({ tags: 1 });
VentSchema.index({ 'location.country': 1, createdAt: -1 });
VentSchema.index({ 'moderation.isHidden': 1 });
VentSchema.index({ 'moderation.aiScreening.riskLevel': 1 });
VentSchema.index({ seekingType: 1 });
VentSchema.index({ emotions: 1, issueCategory: 1 });

// . NEW: Find similar vents for matching
VentSchema.statics.findSimilarVents = function(ventId, limit = 5) {
  return this.aggregate([
    { $match: { _id: { $ne: ventId }, 'privacy.isPublic': true, 'moderation.isHidden': false } },
    {
      $lookup: {
        from: 'vents',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $match: { _id: ventId } }],
        as: 'originalVent'
      }
    },
    { $unwind: '$originalVent' },
    {
      $addFields: {
        similarityScore: {
          $add: [
            // Category match (highest weight)
            { $cond: [{ $eq: ['$issueCategory', '$originalVent.issueCategory'] }, 10, 0] },
            // Emotion overlap
            { $multiply: [{ $size: { $setIntersection: ['$emotions', '$originalVent.emotions'] } }, 3] },
            // Tag overlap
            { $multiply: [{ $size: { $setIntersection: ['$tags', '$originalVent.tags'] } }, 2] },
            // Trigger overlap
            { $multiply: [{ $size: { $setIntersection: ['$triggers', '$originalVent.triggers'] } }, 2] },
            // Similar seeking type
            { $multiply: [{ $size: { $setIntersection: ['$seekingType', '$originalVent.seekingType'] } }, 1] }
          ]
        }
      }
    },
    { $match: { similarityScore: { $gt: 0 } } },
    { $sort: { similarityScore: -1, 'analytics.helpfulnessScore': -1 } },
    { $limit: limit },
    {
      $project: {
        content: 1,
        issueCategory: 1,
        emotions: 1,
        seekingType: 1,
        'analytics.replyCount': 1,
        'analytics.helpfulnessScore': 1,
        similarityScore: 1,
        createdAt: 1
      }
    }
  ]);
};

// . NEW: Crisis detection and intervention
VentSchema.methods.assessCrisisRisk = function() {
  let riskScore = 0;
  const crisisKeywords = [
    'suicide', 'kill myself', 'end it all', 'want to die', 'not worth living',
    'better off dead', 'hurt myself', 'cut myself', 'overdose', 'jump'
  ];
  
  // Check for crisis keywords
  const contentLower = this.content.toLowerCase();
  crisisKeywords.forEach(keyword => {
    if (contentLower.includes(keyword)) {
      riskScore += 10;
    }
  });
  
  // Check urgency flags
  if (this.urgency.suicidalThoughts) riskScore += 15;
  if (this.urgency.selfHarmThoughts) riskScore += 10;
  if (this.urgency.needsImmediateHelp) riskScore += 20;
  
  // High intensity with certain emotions
  if (this.intensity >= 8) {
    if (this.emotions.includes('hopeless') || this.emotions.includes('overwhelmed')) {
      riskScore += 5;
    }
  }
  
  // Determine risk level
  let riskLevel = 'low';
  if (riskScore >= 20) riskLevel = 'crisis';
  else if (riskScore >= 10) riskLevel = 'high';
  else if (riskScore >= 5) riskLevel = 'medium';
  
  // Update AI screening
  this.moderation.aiScreening.riskLevel = riskLevel;
  this.moderation.aiScreening.needsReview = riskScore >= 10;
  this.moderation.aiScreening.screenedAt = new Date();
  
  if (riskScore >= 15) {
    this.moderation.aiScreening.flaggedConcerns.push('suicide_risk');
    this.analytics.crisisInterventionTriggered = true;
  }
  
  return { riskLevel, riskScore };
};

// . NEW: Get location-based support resources
VentSchema.statics.getNearbySupport = function(coordinates, issueCategory, radiusKm = 100) {
  if (!coordinates || coordinates.length !== 2) {
    return Promise.resolve([]);
  }
  
  const radiusInRadians = radiusKm / 6371; // Earth's radius in km
  
  return this.aggregate([
    {
      $match: {
        'privacy.isPublic': true,
        'moderation.isHidden': false,
        issueCategory: issueCategory,
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [coordinates, radiusInRadians]
          }
        },
        'analytics.supportProvided': true,
        'analytics.helpfulnessScore': { $gte: 3 }
      }
    },
    {
      $group: {
        _id: '$location.city',
        successfulSupport: { $sum: 1 },
        avgHelpfulness: { $avg: '$analytics.helpfulnessScore' },
        commonResources: { $addToSet: '$analytics.resourcesShared' }
      }
    },
    { $sort: { avgHelpfulness: -1, successfulSupport: -1 } },
    { $limit: 10 }
  ]);
};

// . ENHANCED: Better public vents with filtering
VentSchema.statics.getPublicVents = function(page = 1, limit = 20, filters = {}) {
  const skip = (page - 1) * limit;
  
  const query = {
    'privacy.isPublic': true,
    'moderation.isHidden': false
  };
  
  // Apply filters
  if (filters.issueCategory) {
    query.issueCategory = filters.issueCategory;
  }
  
  if (filters.emotions && filters.emotions.length > 0) {
    query.emotions = { $in: filters.emotions };
  }
  
  if (filters.seekingType && filters.seekingType.length > 0) {
    query.seekingType = { $in: filters.seekingType };
  }
  
  if (filters.urgencyLevel) {
    query['urgency.level'] = filters.urgencyLevel;
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query.tags = { $in: filters.tags };
  }
  
  if (filters.location) {
    if (filters.location.country) {
      query['location.country'] = filters.location.country;
    }
    if (filters.location.region) {
      query['location.region'] = filters.location.region;
    }
  }
  
  if (filters.hasReplies) {
    query['analytics.replyCount'] = { $gt: 0 };
  }
  
  if (filters.needsSupport) {
    query['analytics.supportProvided'] = false;
  }
  
  return this.find(query)
    .sort({ 
      'urgency.level': -1, // Crisis first
      'analytics.crisisInterventionTriggered': -1,
      createdAt: -1 
    })
    .skip(skip)
    .limit(limit)
    .select('-moderation.flaggedBy -sessionToken -moderation.aiScreening');
};

// . NEW: Track successful support outcomes
VentSchema.methods.markSupportProvided = function(resourcesProvided = []) {
  this.analytics.supportProvided = true;
  if (resourcesProvided.length > 0) {
    this.analytics.resourcesShared.push(...resourcesProvided.map(r => ({
      type: r,
      timestamp: new Date()
    })));
  }
  return this.save();
};

// . NEW: Follow-up and outcome tracking
VentSchema.methods.addFollowUp = function(improvement, helpfulness, additionalSupport = '') {
  this.followUp = {
    hasFollowUp: true,
    improvementReported: improvement,
    helpfulnessRating: helpfulness,
    additionalSupport: additionalSupport,
    followUpDate: new Date()
  };
  
  // Update analytics based on follow-up
  if (helpfulness >= 4) {
    this.analytics.helpfulnessScore = (this.analytics.helpfulnessScore + helpfulness) / 2;
  }
  
  return this.save();
};

// . ENHANCED: Better reaction system
VentSchema.methods.addReaction = function(reactionType, anonymousId, message = '') {
  // Check if user already reacted
  const existingReaction = this.reactions.find(r => r.anonymousId === anonymousId);
  if (existingReaction) {
    existingReaction.type = reactionType;
    existingReaction.timestamp = new Date();
    if (message) existingReaction.message = message;
  } else {
    this.reactions.push({
      type: reactionType,
      anonymousId,
      message,
      timestamp: new Date()
    });
  }
  
  this.analytics.reactionCount = this.reactions.length;
  return this.save();
};

// . NEW: Enhanced reply system
VentSchema.methods.addReply = function(content, anonymousId, replyType = 'support') {
  this.replies.push({
    content,
    anonymousId,
    replyType,
    timestamp: new Date()
  });
  
  this.analytics.replyCount = this.replies.length;
  return this.save();
};

// . NEW: Match with potential supporters
VentSchema.methods.findPotentialSupporters = function() {
  if (!this.matching.allowPeerMatching) return Promise.resolve([]);
  
  return this.constructor.aggregate([
    {
      $match: {
        _id: { $ne: this._id },
        issueCategory: this.issueCategory,
        'analytics.supportProvided': true,
        'analytics.helpfulnessScore': { $gte: 3 },
        'followUp.helpfulnessRating': { $gte: 4 }
      }
    },
    {
      $addFields: {
        matchScore: {
          $add: [
            { $size: { $setIntersection: ['$emotions', this.emotions] } },
            { $size: { $setIntersection: ['$triggers', this.triggers] } },
            { $cond: [{ $eq: ['$location.country', this.location.country] }, 2, 0] }
          ]
        }
      }
    },
    { $match: { matchScore: { $gt: 0 } } },
    { $sort: { matchScore: -1, 'analytics.helpfulnessScore': -1 } },
    { $limit: 5 },
    {
      $project: {
        anonymousId: 1,
        issueCategory: 1,
        'analytics.helpfulnessScore': 1,
        'followUp.improvementReported': 1,
        matchScore: 1
      }
    }
  ]);
};

export default mongoose.model('Vent', VentSchema);