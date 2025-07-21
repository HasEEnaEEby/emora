// src/utils/geminiPromptGenerator.js - Intelligent Prompt Generation for Gemini
import { PLUTCHIK_CORE_EMOTIONS } from '../constants/emotion-mappings.js';

export const generateGeminiPrompt = (region, summaryData, totalEmotions, contextStats = {}, timeRange = '7d') => {
  const emotionList = summaryData.map(e => 
    `- ${e.emotion}: ${e.count} entries (${e.percentage}%) with avg intensity ${e.avgIntensity}/5`
  ).join('\n');

  const contextInfo = generateContextInfo(contextStats);
  const timeRangeText = getTimeRangeText(timeRange);

  return `You are an emotional intelligence AI analyzing global emotional patterns. Your role is to provide insightful, empathetic analysis of collective emotions.

**DATA ANALYSIS REQUEST:**

Region: ${region}
Time Range: ${timeRangeText}
Total Emotion Entries: ${totalEmotions}

**EMOTION BREAKDOWN:**
${emotionList}

${contextInfo}

**ANALYSIS TASKS:**

1. **Emotional Climate Summary**: Provide a 2-3 sentence overview of the dominant emotional state in this region.

2. **Contextual Factors**: Based on the data patterns, suggest possible environmental, social, or seasonal factors that might be influencing these emotions.

3. **Emotional Shifts**: Identify any notable patterns or anomalies in the emotional data.

4. **Collective Well-being**: What might this emotional data indicate about the collective well-being of people in this region?

5. **Supportive Insights**: Offer 1-2 gentle, supportive observations about what this emotional landscape might mean for individuals in the region.

**RESPONSE GUIDELINES:**
- Keep the tone calm, observant, and empathetic
- Focus on patterns rather than individual emotions
- Avoid making definitive medical or psychological claims
- Use inclusive language that acknowledges the diversity of human experience
- Keep the response under 200 words
- Structure as a natural, flowing analysis rather than bullet points

Please provide your analysis:`;
};

const generateContextInfo = (contextStats) => {
  if (!contextStats || Object.keys(contextStats).length === 0) {
    return '';
  }

  let contextInfo = '\n**CONTEXTUAL DATA:**\n';
  
  if (contextStats.weather && Object.keys(contextStats.weather).length > 0) {
    const weatherData = Object.entries(contextStats.weather)
      .map(([weather, count]) => `${weather}: ${count} entries`)
      .join(', ');
    contextInfo += `Weather patterns: ${weatherData}\n`;
  }
  
  if (contextStats.timeOfDay && Object.keys(contextStats.timeOfDay).length > 0) {
    const timeData = Object.entries(contextStats.timeOfDay)
      .map(([time, count]) => `${time}: ${count} entries`)
      .join(', ');
    contextInfo += `Time of day patterns: ${timeData}\n`;
  }
  
  if (contextStats.socialContext && Object.keys(contextStats.socialContext).length > 0) {
    const socialData = Object.entries(contextStats.socialContext)
      .map(([context, count]) => `${context}: ${count} entries`)
      .join(', ');
    contextInfo += `Social context: ${socialData}\n`;
  }
  
  return contextInfo;
};

const getTimeRangeText = (timeRange) => {
  switch (timeRange) {
    case '24h':
      return 'Past 24 hours';
    case '7d':
      return 'Past 7 days';
    case '30d':
      return 'Past 30 days';
    default:
      return 'Recent period';
  }
};

export const generateTrendAnalysisPrompt = (region, trends, emotion) => {
  const trendData = trends.map(t => 
    `${t.date}: ${t.count} ${emotion} emotions (avg intensity: ${t.avgIntensity}/5)`
  ).join('\n');

  return `Analyze the emotional trend data for ${region}:

**TREND DATA:**
${trendData}

**ANALYSIS REQUEST:**
1. Identify any patterns or cycles in the emotional data
2. Note any significant spikes or drops in emotion frequency
3. Consider what external factors might explain these patterns
4. Provide a brief forecast for the next few days

Keep the analysis concise and focused on emotional patterns.`;
};

export const generateComparativePrompt = (region1, data1, region2, data2, timeRange) => {
  return `Compare the emotional landscapes of two regions:

**${region1} (${timeRange}):**
${formatSummaryData(data1)}

**${region2} (${timeRange}):**
${formatSummaryData(data2)}

**COMPARATIVE ANALYSIS:**
1. What are the key differences in emotional patterns between these regions?
2. What might explain these differences (cultural, environmental, social factors)?
3. What insights can we draw about regional emotional diversity?
4. How might these patterns influence cross-regional understanding?

Provide a balanced, insightful comparison.`;
};

const formatSummaryData = (summaryData) => {
  if (!summaryData || summaryData.length === 0) {
    return 'No data available';
  }
  
  return summaryData.map(e => 
    `- ${e.emotion}: ${e.count} entries (${e.percentage}%)`
  ).join('\n');
};

export const generateWellnessPrompt = (emotionData, context) => {
  const { coreEmotion, intensity, count } = emotionData;
  
  return `Analyze this emotional wellness data:

**EMOTION PROFILE:**
- Primary emotion: ${coreEmotion}
- Intensity level: ${intensity}/5
- Frequency: ${count} entries
- Context: ${JSON.stringify(context, null, 2)}

**WELLNESS ANALYSIS REQUEST:**
1. What does this emotional pattern suggest about collective well-being?
2. Are there any concerning trends or positive indicators?
3. What supportive resources or practices might be beneficial?
4. How can this data inform community support initiatives?

Provide a compassionate, wellness-focused analysis.`;
}; 