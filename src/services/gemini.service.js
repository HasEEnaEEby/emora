import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyDqM0OLplcB5jvsH925n-5MLGMgTMxfVJE';

export async function callGeminiAI(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }]
  };
  const { data } = await axios.post(url, body, {
    headers: { 'Content-Type': 'application/json' }
  });
  // Extract summary from Gemini response
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available';
}

export async function getGeminiInsight(region, summaryData, totalEmotions, contextStats = {}, timeRange = '7d') {
  try {
    // Create a comprehensive prompt for the AI
    const prompt = createInsightPrompt(region, summaryData, totalEmotions, contextStats, timeRange);
    
    // Call Gemini AI
    const aiResponse = await callGeminiAI(prompt);
    
    return aiResponse;
  } catch (error) {
    console.error('Error getting Gemini insight:', error);
    return `Unable to generate AI insights for ${region} at this time. Please try again later.`;
  }
}

function createInsightPrompt(region, summaryData, totalEmotions, contextStats, timeRange) {
  const topEmotions = summaryData.slice(0, 5);
  const emotionBreakdown = topEmotions.map(stat => 
    `${stat.emotion}: ${stat.count} entries (${stat.percentage}%, avg intensity: ${stat.avgIntensity}/5)`
  ).join('\n');

  const contextInfo = Object.keys(contextStats).length > 0 ? 
    `\n\nContext Analysis:
Weather patterns: ${JSON.stringify(contextStats.weather || {})}
Time of day: ${JSON.stringify(contextStats.timeOfDay || {})}
Social context: ${JSON.stringify(contextStats.socialContext || {})}` : '';

  return `Analyze the emotional landscape of ${region} based on this real-time emotion data from the past ${timeRange}:

EMOTION SUMMARY (${totalEmotions} total entries):
${emotionBreakdown}

${contextInfo}

Please provide a concise, insightful analysis (2-3 sentences) about the emotional climate in ${region}. Consider:
1. What's the overall emotional tone?
2. Are there any notable patterns or trends?
3. What might be influencing these emotions?
4. Any insights for understanding the local emotional landscape?

Keep the tone friendly and informative, like a local emotional weather report. Focus on being helpful and insightful.`;
} 