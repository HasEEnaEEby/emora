import express from 'express';
import heatmapController from '../controllers/heatmap.controller.js';
import validationMiddleware from '../middlewares/validation.middleware.js';
import heatmapValidator from '../validators/heatmap.validator.js';

const router = express.Router();

// Public routes (no authentication required for heatmap)
router.get('/', 
  validationMiddleware(heatmapValidator.getHeatmap),
  heatmapController.getGlobalHeatmap
);

router.get('/stats', 
  validationMiddleware(heatmapValidator.getStats),
  heatmapController.getHeatmapStats
);

export default router;