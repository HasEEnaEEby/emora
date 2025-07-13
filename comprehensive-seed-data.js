// comprehensive-seed-enhanced.js - Works with enhanced models
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import User from './src/models/user.model.js';
import Mood from './src/models/mood.model.js';
import CommunityPost from './src/models/community-post.model.js';
import Vent from './src/models/vent.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/emora';

// Enhanced sample data
const SAMPLE_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Sage', 'River', 'Phoenix',
  'Skylar', 'Cameron', 'Drew', 'Quinn', 'Blake', 'Hayden', 'Parker', 'Emerson', 'Rowan', 'Finley',
  'Kai', 'Zoe', 'Luna', 'Nova', 'Atlas', 'Orion', 'Jasper', 'Maya', 'Aria', 'Leo'
];

const SAMPLE_LOCATIONS = [
  {
    name: 'New York, NY',
    coordinates: [-74.006, 40.7128], // [longitude, latitude]
    city: 'New York',
    region: 'NY',
    country: 'United States',
    continent: 'North America',
    timezone: 'America/New_York'
  },
  {
    name: 'London, UK',
    coordinates: [-0.1276, 51.5074],
    city: 'London',
    region: 'England',
    country: 'United Kingdom',
    continent: 'Europe',
    timezone: 'Europe/London'
  },
  {
    name: 'Tokyo, Japan',
    coordinates: [139.6917, 35.6895],
    city: 'Tokyo',
    region: 'Tokyo',
    country: 'Japan',
    continent: 'Asia',
    timezone: 'Asia/Tokyo'
  },
  {
    name: 'Berlin, Germany',
    coordinates: [13.4050, 52.5200],
    city: 'Berlin',
    region: 'Berlin',
    country: 'Germany',
    continent: 'Europe',
    timezone: 'Europe/Berlin'
  },
  {
    name: 'Cape Town, South Africa',
    coordinates: [18.4241, -33.9249],
    city: 'Cape Town',
    region: 'Western Cape',
    country: 'South Africa',
    continent: 'Africa',
    timezone: 'Africa/Johannesburg'
  },
  {
    name: 'Sydney, Australia',
    coordinates: [151.2093, -33.8688],
    city: 'Sydney',
    region: 'NSW',
    country: 'Australia',
    continent: 'Oceania',
    timezone: 'Australia/Sydney'
  },
  {
    name: 'Toronto, Canada',
    coordinates: [-79.3832, 43.6532],
    city: 'Toronto',
    region: 'Ontario',
    country: 'Canada',
    continent: 'North America',
    timezone: 'America/Toronto'
  },
  {
    name: 'Mumbai, India',
    coordinates: [72.8777, 19.0760],
    city: 'Mumbai',
    region: 'Maharashtra',
    country: 'India',
    continent: 'Asia',
    timezone: 'Asia/Kolkata'
  }
];

