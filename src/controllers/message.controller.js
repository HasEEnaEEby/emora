import { getEmotionLogsForRegion } from '../services/emotion.service.js';
import { getGeminiInsight } from '../services/gemini.service.js';
import logger from '../utils/logger.js';
import { createErrorResponse, createResponse } from '../utils/response.js';
import Emotion from '../models/emotion.model.js';

class InsightController {
  // GET /api/insight/:region
  async getRegionalInsight(req, res) {
    const { region } = req.params;
    try {
      logger.info(`🤖 Generating AI insights for region: ${region}`);
      
      // 1. Fetch recent emotion logs for the region
      const logs = await getEmotionLogsForRegion(region);
      
      if (logs.length === 0) {
        logger.info(`📊 No emotion data found for ${region}`);
        return res.json(createResponse(
          `No recent emotion data available for ${region}`,
          { 
            region, 
            summary: `No recent emotion data available for ${region}. This could mean the area is quiet or users haven't logged emotions recently.`,
            dataCount: 0,
            timeframe: '24h'
          }
        ));
      }

      // 2. Analyze the data locally first
      const analysis = this.analyzeRegionalData(logs, region);
      
      // 3. Create a comprehensive prompt for Gemini
      const prompt = this.createGeminiPrompt(logs, region, analysis);
      
      // 4. Call Gemini AI
      const aiSummary = await getGeminiInsight(region, logs, logs.length, {}, '24h');
      
      // 5. Combine local analysis with AI insights
      const insights = {
        region,
        summary: aiSummary,
        analysis: analysis,
        dataCount: logs.length,
        timeframe: '24h',
        generatedAt: new Date().toISOString()
      };

      logger.info(`✅ AI insights generated for ${region}: ${logs.length} data points`);
      
      res.json(createResponse(
        `AI insights for ${region} generated successfully`,
        insights
      ));
      
    } catch (e) {
      logger.error('Error generating regional insight:', e);
      res.status(500).json(createErrorResponse(
        'Failed to generate regional insight',
        e.message
      ));
    }
  }

