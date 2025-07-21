import express from 'express';
import insightController from '../controllers/insight.controller.js';
const router = express.Router();

router.get('/:region', insightController.getRegionalInsight);

export default router; 