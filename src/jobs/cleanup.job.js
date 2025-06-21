import Analytics from '../models/analytics.model.js';
import Mood from '../models/mood.model.js';
import logger from '../utils/logger.js';

class CleanupJob {
  async run() {
    logger.info('Starting cleanup job');
    
    try {
      const results = await Promise.all([
        this.cleanupOldMoods(),
        this.cleanupOldAnalytics(),
        this.cleanupExpiredCaches()
      ]);
      
      logger.info('Cleanup job completed:', {
        moodsDeleted: results[0],
        analyticsDeleted: results[1],
        cachesCleared: results[2]
      });
    } catch (error) {
      logger.error('Cleanup job failed:', error);
      throw error;
    }
  }

  async cleanupOldMoods() {
    // Keep moods for 2 years
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    const result = await Mood.deleteMany({
      createdAt: { $lt: twoYearsAgo }
    });
    
    logger.info(`Deleted ${result.deletedCount} old mood entries`);
    return result.deletedCount;
  }

  async cleanupOldAnalytics() {
    // Keep analytics for 3 years
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
    
    const result = await Analytics.deleteMany({
      date: { $lt: threeYearsAgo }
    });
    
    logger.info(`Deleted ${result.deletedCount} old analytics entries`);
    return result.deletedCount;
  }

  async cleanupExpiredCaches() {
    // Redis automatically handles TTL, but we can manually clean up if needed
    // This is a placeholder for any custom cache cleanup logic
    logger.info('Cache cleanup completed (handled by Redis TTL)');
    return 0;
  }
}

export default new CleanupJob();