  // GET /api/map/insights - Get AI-powered region insights
  async getRegionInsights(req, res) {
    let { region, timeRange = '7d' } = req.query;
    
    // ✅ CRITICAL: Validate and clean input
    if (!region) {
      return res.status(400).json({ 
        success: false, 
        message: 'Region parameter is required' 
      });
    }

    // ✅ ENSURE IT'S A STRING
    region = String(region).trim();
    
    if (region.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Region parameter cannot be empty'
      });
    }

    try {
      console.log(`🔍 Searching for region: "${region}" (type: ${typeof region})`);
      
      // Calculate date range
      const now = new Date();
      let fromDate;
      switch (timeRange) {
        case '24h':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // ✅ SAFE MONGODB QUERY - using string literals for regex
      const emotions = await Emotion.find({
        $or: [
          { 'location.country': { $regex: region, $options: 'i' } },
          { 'location.city': { $regex: region, $options: 'i' } },
          { 'location.region': { $regex: region, $options: 'i' } }
        ],
        privacy: 'public',
        createdAt: { $gte: fromDate }
      }).lean();

      console.log(`📊 Found ${emotions.length} emotions for ${region}`);
      console.log(`📅 Date range: ${fromDate.toISOString()} to ${new Date().toISOString()}`);
      
      if (emotions.length > 0) {
        console.log(`📍 Sample locations: ${emotions.slice(0, 3).map(e => e.location?.city + ', ' + e.location?.country).join('; ')}`);
        console.log(`📅 Sample dates: ${emotions.slice(0, 3).map(e => e.createdAt).join('; ')}`);
      }

      if (!emotions.length) {
        // Try to find any emotions in the database to show what's available
        const allEmotions = await Emotion.find({ privacy: 'public' }).limit(10).lean();
        const availableCountries = [...new Set(allEmotions.map(e => e.location?.country).filter(Boolean))];
        const availableCities = [...new Set(allEmotions.map(e => e.location?.city).filter(Boolean))];
        
        console.log(`🌍 Available countries: ${availableCountries.join(', ')}`);
        console.log(`🏙️ Available cities: ${availableCities.join(', ')}`);
        
        return res.json({
          success: true,
          region,
          timeRange,
          summary: [],
          insight: `No emotion data found for ${region} in the past ${timeRange}. Available regions: ${availableCountries.slice(0, 5).join(', ')}`,
          totalEmotions: 0,
          availableCountries: availableCountries.slice(0, 10),
          availableCities: availableCities.slice(0, 10)
        });
      }

      // Aggregate emotion statistics
      const emotionStats = {};
      const contextStats = {
        weather: {},
        timeOfDay: {},
        socialContext: {}
      };

      emotions.forEach((emotion) => {
        const coreEmotion = emotion.coreEmotion || 'unknown';
        if (!emotionStats[coreEmotion]) {
          emotionStats[coreEmotion] = {
            count: 0,
            totalIntensity: 0,
            avgIntensity: 0
          };
        }
        emotionStats[coreEmotion].count++;
        emotionStats[coreEmotion].totalIntensity += emotion.intensity || 0;

        // Collect context statistics
        if (emotion.context?.weather) {
          contextStats.weather[emotion.context.weather] = 
            (contextStats.weather[emotion.context.weather] || 0) + 1;
        }
        if (emotion.context?.timeOfDay) {
          contextStats.timeOfDay[emotion.context.timeOfDay] = 
            (contextStats.timeOfDay[emotion.context.timeOfDay] || 0) + 1;
        }
        if (emotion.context?.socialContext) {
          contextStats.socialContext[emotion.context.socialContext] = 
            (contextStats.socialContext[emotion.context.socialContext] || 0) + 1;
        }
      });

      // Calculate averages and percentages
      const total = emotions.length;
      const summaryData = Object.entries(emotionStats).map(([emotion, stats]) => ({
        emotion,
        count: stats.count,
        avgIntensity: parseFloat((stats.totalIntensity / stats.count).toFixed(2)),
        percentage: parseFloat(((stats.count / total) * 100).toFixed(1))
      }));

      // Sort by count descending
      summaryData.sort((a, b) => b.count - a.count);

      // Generate AI insight using Gemini
      const aiInsight = await getGeminiInsight(region, summaryData, total, contextStats, timeRange);

      res.json({
        success: true,
        region,
        timeRange,
        summary: summaryData,
        insight: aiInsight,
        totalEmotions: total,
        contextStats,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Error generating region insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate region insights',
        error: error.message
      });
    }
  }

  // GET /api/map/insights/global - Get global AI insights
  async getGlobalInsights(req, res) {
    const { timeRange = '7d' } = req.query;

    try {
      // Calculate date range
      const now = new Date();
      let fromDate;
      switch (timeRange) {
        case '24h':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Get global emotion statistics
      const globalStats = await Emotion.aggregate([
        {
          $match: {
            privacy: 'public',
            createdAt: { $gte: fromDate }
          }
        },
        {
          $group: {
            _id: '$coreEmotion',
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' },
            totalIntensity: { $sum: '$intensity' }
          }
        },
        {
          $project: {
            emotion: '$_id',
            count: 1,
            avgIntensity: { $round: ['$avgIntensity', 2] },
            totalIntensity: 1
          }
        },
        { $sort: { count: -1 } }
      ]);

      const totalEmotions = globalStats.reduce((sum, stat) => sum + stat.count, 0);
      
      // Calculate percentages
      const summaryData = globalStats.map(stat => ({
        ...stat,
        percentage: parseFloat(((stat.count / totalEmotions) * 100).toFixed(1))
      }));

      // Generate global AI insight
      const aiInsight = await getGeminiInsight('Global', summaryData, totalEmotions, {}, timeRange);

      res.json({
        success: true,
        timeRange,
        summary: summaryData,
        insight: aiInsight,
        totalEmotions,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Error generating global insights:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate global insights',
        error: error.message
      });
    }
  }

  // GET /api/map/trends - Get emotion trends with AI analysis
  async getEmotionTrends(req, res) {
    let { region, emotion, days = 7 } = req.query;

    try {
      const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const matchQuery = {
        privacy: 'public',
        createdAt: { $gte: fromDate }
      };

      // ✅ SAFE REGEX: Apply same fix here too
      if (region) {
        region = String(region).trim();
        if (region.length > 0) {
          matchQuery.$or = [
            { 'location.country': { $regex: region, $options: 'i' } },
            { 'location.city': { $regex: region, $options: 'i' } },
            { 'location.region': { $regex: region, $options: 'i' } }
          ];
        }
      }

      if (emotion) {
        matchQuery.coreEmotion = emotion;
      }

      const trends = await Emotion.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              coreEmotion: '$coreEmotion'
            },
            count: { $sum: 1 },
            avgIntensity: { $avg: '$intensity' }
          }
        },
        {
          $project: {
            date: '$_id.date',
            emotion: '$_id.coreEmotion',
            count: 1,
            avgIntensity: { $round: ['$avgIntensity', 2] }
          }
        },
        { $sort: { date: 1 } }
      ]);

      res.json({
        success: true,
        trends,
        region: region || 'Global',
        emotion: emotion || 'All',
        days,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Error fetching emotion trends:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch emotion trends',
        error: error.message
      });
    }
  }

  // Analyze emotion data locally
  analyzeRegionalData(logs, region) {
    try {
      const emotions = logs.map(log => log.emotion);
      const intensities = logs.map(log => log.intensity);
      
      // Count emotions
      const emotionCounts = {};
      emotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
      
      // Find dominant emotion
      const dominantEmotion = Object.entries(emotionCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'neutral';
      
      // Calculate average intensity
      const avgIntensity = intensities.reduce((sum, intensity) => sum + intensity, 0) / intensities.length;
      
      // Get unique tags
      const allTags = logs.flatMap(log => log.tags || []);
      const uniqueTags = [...new Set(allTags)];
      
      return {
        dominantEmotion,
        emotionCounts,
        averageIntensity: Math.round(avgIntensity * 100) / 100,
        totalEmotions: logs.length,
        uniqueTags,
        topTags: uniqueTags.slice(0, 5)
      };
    } catch (error) {
      logger.error('Error analyzing regional data:', error);
      return {
        dominantEmotion: 'neutral',
        emotionCounts: {},
        averageIntensity: 0,
        totalEmotions: 0,
        uniqueTags: [],
        topTags: []
      };
    }
  }

  // Create a comprehensive prompt for Gemini
  createGeminiPrompt(logs, region, analysis) {
    const emotionData = logs.map(log => ({
      emotion: log.emotion,
      intensity: log.intensity,
      note: log.note,
      tags: log.tags
    }));

    return `Analyze the emotional state of ${region} based on this real-time emotion data:

EMOTION DATA (${logs.length} recent entries):
${JSON.stringify(emotionData, null, 2)}

ANALYSIS SUMMARY:
- Dominant emotion: ${analysis.dominantEmotion}
- Average intensity: ${analysis.averageIntensity}/5
- Total emotions logged: ${analysis.totalEmotions}
- Top tags: ${analysis.topTags.join(', ')}

Please provide a concise, insightful summary (2-3 sentences) about the emotional climate in ${region}. Consider:
1. What's the overall mood?
2. Are there any patterns or trends?
3. What might be influencing these emotions?
4. Any notable insights for someone visiting or living in ${region}?

Keep the tone friendly and informative, like a local weather report for emotions.`;
  }
}

export default new InsightController();