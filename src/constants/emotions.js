export const CORE_EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'disgust'];

// Extended emotion vocabulary
export const EMOTION_NAMES = [
  // Joy family
  'happy', 'joyful', 'excited', 'cheerful', 'delighted', 'ecstatic', 'elated', 'euphoric',
  'glad', 'pleased', 'content', 'satisfied', 'blissful', 'overjoyed', 'thrilled',
  
  // Sadness family
  'sad', 'depressed', 'melancholy', 'gloomy', 'dejected', 'despondent', 'sorrowful',
  'mournful', 'blue', 'down', 'miserable', 'heartbroken', 'grief-stricken',
  
  // Anger family
  'angry', 'furious', 'mad', 'irritated', 'annoyed', 'frustrated', 'enraged',
  'livid', 'irate', 'outraged', 'indignant', 'resentful', 'aggravated',
  
  // Fear family
  'scared', 'afraid', 'fearful', 'anxious', 'worried', 'nervous', 'terrified',
  'panicked', 'alarmed', 'apprehensive', 'uneasy', 'stressed', 'overwhelmed',
  
  // Disgust family
  'disgusted', 'revolted', 'repulsed', 'sickened', 'nauseated', 'appalled',
  'horrified', 'disturbed', 'offended', 'contemptuous',
  
  // Mixed/Complex emotions
  'confused', 'surprised', 'shocked', 'amazed', 'curious', 'hopeful', 'grateful',
  'proud', 'embarrassed', 'guilty', 'ashamed', 'jealous', 'envious', 'lonely',
  'bored', 'tired', 'energetic', 'calm', 'peaceful', 'relaxed', 'motivated',
  'inspired', 'confident', 'insecure', 'vulnerable', 'nostalgic'
];

// Emotion to core emotion mapping
export const EMOTION_MAPPINGS = {
  // Joy mappings
  'happy': 'joy',
  'joyful': 'joy',
  'excited': 'joy',
  'cheerful': 'joy',
  'delighted': 'joy',
  'ecstatic': 'joy',
  'elated': 'joy',
  'euphoric': 'joy',
  'glad': 'joy',
  'pleased': 'joy',
  'content': 'joy',
  'satisfied': 'joy',
  'blissful': 'joy',
  'overjoyed': 'joy',
  'thrilled': 'joy',
  'grateful': 'joy',
  'proud': 'joy',
  'confident': 'joy',
  'inspired': 'joy',
  'motivated': 'joy',
  'energetic': 'joy',
  'hopeful': 'joy',
  
  // Sadness mappings
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
  'insecure': 'sadness',
  'vulnerable': 'sadness',
  
  // Anger mappings
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
  
  // Fear mappings
  'scared': 'fear',
  'afraid': 'fear',
  'fearful': 'fear',
  'anxious': 'fear',
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
  
  // Disgust mappings
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
  
  // Neutral/other emotions (default to joy for positive experience)
  'surprised': 'joy',
  'amazed': 'joy',
  'curious': 'joy',
  'bored': 'sadness',
  'tired': 'sadness',
  'calm': 'joy',
  'peaceful': 'joy',
  'relaxed': 'joy'
};

// Color mappings for core emotions (Inside Out style)
export const CORE_EMOTION_COLORS = {
  'joy': '#F59E0B',      // Yellow/Gold
  'sadness': '#3B82F6',  // Blue
  'anger': '#EF4444',    // Red
  'fear': '#8B5CF6',     // Purple
  'disgust': '#10B981'   // Green
};

// Color mappings for specific emotions
export const EMOTION_COLORS = {
  // Joy family - Yellow/Orange tones
  'happy': '#F59E0B',
  'joyful': '#F97316',
  'excited': '#FB923C',
  'cheerful': '#FCD34D',
  'delighted': '#FDE047',
  'content': '#FACC15',
  'grateful': '#EAB308',
  'proud': '#D97706',
  
  // Sadness family - Blue tones
  'sad': '#3B82F6',
  'depressed': '#1E40AF',
  'melancholy': '#1D4ED8',
  'lonely': '#2563EB',
  'heartbroken': '#1E3A8A',
  'nostalgic': '#3730A3',
  
  // Anger family - Red tones
  'angry': '#EF4444',
  'furious': '#DC2626',
  'frustrated': '#F87171',
  'annoyed': '#FCA5A5',
  'irritated': '#FEE2E2',
  
  // Fear family - Purple tones
  'scared': '#8B5CF6',
  'anxious': '#7C3AED',
  'worried': '#A78BFA',
  'nervous': '#C4B5FD',
  'stressed': '#6D28D9',
  'overwhelmed': '#5B21B6',
  
  // Disgust family - Green tones
  'disgusted': '#10B981',
  'revolted': '#059669',
  'appalled': '#047857',
  'offended': '#065F46'
};

