// src/constants/emotion-mappings.js - Plutchik's 8 Core Emotions Mapping
import { EMOTION_MAPPINGS } from './emotions.js';

// Plutchik's 8 Core Emotions (Wheel of Emotions)
export const PLUTCHIK_CORE_EMOTIONS = [
  'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation'
];

// Enhanced mapping to Plutchik's 8 core emotions
export const PLUTCHIK_EMOTION_MAPPINGS = {
  // Joy family
  'joy': 'joy',
  'happiness': 'joy',
  'excitement': 'joy',
  'contentment': 'joy',
  'bliss': 'joy',
  'delighted': 'joy',
  'ecstatic': 'joy',
  'elated': 'joy',
  'euphoric': 'joy',
  'glad': 'joy',
  'pleased': 'joy',
  'satisfied': 'joy',
  'overjoyed': 'joy',
  'thrilled': 'joy',
  'grateful': 'joy',
  'proud': 'joy',
  'confident': 'joy',
  'inspired': 'joy',
  'motivated': 'joy',
  'energetic': 'joy',
  'hopeful': 'joy',
  'enthusiastic': 'joy',
  'serenity': 'joy',
  
  // Trust family
  'trust': 'trust',
  'love': 'trust',
  'acceptance': 'trust',
  'admiration': 'trust',
  'appreciation': 'trust',
  'devotion': 'trust',
  'reverence': 'trust',
  'openness': 'trust',
  'vulnerable': 'trust', // In a positive context
  'connected': 'trust',
  'supported': 'trust',
  'understood': 'trust',
  
  // Fear family
  'fear': 'fear',
  'anxiety': 'fear',
  'panic': 'fear',
  'scared': 'fear',
  'afraid': 'fear',
  'fearful': 'fear',
  'worried': 'fear',
  'nervous': 'fear',
  'terrified': 'fear',
  'panicked': 'fear',
  'alarmed': 'fear',
  'apprehensive': 'fear',
  'uneasy': 'fear',
  'stressed': 'fear',
  'overwhelmed': 'fear',
  'confused': 'fear',
  'shocked': 'fear',
  'vulnerable': 'fear', // In a negative context
  'insecure': 'fear',
  
  // Surprise family
  'surprise': 'surprise',
  'surprised': 'surprise',
  'amazed': 'surprise',
  'astonished': 'surprise',
  'stunned': 'surprise',
  'bewildered': 'surprise',
  'perplexed': 'surprise',
  'curious': 'surprise',
  'wonder': 'surprise',
  'awe': 'surprise',
  'shocked': 'surprise',
  
  // Sadness family
  'sadness': 'sadness',
  'sad': 'sadness',
  'depressed': 'sadness',
  'melancholy': 'sadness',
  'gloomy': 'sadness',
  'dejected': 'sadness',
  'despondent': 'sadness',
  'sorrowful': 'sadness',
  'mournful': 'sadness',
  'blue': 'sadness',
  'down': 'sadness',
  'miserable': 'sadness',
  'heartbroken': 'sadness',
  'grief-stricken': 'sadness',
  'lonely': 'sadness',
  'nostalgic': 'sadness',
  'guilty': 'sadness',
  'ashamed': 'sadness',
  'disappointed': 'sadness',
  'regret': 'sadness',
  'hopeless': 'sadness',
  'despair': 'sadness',
  
  // Disgust family
  'disgust': 'disgust',
  'disgusted': 'disgust',
  'revolted': 'disgust',
  'repulsed': 'disgust',
  'sickened': 'disgust',
  'nauseated': 'disgust',
  'appalled': 'disgust',
  'horrified': 'disgust',
  'disturbed': 'disgust',
  'offended': 'disgust',
  'contemptuous': 'disgust',
  'embarrassed': 'disgust',
  'hate': 'disgust',
  
  // Anger family
  'anger': 'anger',
  'angry': 'anger',
  'furious': 'anger',
  'mad': 'anger',
  'irritated': 'anger',
  'annoyed': 'anger',
  'frustrated': 'anger',
  'enraged': 'anger',
  'livid': 'anger',
  'irate': 'anger',
  'outraged': 'anger',
  'indignant': 'anger',
  'resentful': 'anger',
  'aggravated': 'anger',
  'jealous': 'anger',
  'envious': 'anger',
  'rage': 'anger',
  'hate': 'anger',
  
  // Anticipation family
  'anticipation': 'anticipation',
  'hope': 'anticipation',
  'optimistic': 'anticipation',
  'eager': 'anticipation',
  'excited': 'anticipation', // Can be both joy and anticipation
  'enthusiastic': 'anticipation',
  'motivated': 'anticipation',
  'inspired': 'anticipation',
  'focused': 'anticipation',
  'determined': 'anticipation',
  'ambitious': 'anticipation',
  'confident': 'anticipation', // Can be both joy and anticipation
  
  // Neutral emotions (default to joy for positive experience)
  'calm': 'joy',
  'peaceful': 'joy',
  'relaxed': 'joy',
  'balanced': 'joy',
  'neutral': 'joy',
  'thoughtful': 'joy',
  'contemplative': 'joy',
  'reflective': 'joy',
  'alert': 'joy',
  'indifferent': 'sadness',
  'bored': 'sadness',
  'tired': 'sadness'
};

