// src/services/geminiService.js - AI-Powered Emotion Insights with Gemini
import axios from 'axios';
import { generateGeminiPrompt } from '../utils/geminiPromptGenerator.js';

export const getGeminiInsight = async (region, summaryData, totalEmotions, contextStats = {}, timeRange = '7d') => {
  try {
    // Check if Gemini API key is configured
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn('Gemini API key not configured, returning fallback insight');
      return generateFallbackInsight(region, summaryData, totalEmotions, timeRange);
    }

    // Generate the prompt for Gemini
    const prompt = generateGeminiPrompt(region, summaryData, totalEmotions, contextStats, timeRange);

    // Call Gemini API
    const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 500,
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${geminiApiKey}`
      },
      timeout: 10000 // 10 second timeout
    });

    // Extract the response text
    const insight = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!insight) {
      throw new Error('No valid response from Gemini API');
    }

    return insight.trim();

  } catch (error) {
    console.error('Error calling Gemini API:', error.message);
    
    // Return fallback insight if Gemini fails
    return generateFallbackInsight(region, summaryData, totalEmotions, timeRange);
  }
};

const generateFallbackInsight = (region, summaryData, totalEmotions, timeRange) => {
  if (!summaryData || summaryData.length === 0) {
    return `No emotion data available for ${region} in the past ${timeRange}.`;
  }

  const topEmotions = summaryData.slice(0, 3);
  const dominantEmotion = topEmotions[0];
  
  let insight = `In the past ${timeRange}, ${region} showed ${totalEmotions} emotion entries. `;
  insight += `The most dominant emotion was ${dominantEmotion.emotion} (${dominantEmotion.percentage}%) `;
  insight += `with an average intensity of ${dominantEmotion.avgIntensity}/5. `;
  
  if (topEmotions.length > 1) {
    insight += `Other notable emotions include ${topEmotions[1].emotion} (${topEmotions[1].percentage}%) `;
    if (topEmotions.length > 2) {
      insight += `and ${topEmotions[2].emotion} (${topEmotions[2].percentage}%). `;
    }
  }
  
  insight += `This data represents the collective emotional pulse of the region during this time period.`;
  
  return insight;
};

export const getGeminiPrediction = async (region, historicalData, timeRange = '7d') => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return generateFallbackPrediction(region, historicalData, timeRange);
    }

    const prompt = `Based on the following historical emotion data for ${region} over the past ${timeRange}:

${JSON.stringify(historicalData, null, 2)}

Please provide a brief prediction for the next 24-48 hours regarding:
1. Expected emotional trends
2. Potential factors that might influence emotions
3. Any notable patterns or anomalies

Keep the response concise and focused on emotional forecasting.`;

    const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 300,
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${geminiApiKey}`
      },
      timeout: 10000
    });

    const prediction = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return prediction ? prediction.trim() : generateFallbackPrediction(region, historicalData, timeRange);

  } catch (error) {
    console.error('Error generating prediction:', error.message);
    return generateFallbackPrediction(region, historicalData, timeRange);
  }
};

const generateFallbackPrediction = (region, historicalData, timeRange) => {
  return `Based on recent emotion patterns in ${region}, we expect continued emotional diversity in the coming days. The data shows ${historicalData.length} entries over the past ${timeRange}, indicating active emotional engagement in the region.`;
};

export const getGeminiContextualInsight = async (emotionData, context) => {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return generateFallbackContextualInsight(emotionData, context);
    }

    const prompt = `Analyze this emotion data in context:

Emotion: ${emotionData.coreEmotion}
Intensity: ${emotionData.intensity}/5
Context: ${JSON.stringify(context, null, 2)}

Provide a brief, empathetic insight about this emotional state and potential supportive responses.`;

    const response = await axios.post('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 200,
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${geminiApiKey}`
      },
      timeout: 8000
    });

    const insight = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return insight ? insight.trim() : generateFallbackContextualInsight(emotionData, context);

  } catch (error) {
    console.error('Error generating contextual insight:', error.message);
    return generateFallbackContextualInsight(emotionData, context);
  }
};

const generateFallbackContextualInsight = (emotionData, context) => {
  const intensity = emotionData.intensity;
  const emotion = emotionData.coreEmotion;
  
  if (intensity >= 4) {
    return `This is a strong ${emotion} experience. Consider reaching out to friends or taking time for self-care.`;
  } else if (intensity >= 3) {
    return `You're experiencing moderate ${emotion}. This is a normal part of emotional life.`;
  } else {
    return `You're feeling a gentle ${emotion}. This can be a good time for reflection.`;
  }
}; 