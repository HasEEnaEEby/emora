export const EMOTIONS = {
  HAPPY: { 
    id: 'happy', 
    color: '#4CAF50', 
    label: 'Happy',
    category: 'positive',
    intensity: [1, 2, 3, 4, 5] 
  },
  SAD: { 
    id: 'sad', 
    color: '#2196F3', 
    label: 'Sad',
    category: 'negative',
    intensity: [1, 2, 3, 4, 5] 
  },
  ANGRY: { 
    id: 'angry', 
    color: '#F44336', 
    label: 'Angry',
    category: 'negative',
    intensity: [1, 2, 3, 4, 5] 
  },
  ANXIOUS: { 
    id: 'anxious', 
    color: '#FF9800', 
    label: 'Anxious',
    category: 'negative',
    intensity: [1, 2, 3, 4, 5] 
  },
  CALM: { 
    id: 'calm', 
    color: '#9C27B0', 
    label: 'Calm',
    category: 'positive',
    intensity: [1, 2, 3, 4, 5] 
  },
  EXCITED: { 
    id: 'excited', 
    color: '#FFEB3B', 
    label: 'Excited',
    category: 'positive',
    intensity: [1, 2, 3, 4, 5] 
  },
  BORED: { 
    id: 'bored', 
    color: '#607D8B', 
    label: 'Bored',
    category: 'neutral',
    intensity: [1, 2, 3, 4, 5] 
  }
};

export const EMOTION_CATEGORIES = {
  POSITIVE: ['happy', 'excited', 'calm'],
  NEGATIVE: ['sad', 'angry', 'anxious'],
  NEUTRAL: ['bored']
};

export const EMOTION_NAMES = Object.values(EMOTIONS).map(emotion => emotion.id);

export const getEmotionColor = (emotionId) => {
  const emotion = Object.values(EMOTIONS).find(e => e.id === emotionId);
  return emotion ? emotion.color : '#666666';
};

export const getEmotionCategory = (emotionId) => {
  for (const [category, emotions] of Object.entries(EMOTION_CATEGORIES)) {
    if (emotions.includes(emotionId)) {
      return category.toLowerCase();
    }
  }
  return 'neutral';
};