
import { getCoreEmotion } from '../constants/emotions.js';
import Mood from '../models/mood.model.js';
import UnifiedEmotion from '../models/unified-emotion.model.js';
import logger from './logger.js';

export async function migrateMoodsToUnifiedEmotions() {
  try {
    logger.info('🔄 Starting mood to unified emotion migration...');
    
    const totalMoods = await Mood.countDocuments();
    logger.info(`. Found ${totalMoods} moods to migrate`);
    
    if (totalMoods === 0) {
      logger.info('. No moods to migrate');
      return { migrated: 0, errors: 0 };
    }
    
    let migrated = 0;
    let errors = 0;
    const batchSize = 100;
    
    for (let skip = 0; skip < totalMoods; skip += batchSize) {
      const moods = await Mood.find({})
        .skip(skip)
        .limit(batchSize)
        .lean();
      
      for (const mood of moods) {
        try {
          // Check if already migrated
          const exists = await UnifiedEmotion.findOne({
            userId: mood.userId,
            emotion: mood.emotion,
            createdAt: mood.createdAt
          });
          
          if (exists) {
            logger.debug(`⏭️  Skipping already migrated mood: ${mood._id}`);
            continue;
          }
          
          // Convert intensity from 1-5 to 0-1 scale
          const normalizedIntensity = (mood.intensity - 1) / 4;
          
          // Map to unified emotion format
          const unifiedEmotion = new UnifiedEmotion({
            userId: mood.userId,
            emotion: mood.emotion,
            coreEmotion: getCoreEmotion(mood.emotion),
            intensity: normalizedIntensity,
            legacyIntensity: mood.intensity,
            
            location: {
              type: 'Point',
              coordinates: mood.location.coordinates,
              city: mood.location.city,
              region: mood.location.region,
              country: mood.location.country,
              continent: mood.location.continent,
              timezone: mood.location.timezone
            },
            
            context: {
              weather: mood.context.weather,
              temperature: mood.context.temperature,
              timeOfDay: mood.context.timeOfDay,
              dayOfWeek: mood.context.dayOfWeek,
              isWeekend: mood.context.isWeekend
            },
            
            memory: {
              description: mood.note,
              tags: mood.tags || [],
              isPrivate: !mood.isAnonymous
            },
            
            globalSharing: {
              isShared: mood.isAnonymous,
              anonymousId: mood.isAnonymous ? mood._id.toString() : undefined,
              sharedAt: mood.isAnonymous ? mood.createdAt : undefined
            },
            
            // Legacy compatibility
            isAnonymous: mood.isAnonymous,
            note: mood.note,
            source: mood.source,
            version: '2.0', // Mark as migrated
            
            // Preserve timestamps
            timestamp: mood.createdAt,
            timezone: mood.location.timezone || 'UTC',
            
            // Set created/updated timestamps
            createdAt: mood.createdAt,
            updatedAt: mood.updatedAt
          });
          
          await unifiedEmotion.save();
          migrated++;
          
          if (migrated % 50 === 0) {
            logger.info(`. Migrated ${migrated}/${totalMoods} moods`);
          }
          
        } catch (error) {
          logger.error(`. Error migrating mood ${mood._id}:`, error);
          errors++;
        }
      }
    }
    
    logger.info(`🎉 Migration complete! Migrated: ${migrated}, Errors: ${errors}`);
    return { migrated, errors, total: totalMoods };
    
  } catch (error) {
    logger.error('. Migration failed:', error);
    throw error;
  }
}