const PRONOUNS = ['She / Her', 'He / Him', 'They / Them', 'Other'];
const AGE_GROUPS = ['Under 18', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const AVATARS = ['panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon', 'cat', 'dog', 'owl', 'penguin'];

// Import emotions from constants
import { EMOTION_NAMES } from './src/constants/emotions.js';

const plainPassword = 'password123';

// Missing constants that are referenced in the script
const SEEKING_TYPES = [
  'just_venting', 'advice', 'validation', 'empathy', 'perspective', 'resources', 'someone_to_talk'
];

const ISSUE_CATEGORIES = [
  'relationship_romantic', 'relationship_family', 'work_career', 'health_mental', 
  'financial', 'identity_self', 'future_uncertainty', 'isolation', 'perfectionism'
];

const ACTIVITY_TYPES = ['work', 'school', 'home', 'social', 'exercise', 'travel', 'leisure', 'other'];
const SOCIAL_CONTEXTS = ['alone', 'with_family', 'with_friends', 'with_colleagues', 'with_partner'];
const TRIGGERS = ['work_stress', 'relationship', 'health', 'money', 'family', 'achievement', 'change', 'uncertainty'];
const COPING_STRATEGIES = ['deep_breathing', 'meditation', 'exercise', 'music', 'talking', 'nature', 'rest'];

// Enhanced mood notes
const MOOD_NOTES = [
  "Had an amazing day at the beach with friends! The sunshine was perfect and I felt so connected to everyone around me.",
  "Feeling overwhelmed with work deadlines, but I found some peace during my lunch break meditation.",
  "Just finished a great workout session. Those endorphins are really kicking in and I feel unstoppable!",
  "Cozy evening with a good book and hot cocoa. Sometimes it's these simple moments that fill my heart.",
  "Traffic was terrible today, but my favorite playlist helped me stay calm and even sing along.",
  "Proud of myself for trying something new today - signed up for a pottery class despite my anxiety!",
  "Missing my family today. Video called them and felt so much better afterward.",
  "Had the most delicious homemade pasta for dinner. Cooking really is therapeutic for me.",
  "Woke up feeling grateful for all the wonderful people in my life and this beautiful day ahead.",
  "Dealing with some anxiety about tomorrow's presentation, but I've prepared well and I trust myself."
];

const VENT_CONTENT = [
  "I feel like I'm drowning in responsibilities and no one understands the pressure I'm under. Every day feels like a battle.",
  "Why does it feel like everyone else has their life figured out except me? Social media makes it so much worse.",
  "I'm tired of pretending everything is okay when I'm falling apart inside. The mask is getting so heavy.",
  "My relationship ended and I feel lost. We had so many plans together and now I don't know who I am without them.",
  "Work is becoming toxic and I'm scared to leave because of the financial uncertainty. Feel trapped.",
  "I've been struggling with anxiety for months and it's affecting every aspect of my life. Need to find a way forward.",
  "Family doesn't understand my choices and their constant criticism is wearing me down. Love them but need space.",
  "Dealing with imposter syndrome at my new job. Everyone seems so confident and I feel like a fraud.",
  "Money stress is keeping me up at night. Bills keep piling up and I don't see a way out.",
  "Feeling isolated in this big city. It's hard to make genuine connections when everyone seems so busy."
];

const COMMUNITY_ACTIVITY_TYPES = ['Achievement', 'Mindfulness', 'Exercise', 'Gratitude', 'Social', 'Relaxation', 'Learning', 'Creative', 'Adventure', 'General'];

// Helper functions
function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBool(probability = 0.5) {
  return Math.random() < probability;
}

function generateUsername(name) {
  return name.toLowerCase().replace(/\s+/g, '');
}

function generateValidHexColor() {
  const hex = Math.floor(Math.random() * 16777215).toString(16);
  return `#${hex.padStart(6, '0')}`;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function createUsers(count = 60) {
  console.log(`🧑‍🤝‍🧑 Creating ${count} users...`);
  const users = [];
  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const name = randomChoice(SAMPLE_NAMES);
      const location = randomChoice(SAMPLE_LOCATIONS);
      
      // Ensure continent is always set and valid
      const continent = location.continent || 'Unknown';

      const user = new User({
        username: generateUsername(name) + '_' + randomInt(1, 999),
        email: `${name.toLowerCase()}${randomInt(1, 999)}@example.com`,
        password: plainPassword,
        pronouns: randomChoice(PRONOUNS),
        ageGroup: randomChoice(AGE_GROUPS),
        selectedAvatar: randomChoice(AVATARS),
        location: {
          name: location.name,
          coordinates: {
            type: 'Point',
            coordinates: location.coordinates // This is already [longitude, latitude]
          },
          country: location.country,
          city: location.city,
          continent: continent,
          timezone: location.timezone
        },
        isOnboardingCompleted: true,
        isActive: true,
        isOnline: Math.random() > 0.7,
        profile: {
          displayName: name,
          bio: `Hi, I'm ${name}! I'm here to connect and share my journey.`,
          themeColor: generateValidHexColor()
        },
        preferences: {
          shareLocation: Math.random() > 0.3,
          shareEmotions: Math.random() > 0.2,
          anonymousMode: Math.random() > 0.4,
          allowRecommendations: Math.random() > 0.2,
          notifications: {
            dailyReminder: Math.random() > 0.3,
            time: `${randomInt(8, 22)}:${randomInt(0, 59).toString().padStart(2, '0')}`,
            timezone: location.timezone,
            friendRequests: Math.random() > 0.2,
            comfortReactions: Math.random() > 0.2,
            friendMoodUpdates: Math.random() > 0.3
          },
          moodPrivacy: randomChoice(['private', 'friends', 'public'])
        },
        privacySettings: {
          profileVisibility: randomChoice(['public', 'friends', 'private']),
          emotionVisibility: randomChoice(['public', 'friends', 'private']),
          locationVisibility: randomChoice(['public', 'friends', 'private'])
        },
        analytics: {
          totalEmotionEntries: 0,
          totalMoodsLogged: 0,
          daysSinceJoined: randomInt(1, 365),
          longestStreak: randomInt(0, 30),
          currentStreak: randomInt(0, 7),
          loginCount: randomInt(1, 100),
          lastActiveAt: new Date(Date.now() - randomInt(0, 7 * 24 * 60 * 60 * 1000)),
          totalFriends: 0,
          totalComfortReactionsSent: 0,
          totalComfortReactionsReceived: 0,
          totalPostsShared: 0,
          totalCommentsGiven: 0,
          totalCommentsReceived: 0
        }
      });

      const savedUser = await user.save();
      users.push(savedUser);
      createdCount++;
      
      if (createdCount % 10 === 0) {
        console.log(`   ✅ Created ${createdCount}/${count} users`);
      }
    } catch (error) {
      skippedCount++;
      console.log(`   ⚠️ Skipped user ${i + 1}: ${error.message}`);
    }
  }

  console.log(`✅ Created ${createdCount} users successfully!`);
  if (skippedCount > 0) {
    console.log(`⚠️ Skipped ${skippedCount} users due to validation errors`);
  }
  
  return users;
}

