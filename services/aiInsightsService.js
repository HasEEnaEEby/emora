const { GoogleGenerativeAI } = require('@google/generative-ai');

class AIInsightsService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  /**
   * Generate comprehensive regional insights
   */
  async generateRegionalInsights(region, emotionData) {
    try {
      const prompt = this.buildRegionalInsightPrompt(region, emotionData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating regional insights:', error);
      return this.getFallbackInsight(region, emotionData);
    }
  }

  /**
   * Generate trend analysis
   */
  async generateTrendAnalysis(trendData) {
    try {
      const prompt = this.buildTrendAnalysisPrompt(trendData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating trend analysis:', error);
      return this.getFallbackTrendAnalysis(trendData);
    }
  }

  /**
   * Generate predictive insights
   */
  async generatePredictiveInsights(historicalData, predictions) {
    try {
      const prompt = this.buildPredictivePrompt(historicalData, predictions);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      return this.getFallbackPredictiveInsight(historicalData, predictions);
    }
  }

  /**
   * Generate comparative analysis between regions
   */
  async generateComparativeAnalysis(regionData) {
    try {
      const prompt = this.buildComparativePrompt(regionData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating comparative analysis:', error);
      return this.getFallbackComparativeAnalysis(regionData);
    }
  }

  /**
   * Generate emotional context analysis
   */
  async generateEmotionalContext(emotionData, contextData) {
    try {
      const prompt = this.buildEmotionalContextPrompt(emotionData, contextData);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating emotional context:', error);
      return this.getFallbackEmotionalContext(emotionData, contextData);
    }
  }

  /**
   * Build regional insight prompt
   */
  buildRegionalInsightPrompt(region, emotionData) {
    const {
      totalEmotions,
      avgIntensity,
      dominantEmotion,
      emotionBreakdown,
      recentTrend,
      timeRange
    } = emotionData;

    return `
You are an AI analyst specializing in global emotional intelligence. Analyze the following emotion data for ${region} and provide insights in a conversational, engaging tone.

Data Summary:
- Total emotions recorded: ${totalEmotions}
- Average intensity: ${avgIntensity}/5
- Dominant emotion: ${dominantEmotion}
- Time range: ${timeRange}

Emotion Breakdown:
${Object.entries(emotionBreakdown).map(([emotion, count]) => `- ${emotion}: ${count} occurrences`).join('\n')}

Recent Trend: ${recentTrend}

Please provide:
1. A brief overview of the emotional landscape in ${region}
2. Analysis of the dominant emotion and what it might indicate
3. Insights about the intensity levels and their significance
4. Potential factors influencing these emotions
5. A positive, constructive interpretation of the data

Keep the response under 200 words, engaging, and suitable for a general audience.
    `;
  }

  /**
   * Build trend analysis prompt
   */
  buildTrendAnalysisPrompt(trendData) {
    const { timeRange, trends, dominantEmotions, intensityChanges } = trendData;

    return `
You are analyzing emotional trend data over ${timeRange}. Provide insights about the emotional patterns and what they reveal.

Trend Data:
${trends.map(trend => `- ${trend.date}: ${trend.dominantEmotion} (${trend.avgIntensity}/5 intensity)`).join('\n')}

Key Changes:
- Dominant emotions: ${dominantEmotions.join(', ')}
- Intensity changes: ${intensityChanges}

Please provide:
1. Pattern analysis of emotional shifts
2. Potential causes for these trends
3. What these patterns might indicate about collective well-being
4. Suggestions for understanding these emotional dynamics

Keep the response under 150 words, insightful, and accessible.
    `;
  }

  /**
   * Build predictive analysis prompt
   */
  buildPredictivePrompt(historicalData, predictions) {
    return `
You are analyzing historical emotion data and future predictions. Provide insights about what the data suggests for emotional patterns.

Historical Data Summary:
- Total emotions: ${historicalData.totalEmotions}
- Average intensity: ${historicalData.avgIntensity}/5
- Dominant emotion: ${historicalData.dominantEmotion}

Predictions (next 24 hours):
${predictions.map(pred => `- ${pred.timestamp}: ${pred.predictedEmotion} (${pred.predictedIntensity}/5)`).join('\n')}

Please provide:
1. Analysis of the prediction patterns
2. Confidence level assessment
3. What these predictions might mean
4. How to interpret and use this information

Keep the response under 150 words, balanced, and informative.
    `;
  }

  /**
   * Build comparative analysis prompt
   */
  buildComparativePrompt(regionData) {
    const regions = Object.keys(regionData);
    
    return `
You are comparing emotional data across multiple regions. Provide insights about the differences and similarities.

Regional Data:
${regions.map(region => {
  const data = regionData[region];
  return `${region}:
- Total emotions: ${data.totalEmotions}
- Avg intensity: ${data.avgIntensity}/5
- Dominant emotion: ${data.dominantEmotion}`;
}).join('\n\n')}

Please provide:
1. Key differences between regions
2. Potential cultural or environmental factors
3. What these comparisons reveal
4. Insights about global emotional patterns

Keep the response under 200 words, comparative, and insightful.
    `;
  }

  /**
   * Build emotional context prompt
   */
  buildEmotionalContextPrompt(emotionData, contextData) {
    return `
You are analyzing emotional data in the context of current events and environmental factors. Provide insights about the relationship between emotions and context.

Emotion Data:
- Dominant emotion: ${emotionData.dominantEmotion}
- Average intensity: ${emotionData.avgIntensity}/5
- Total emotions: ${emotionData.totalEmotions}

Context Data:
${Object.entries(contextData).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

Please provide:
1. How context might influence emotions
2. Potential correlations between events and emotional responses
3. What this reveals about collective emotional intelligence
4. Insights for understanding emotional patterns

Keep the response under 150 words, contextual, and analytical.
    `;
  }

  /**
   * Fallback regional insight
   */
  getFallbackInsight(region, emotionData) {
    const { totalEmotions, avgIntensity, dominantEmotion } = emotionData;
    
    return `${region} shows ${totalEmotions} recorded emotions with an average intensity of ${avgIntensity}/5. The dominant emotion is ${dominantEmotion}, suggesting ${this.getEmotionContext(dominantEmotion, avgIntensity)}. This data reflects the collective emotional state of the region and provides valuable insights into community well-being.`;
  }

  /**
   * Fallback trend analysis
   */
  getFallbackTrendAnalysis(trendData) {
    return `Analysis of emotional trends shows ${trendData.dominantEmotions.join(' and ')} as the most common emotions. The intensity levels suggest ${trendData.intensityChanges > 0 ? 'increasing' : 'decreasing'} emotional engagement. These patterns provide valuable insights into collective emotional dynamics.`;
  }

  /**
   * Fallback predictive insight
   */
  getFallbackPredictiveInsight(historicalData, predictions) {
    return `Based on historical patterns, the predictions suggest continued ${historicalData.dominantEmotion} as the dominant emotion. The intensity levels are expected to remain around ${historicalData.avgIntensity}/5, indicating stable emotional patterns.`;
  }

  /**
   * Fallback comparative analysis
   */
  getFallbackComparativeAnalysis(regionData) {
    const regions = Object.keys(regionData);
    return `Comparing ${regions.length} regions reveals diverse emotional landscapes. Each region shows unique patterns in dominant emotions and intensity levels, reflecting the complex nature of global emotional intelligence.`;
  }

  /**
   * Fallback emotional context
   */
  getFallbackEmotionalContext(emotionData, contextData) {
    return `The emotional data shows ${emotionData.dominantEmotion} as dominant with ${emotionData.avgIntensity}/5 intensity. This pattern may be influenced by current events and environmental factors, reflecting the dynamic relationship between context and collective emotions.`;
  }

  /**
   * Get emotion context description
   */
  getEmotionContext(emotion, intensity) {
    const contexts = {
      joy: intensity >= 4 ? 'high levels of happiness and positive energy' : 'moderate contentment',
      trust: intensity >= 4 ? 'strong feelings of security and community' : 'general sense of safety',
      fear: intensity >= 4 ? 'heightened anxiety and concern' : 'mild apprehension',
      surprise: intensity >= 4 ? 'significant unexpected events or changes' : 'moderate curiosity',
      sadness: intensity >= 4 ? 'collective grief or disappointment' : 'melancholy mood',
      disgust: intensity >= 4 ? 'strong disapproval or aversion' : 'mild dissatisfaction',
      anger: intensity >= 4 ? 'frustration or collective outrage' : 'mild irritation',
      anticipation: intensity >= 4 ? 'excitement about future events' : 'moderate hopefulness'
    };
    
    return contexts[emotion] || 'mixed emotional states';
  }

  /**
   * Generate real-time insight for new emotion
   */
  async generateRealTimeInsight(emotionData) {
    try {
      const prompt = `
A new emotion has been recorded: ${emotionData.coreEmotion} with ${emotionData.intensity}/5 intensity in ${emotionData.city || 'unknown location'}.

Provide a brief, engaging insight about this emotion in the context of global emotional intelligence. Keep it under 50 words and make it feel personal and meaningful.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      return `A new ${emotionData.coreEmotion} emotion has been shared, contributing to our global emotional landscape.`;
    }
  }

  /**
   * Generate weekly emotional summary
   */
  async generateWeeklySummary(weeklyData) {
    try {
      const prompt = `
Generate a weekly emotional intelligence summary based on this data:

${JSON.stringify(weeklyData, null, 2)}

Provide:
1. Overall emotional climate
2. Notable trends
3. Key insights
4. Positive takeaways

Keep it under 300 words, engaging, and inspiring.
      `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      return this.getFallbackWeeklySummary(weeklyData);
    }
  }

  /**
   * Fallback weekly summary
   */
  getFallbackWeeklySummary(weeklyData) {
    const { totalEmotions, dominantEmotion, avgIntensity } = weeklyData;
    
    return `This week, ${totalEmotions} emotions were shared globally, with ${dominantEmotion} being the most common. The average intensity of ${avgIntensity}/5 suggests ${avgIntensity >= 3 ? 'moderate to high' : 'calm'} emotional engagement. This data reflects our collective emotional journey and the power of shared human experience.`;
  }
}

module.exports = AIInsightsService; 