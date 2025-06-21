import cron from 'node-cron';
import logger from '../utils/logger.js';
import analyticsJob from './analytics.job.js';
import cleanupJob from './cleanup.job.js';
import heatmapAggregationJob from './heatmap-aggregation.job.js';

const setupCronJobs = () => {
  // Heatmap aggregation - every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      await heatmapAggregationJob.run();
    } catch (error) {
      logger.error('Heatmap aggregation job failed:', error);
    }
  });

  // Analytics processing - every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await analyticsJob.run();
    } catch (error) {
      logger.error('Analytics job failed:', error);
    }
  });

  // Cleanup old data - daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    try {
      await cleanupJob.run();
    } catch (error) {
      logger.error('Cleanup job failed:', error);
    }
  });

  logger.info('Cron jobs initialized');
};

export default setupCronJobs;