async function createMonthlyMoodsForUsers(users) {
  console.log('📅 Creating 30 days of mood data for each user...');
  const moods = [];
  const now = new Date();
  let createdCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    for (let day = 0; day < 30; day++) {
      try {
        const date = new Date(now);
        date.setDate(now.getDate() - day);
        const emotion = randomChoice(EMOTION_NAMES);
        
        // Use the user's location data
        const userLocation = user.location;
        
        const mood = new Mood({
          userId: user._id,
          emotion: emotion,
          intensity: randomInt(2, 5),
          location: {
            type: 'Point',
            coordinates: userLocation.coordinates.coordinates, // [longitude, latitude]
            city: userLocation.city,
            region: userLocation.region || userLocation.city,
            country: userLocation.country,
            continent: userLocation.continent,
            timezone: userLocation.timezone
          },
          context: {
            dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()],
            timeOfDay: randomChoice(['morning', 'afternoon', 'evening', 'night']),
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            weather: randomChoice(['sunny', 'cloudy', 'rainy', 'snowy', 'foggy']),
            temperature: randomInt(-10, 40)
          },
          note: `Mood entry for ${date.toLocaleDateString()}`,
          tags: [randomChoice(['work', 'family', 'friends', 'exercise', 'nature'])],
          isAnonymous: Math.random() > 0.3,
          source: randomChoice(['mobile', 'web']),
          privacy: randomChoice(['private', 'friends', 'public']),
          reactions: [],
          comments: [],
          shareCount: 0,
          viewCount: 0
        });

        const savedMood = await mood.save();
        moods.push(savedMood);
        createdCount++;
        
        if (createdCount % 50 === 0) {
          console.log(`   ✅ Created ${createdCount}/400 moods`);
        }
      } catch (error) {
        skippedCount++;
        console.log(`   ⚠️ Skipped mood ${createdCount + skippedCount}: ${error.message}`);
      }
    }
  }

  console.log(`✅ Created ${createdCount} enhanced mood entries!`);
  if (skippedCount > 0) {
    console.log(`⚠️ Skipped ${skippedCount} moods due to validation errors`);
  }
  
  return moods;
}