// Map any emotion to Plutchik's 8 core emotions
export const mapToPlutchikCoreEmotion = (emotion) => {
  if (!emotion) return 'joy'; // Default to joy instead of neutral
  
  const normalizedEmotion = emotion.toLowerCase().trim();
  
  // Check our specific Plutchik mappings
  if (PLUTCHIK_EMOTION_MAPPINGS[normalizedEmotion]) {
    return PLUTCHIK_EMOTION_MAPPINGS[normalizedEmotion];
  }
  
  // Enhanced fallback mapping for common emotions
  const fallbackMappings = {
    'gratitude': 'joy',
    'love': 'trust', 
    'calm': 'joy',
    'peaceful': 'joy',
    'neutral': 'joy',
    'focused': 'anticipation',
    'curious': 'surprise',
    'thoughtful': 'surprise',
    'contemplative': 'surprise',
    'reflective': 'surprise',
    'alert': 'surprise',
    'balanced': 'joy',
    'indifferent': 'sadness',
    'confused': 'surprise',
    'surprised': 'surprise',
    'amused': 'joy',
    'bored': 'sadness',
    'tired': 'sadness',
    'energetic': 'joy'
  };
  
  if (fallbackMappings[normalizedEmotion]) {
    return fallbackMappings[normalizedEmotion];
  }
  
  // If not found, return joy as default
  return 'joy';
};

// Get color for Plutchik core emotions
export const PLUTCHIK_CORE_COLORS = {
  'joy': '#F59E0B',        // Yellow/Gold
  'trust': '#10B981',       // Green
  'fear': '#8B5CF6',        // Purple
  'surprise': '#F97316',    // Orange
  'sadness': '#3B82F6',     // Blue
  'disgust': '#059669',     // Dark Green
  'anger': '#EF4444',       // Red
  'anticipation': '#FCD34D' // Light Yellow
};

// Get emoji for Plutchik core emotions
export const PLUTCHIK_CORE_EMOJIS = {
  'joy': '😊',
  'trust': '🤝',
  'fear': '😨',
  'surprise': '😲',
  'sadness': '😢',
  'disgust': '🤢',
  'anger': '😠',
  'anticipation': '🤔'
};

// Get character for Plutchik core emotions (for UI)
export const PLUTCHIK_CORE_CHARACTERS = {
  'joy': 'Joy',
  'trust': 'Trust',
  'fear': 'Fear',
  'surprise': 'Surprise',
  'sadness': 'Sadness',
  'disgust': 'Disgust',
  'anger': 'Anger',
  'anticipation': 'Anticipation'
};

// Utility functions
export const getPlutchikCoreEmotion = (emotion) => {
  return mapToPlutchikCoreEmotion(emotion);
};

export const getPlutchikCoreColor = (coreEmotion) => {
  return PLUTCHIK_CORE_COLORS[coreEmotion] || '#6B7280';
};

export const getPlutchikCoreEmoji = (coreEmotion) => {
  return PLUTCHIK_CORE_EMOJIS[coreEmotion] || '😐';
};

export const getPlutchikCoreCharacter = (coreEmotion) => {
  return PLUTCHIK_CORE_CHARACTERS[coreEmotion] || 'Neutral';
};

export const isValidPlutchikCoreEmotion = (emotion) => {
  return PLUTCHIK_CORE_EMOTIONS.includes(emotion);
};

// Get emotions by Plutchik core category
export const getEmotionsByPlutchikCore = (coreEmotion) => {
  return Object.entries(PLUTCHIK_EMOTION_MAPPINGS)
    .filter(([_, core]) => core === coreEmotion)
    .map(([emotion, _]) => emotion);
};