// Emoji mappings for emotions
export const EMOTION_EMOJIS = {
  // Joy family
  'joy': '😊',
  'happy': '😊',
  'joyful': '😄',
  'excited': '🤩',
  'cheerful': '😁',
  'delighted': '😃',
  'ecstatic': '🥳',
  'thrilled': '🎉',
  'grateful': '🙏',
  'proud': '😌',
  'confident': '😎',
  
  // Sadness family
  'sadness': '😢',
  'sad': '😢',
  'depressed': '😞',
  'melancholy': '😔',
  'lonely': '😕',
  'heartbroken': '💔',
  'nostalgic': '🥺',
  
  // Anger family
  'anger': '😠',
  'angry': '😠',
  'furious': '😡',
  'frustrated': '😤',
  'annoyed': '😒',
  'irritated': '🙄',
  
  // Fear family
  'fear': '😨',
  'scared': '😱',
  'anxious': '😰',
  'worried': '😟',
  'nervous': '😬',
  'stressed': '😩',
  'overwhelmed': '🤯',
  
  // Disgust family
  'disgust': '🤢',
  'disgusted': '🤢',
  'revolted': '🤮',
  'appalled': '😤',
  
  // Other emotions
  'surprised': '😲',
  'confused': '😕',
  'curious': '🤔',
  'bored': '😴',
  'calm': '😌',
  'peaceful': '🧘‍♀️'
};

// Inside Out character mappings
export const EMOTION_CHARACTERS = {
  'joy': {
    name: 'Joy',
    description: 'Optimistic and energetic',
    color: '#F59E0B'
  },
  'sadness': {
    name: 'Sadness',
    description: 'Thoughtful and empathetic',
    color: '#3B82F6'
  },
  'anger': {
    name: 'Anger',
    description: 'Passionate about fairness',
    color: '#EF4444'
  },
  'fear': {
    name: 'Fear',
    description: 'Protective and cautious',
    color: '#8B5CF6'
  },
  'disgust': {
    name: 'Disgust',
    description: 'Maintains high standards',
    color: '#10B981'
  }
};

/**
 * Get the core emotion for a given emotion
 * @param {string} emotion - The specific emotion
 * @returns {string} The core emotion category
 */
export const getCoreEmotion = (emotion) => {
  return EMOTION_MAPPINGS[emotion.toLowerCase()] || 'joy';
};

/**
 * Get the color for a specific emotion
 * @param {string} emotion - The emotion name
 * @returns {string} Hex color code
 */
export const getEmotionColor = (emotion) => {
  return EMOTION_COLORS[emotion.toLowerCase()] || '#6B7280';
};

/**
 * Get the color for a core emotion
 * @param {string} coreEmotion - The core emotion
 * @returns {string} Hex color code
 */
export const getCoreEmotionColor = (coreEmotion) => {
  return CORE_EMOTION_COLORS[coreEmotion.toLowerCase()] || '#6B7280';
};

/**
 * Get the emoji for an emotion
 * @param {string} emotion - The emotion name
 * @returns {string} Emoji character
 */
export const getEmotionEmoji = (emotion) => {
  return EMOTION_EMOJIS[emotion.toLowerCase()] || '😐';
};

/**
 * Get the Inside Out character for a core emotion
 * @param {string} coreEmotion - The core emotion
 * @returns {object} Character information
 */
export const getEmotionCharacter = (coreEmotion) => {
  return EMOTION_CHARACTERS[coreEmotion.toLowerCase()] || EMOTION_CHARACTERS['joy'];
};

/**
 * Get emotion by category
 * @param {string} category - The core emotion category
 * @returns {array} Array of emotions in that category
 */
export const getEmotionsByCategory = (category) => {
  return Object.entries(EMOTION_MAPPINGS)
    .filter(([emotion, coreEmotion]) => coreEmotion === category)
    .map(([emotion]) => emotion);
};

/**
 * Validate if an emotion is supported
 * @param {string} emotion - The emotion to validate
 * @returns {boolean} True if emotion is supported
 */
export const isValidEmotion = (emotion) => {
  return EMOTION_NAMES.includes(emotion.toLowerCase());
};

/**
 * Get a random emotion from a category
 * @param {string} category - The core emotion category
 * @returns {string} Random emotion from that category
 */
export const getRandomEmotionFromCategory = (category) => {
  const emotions = getEmotionsByCategory(category);
  return emotions[Math.floor(Math.random() * emotions.length)];
};

/**
 * Get emotion statistics
 * @returns {object} Statistics about available emotions
 */
export const getEmotionStatistics = () => {
  const categoryStats = {};
  
  CORE_EMOTIONS.forEach(category => {
    categoryStats[category] = getEmotionsByCategory(category).length;
  });
  
  return {
    totalEmotions: EMOTION_NAMES.length,
    coreEmotions: CORE_EMOTIONS.length,
    categoryBreakdown: categoryStats,
    mostPopularCategory: Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)[0][0]
  };
};

export default {
  EMOTION_NAMES,
  CORE_EMOTIONS,
  EMOTION_MAPPINGS,
  CORE_EMOTION_COLORS,
  EMOTION_COLORS,
  EMOTION_EMOJIS,
  EMOTION_CHARACTERS,
  getCoreEmotion,
  getEmotionColor,
  getCoreEmotionColor,
  getEmotionEmoji,
  getEmotionCharacter,
  getEmotionsByCategory,
  isValidEmotion,
  getRandomEmotionFromCategory,
  getEmotionStatistics
};