// ✅ FIXED: Create community posts with valid activity types
async function createCommunityPosts(users, count = 100) {
  console.log(`📝 Creating ${count} community posts...`);
  const posts = [];
  
  const communityContent = [
    "Grateful for this beautiful sunset after a challenging day. Sometimes nature is the best therapist! 🌅",
    "Completed my first 5K today! Six months ago I could barely walk around the block. Progress isn't always linear but it's always worth it 💪",
    "Had a panic attack at the grocery store today, but I stayed and got through it. Small victories matter too ❤️",
    "Starting therapy next week. Nervous but hopeful. Taking care of mental health is just as important as physical health 🧠",
    "Celebrated 6 months sober today with my support group. The journey continues but I'm not alone 🙏",
    "Bad mental health day turned around when a stranger smiled at me on the bus. Kindness is powerful ✨",
    "Learning to set boundaries has been hard but so necessary. It's okay to put yourself first sometimes 💙",
    "Meditation challenge day 30! My mind still wanders but I'm learning to be gentle with myself 🧘‍♀️"
  ];
  
  for (let i = 0; i < count; i++) {
    const user = randomChoice(users);
    const location = randomChoice(SAMPLE_LOCATIONS);
    
    try {
      const post = new CommunityPost({
        userId: user._id,
        content: randomChoice(communityContent),
        emoji: randomChoice(['😊', '🎉', '💪', '🌟', '❤️', '🙏', '🌈', '✨', '🔥', '💙']),
        activityType: randomChoice(['Achievement', 'Mindfulness', 'Exercise', 'Gratitude', 'Social', 'Relaxation', 'Learning', 'Creative', 'Adventure', 'General']), // ✅ FIXED: Use valid activity types
        location: {
          city: location.city,
          country: location.country,
          coordinates: location.coordinates
        },
        privacy: randomChoice(['public', 'public', 'friends']),
        createdAt: randomDate(new Date(2024, 0, 1), new Date())
      });

      const savedPost = await post.save();
      posts.push(savedPost);
      
      if ((i + 1) % 25 === 0) {
        console.log(`   ✅ Created ${i + 1}/${count} community posts`);
      }
    } catch (error) {
      console.log(`   ⚠️ Skipped post ${i + 1}: ${error.message}`);
    }
  }

  console.log(`✅ Created ${posts.length} community posts!`);
  return posts;
}

// ✅ FIXED: Create enhanced vents
async function createVents(count = 50) {
  console.log(`😤 Creating ${count} enhanced anonymous vents...`);
  const vents = [];
  
  for (let i = 0; i < count; i++) {
    const location = randomChoice(SAMPLE_LOCATIONS);
    const hasLocationConsent = randomBool(0.6);
    const urgencyLevel = randomChoice(['low', 'medium', 'high']);
    
    const ventData = {
      anonymousId: `anon_${Date.now()}_${randomInt(1000, 9999)}`,
      content: randomChoice(VENT_CONTENT),
      
      // ✅ FIXED: Multiple emotions (more realistic)
      emotions: [
        randomChoice(['sadness', 'anger', 'fear', 'overwhelmed', 'anxious']),
        ...(randomBool(0.4) ? [randomChoice(['lonely', 'confused', 'hopeless'])] : [])
      ],
      
      // ✅ FIXED: Enhanced categorization
      issueCategory: randomChoice(ISSUE_CATEGORIES),
      seekingType: [
        randomChoice(SEEKING_TYPES),
        ...(randomBool(0.3) ? [randomChoice(SEEKING_TYPES)] : [])
      ],
      
      urgency: {
        level: urgencyLevel,
        suicidalThoughts: urgencyLevel === 'high' && randomBool(0.1),
        selfHarmThoughts: urgencyLevel === 'high' && randomBool(0.15),
        needsImmediateHelp: urgencyLevel === 'high' && randomBool(0.2)
      },
      
      triggers: [randomChoice(['breakup', 'job_loss', 'financial_stress', 'academic_pressure', 'isolation'])],
      duration: randomChoice(['right_now', 'this_week', 'this_month', 'months']),
      isRecurring: randomBool(0.4),
      intensity: randomInt(3, 10),
      
      tags: [randomChoice(['young_adult', 'student', 'first_time', 'recurring'])],
      
      // ✅ FIXED: Enhanced location with consent
      location: hasLocationConsent ? {
        hasUserConsent: true,
        shareLevel: randomChoice(['country', 'region', 'city']),
        city: location.city,
        country: location.country,
        continent: location.continent,
        coordinates: location.coordinates
      } : {
        hasUserConsent: false,
        shareLevel: 'none'
      },
      
      privacy: {
        isPublic: true,
        allowReplies: randomBool(0.9),
        allowReactions: randomBool(0.95),
        allowMatching: randomBool(0.8),
        contentWarning: urgencyLevel === 'high' ? randomChoice(['sensitive', 'triggering']) : 'none'
      },
      
      matching: {
        allowPeerMatching: randomBool(0.7),
        preferredSupportType: [randomChoice(['peer_support', 'anonymous_only', 'one_on_one'])]
      },
      
      createdAt: randomDate(new Date(2024, 0, 1), new Date())
    };

    try {
      const vent = new Vent(ventData);
      
      // ✅ FIXED: Assess crisis risk using the model method
      vent.assessCrisisRisk();
      
      const savedVent = await vent.save();
      vents.push(savedVent);
      
      if ((i + 1) % 10 === 0) {
        console.log(`   ✅ Created ${i + 1}/${count} vents`);
      }
    } catch (error) {
      console.log(`   ⚠️ Skipped vent ${i + 1}: ${error.message}`);
    }
  }

  console.log(`✅ Created ${vents.length} enhanced vents!`);
  return vents;
}

// ✅ FIXED: Add enhanced reactions to moods
async function addMoodReactions(moods, users) {
  console.log(`❤️ Adding reactions to moods...`);
  let reactionCount = 0;

  for (const mood of moods) {
    if (mood.privacy !== 'private' && randomBool(0.6)) {
      const numReactions = randomInt(0, 8);
      const reactors = new Set();
      
      for (let i = 0; i < numReactions; i++) {
        const reactor = randomChoice(users);
        const reactorId = reactor._id.toString();
        
        if (!reactors.has(reactorId) && reactorId !== mood.userId.toString()) {
          reactors.add(reactorId);
          
          mood.reactions.push({
            userId: reactor._id,
            type: randomChoice(['comfort', 'support', 'love', 'understanding', 'strength', 'hope', 'relate', 'celebrate']),
            emoji: randomChoice(['❤️', '🤗', '💪', '🌟', '🙏', '💙', '🫂', '✨', '👏', '🔥']),
            createdAt: randomDate(mood.createdAt, new Date())
          });
          reactionCount++;
        }
      }
      
      await mood.save();
    }
  }

  console.log(`✅ Added ${reactionCount} reactions to moods!`);
}

// ✅ FIXED: Add enhanced reactions to vents
async function addVentReactions(vents) {
  console.log(`❤️ Adding enhanced reactions to vents...`);
  let reactionCount = 0;

  for (const vent of vents) {
    if (vent.privacy.allowReactions && randomBool(0.7)) {
      const numReactions = randomInt(1, 15);
      
      for (let i = 0; i < numReactions; i++) {
        const reactionType = randomChoice([
          'comfort', 'virtual_hug', 'listening', 'strength', 'hope',
          'relate', 'been_there', 'me_too', 'brave', 'resources_available'
        ]);
        
        const supportiveMessages = [
          "Sending you strength and virtual hugs ❤️",
          "You're not alone in this, I've been there too",
          "Thank you for sharing, you're incredibly brave",
          "I see you and I hear you 💙",
          "Thinking of you during this difficult time",
          ""
        ];
        
        vent.reactions.push({
          type: reactionType,
          anonymousId: `anon_${Date.now()}_${randomInt(1000, 9999)}`,
          message: randomBool(0.3) ? randomChoice(supportiveMessages) : '',
          timestamp: randomDate(vent.createdAt, new Date())
        });
        reactionCount++;
      }
      
      await vent.save();
    }
  }

  console.log(`✅ Added ${reactionCount} reactions to vents!`);
}

// ✅ FIXED: Add supportive replies to vents
async function addVentReplies(vents) {
  console.log(`💬 Adding supportive replies to vents...`);
  let replyCount = 0;

  const supportiveReplies = [
    {
      content: "I've been through something similar and want you to know that it does get better. It takes time, but you're stronger than you know.",
      type: 'shared_experience'
    },
    {
      content: "Have you considered talking to a counselor? Sometimes having a professional perspective can really help clarify things.",
      type: 'advice'
    },
    {
      content: "Your feelings are completely valid. What you're going through is real and it's okay to not be okay right now.",
      type: 'support'
    },
    {
      content: "I found meditation apps really helpful when I was dealing with anxiety. Also, the Crisis Text Line (text HOME to 741741) is available 24/7.",
      type: 'resources'
    },
    {
      content: "Sending you so much love and strength. You took a big step by sharing this, and that shows incredible courage.",
      type: 'encouragement'
    },
    {
      content: "I hear you and I see your pain. You deserve support and care. Please don't give up - there are people who want to help.",
      type: 'peer_support'
    }
  ];

  for (const vent of vents) {
    if (vent.privacy.allowReplies && randomBool(0.4)) {
      const numReplies = randomInt(1, 5);
      
      for (let i = 0; i < numReplies; i++) {
        const reply = randomChoice(supportiveReplies);
        
        vent.replies.push({
          content: reply.content,
          anonymousId: `supporter_${Date.now()}_${randomInt(1000, 9999)}`,
          replyType: reply.type,
          timestamp: randomDate(vent.createdAt, new Date()),
          isHelpful: randomInt(0, 5)
        });
        replyCount++;
      }
      
      // Mark as support provided if it got helpful replies
      if (vent.replies.length > 0) {
        vent.analytics.supportProvided = true;
        vent.analytics.helpfulnessScore = randomInt(3, 5);
      }
      
      await vent.save();
    }
  }

  console.log(`✅ Added ${replyCount} supportive replies to vents!`);
}

// ✅ FIXED: Create friendships with location-based preferences
async function createFriendships(users, count = 150) {
  console.log(`👫 Creating ${count} friendships...`);
  let friendshipCount = 0;
  
  // ✅ FIXED: Enhanced friendship creation based on location and interests
  const locationGroups = {};
  users.forEach(user => {
    const country = user.location?.country || 'Unknown';
    if (!locationGroups[country]) {
      locationGroups[country] = [];
    }
    locationGroups[country].push(user);
  });

  // Create more friendships within same countries (people connect locally)
  for (const group of Object.values(locationGroups)) {
    if (group.length > 1) {
      const localFriendships = Math.min(group.length * 2, 20);
      for (let i = 0; i < localFriendships; i++) {
        const user1 = group[Math.floor(Math.random() * group.length)];
        const user2 = group[Math.floor(Math.random() * group.length)];
        
        if (user1._id.toString() !== user2._id.toString()) {
          await createFriendship(user1, user2);
        }
      }
    }
  }

  // Create some international friendships (fewer but still meaningful)
  for (let i = 0; i < count * 0.2; i++) {
    const user1 = randomChoice(users);
    const user2 = randomChoice(users);
    
    if (user1._id.toString() !== user2._id.toString() && 
        user1.location?.country !== user2.location?.country) {
      await createFriendship(user1, user2);
    }
  }

  async function createFriendship(user1, user2) {
    try {
      // Check if friendship already exists
      const existingFriendship1 = user1.friends.find(
        f => f.userId.toString() === user2._id.toString()
      );
      const existingFriendship2 = user2.friends.find(
        f => f.userId.toString() === user1._id.toString()
      );
      
      if (!existingFriendship1 && !existingFriendship2 && friendshipCount < count) {
        const status = randomChoice(['accepted', 'accepted', 'accepted', 'pending']); // Mostly accepted
        
        // Add to user1's friends
        user1.friends.push({
          userId: user2._id,
          status: status,
          createdAt: randomDate(new Date(2024, 0, 1), new Date()),
          acceptedAt: status === 'accepted' ? randomDate(new Date(2024, 0, 1), new Date()) : null
        });

        // Add to user2's friends
        user2.friends.push({
          userId: user1._id,
          status: status,
          createdAt: randomDate(new Date(2024, 0, 1), new Date()),
          acceptedAt: status === 'accepted' ? randomDate(new Date(2024, 0, 1), new Date()) : null
        });

        // Update friend counts
        if (status === 'accepted') {
          user1.analytics.totalFriends = (user1.analytics.totalFriends || 0) + 1;
          user2.analytics.totalFriends = (user2.analytics.totalFriends || 0) + 1;
        }

        await user1.save();
        await user2.save();
        friendshipCount++;
        
        if (friendshipCount % 10 === 0) {
          console.log(`   ✅ Created ${friendshipCount} friendships`);
        }
      }
    } catch (error) {
      console.log(`   ⚠️ Skipped friendship: ${error.message}`);
    }
  }

  console.log(`✅ Created ${friendshipCount} friendships!`);
}

// ✅ FIXED: Add reactions to community posts
async function addPostReactions(posts, users) {
  console.log(`❤️ Adding reactions to community posts...`);
  let reactionCount = 0;

  for (const post of posts) {
    if (randomBool(0.7)) {
      const numReactions = randomInt(0, 15);
      const reactors = new Set();
      
      for (let i = 0; i < numReactions; i++) {
        const reactor = randomChoice(users);
        const reactorId = reactor._id.toString();
        
        if (!reactors.has(reactorId) && reactorId !== post.userId.toString()) {
          reactors.add(reactorId);
          
          post.reactions.push({
            userId: reactor._id,
            type: randomChoice(['comfort', 'support', 'love', 'celebrate', 'strength', 'hope']),
            emoji: randomChoice(['❤️', '🎉', '💪', '🌟', '🙏', '💙', '👏', '✨', '🔥', '🌈']),
            createdAt: randomDate(post.createdAt, new Date())
          });
          reactionCount++;
        }
      }
      
      await post.save();
    }
  }

  console.log(`✅ Added ${reactionCount} reactions to community posts!`);
}

// ✅ FIXED: Enhanced analytics update
async function updateUserAnalytics(users) {
  console.log(`📊 Updating user analytics...`);
  
  for (const user of users) {
    const userMoods = await Mood.find({ userId: user._id });
    const userPosts = await CommunityPost.find({ userId: user._id });
    
    // Calculate analytics
    const totalReactions = userMoods.reduce((sum, mood) => sum + mood.reactions.length, 0);
    const avgMoodIntensity = userMoods.length > 0 ? 
      userMoods.reduce((sum, mood) => sum + mood.intensity, 0) / userMoods.length : 0;
    
    user.analytics = {
      totalMoodsLogged: userMoods.length,
      totalPostsShared: userPosts.length,
      totalEmotionEntries: userMoods.length,
      totalReactionsReceived: totalReactions,
      avgMoodIntensity: Math.round(avgMoodIntensity * 100) / 100,
      currentStreak: randomInt(0, Math.min(userMoods.length, 15)),
      longestStreak: randomInt(0, Math.min(userMoods.length, 30)),
      lastLogDate: userMoods.length > 0 ? userMoods[userMoods.length - 1].createdAt : null,
      lastActiveAt: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date())
    };
    
    await user.save();
  }
  
  console.log(`✅ Updated analytics for ${users.length} users!`);
}

// ✅ FIXED: Main seeding function
async function seedDatabase() {
  try {
    console.log('🌱 Starting comprehensive enhanced database seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Mood.deleteMany({});
    await CommunityPost.deleteMany({});
    await Vent.deleteMany({});
    console.log('✅ Cleared all existing data\n');

    // Create enhanced data
    const users = await createUsers(60);
    const moods = await createMonthlyMoodsForUsers(users);
    await addMoodReactions(moods, users);
    
    await createFriendships(users, 200);
    
    const posts = await createCommunityPosts(users, 100);
    await addPostReactions(posts, users);
    
    const vents = await createVents(50);
    await addVentReactions(vents);
    await addVentReplies(vents);
    
    await updateUserAnalytics(users);

    // Final statistics
    const totalMoodReactions = await Mood.aggregate([
      { $project: { reactionCount: { $size: "$reactions" } } },
      { $group: { _id: null, total: { $sum: "$reactionCount" } } }
    ]);
    
    const totalVentReactions = await Vent.aggregate([
      { $project: { reactionCount: { $size: "$reactions" } } },
      { $group: { _id: null, total: { $sum: "$reactionCount" } } }
    ]);

    console.log('\n🎉 =====================================');
    console.log('🎉 ENHANCED DATABASE SEEDING COMPLETED!');
    console.log('🎉 =====================================');
    console.log(`👥 Users created: ${users.length}`);
    console.log(`😊 Enhanced moods: ${moods.length}`);
    console.log(`👫 Friendships: ${await User.countDocuments({ friends: { $exists: true, $ne: [] } })}`);
    console.log(`📝 Community posts: ${posts.length}`);
    console.log(`😤 Enhanced vents: ${vents.length}`);
    console.log(`❤️ Mood reactions: ${totalMoodReactions[0]?.total || 0}`);
    console.log(`💬 Vent reactions: ${totalVentReactions[0]?.total || 0}`);
    console.log(`🌍 Location-enabled users: ${users.filter(u => u.preferences?.shareLocation).length}`);
    console.log(`🚨 Crisis-level vents: ${await Vent.countDocuments({ 'urgency.level': 'crisis' })}`);
    console.log('\n🌟 Your Emora app now has comprehensive, location-aware, and supportive data!');
    console.log('🚀 Enhanced analytics, better matching, and crisis support ready!');

  } catch (error) {
    console.error('❌ Enhanced seeding failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

seedDatabase();