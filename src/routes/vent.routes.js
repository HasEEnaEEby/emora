import express from 'express';
import ventController from '../controllers/vent.controller.js';
import { validateVent, validateReaction, validateReply, validateFlag } from '../validators/vent.validator.js';
import { rateLimit } from '../middlewares/rate-limit.middleware.js';
import { optionalAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Rate limiting for vent creation and reactions
const ventCreationLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 vents per 5 minutes
  message: 'Too many vents created, please try again later'
});

const reactionLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 reactions per minute
  message: 'Too many reactions, please try again later'
});

const replyLimit = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 5, // 5 replies per 2 minutes
  message: 'Too many replies, please try again later'
});

// Create a new vent (anonymous by default)
router.post('/',
  ventCreationLimit,
  optionalAuth,
  validateVent,
  ventController.createVent
);

// Get public vent feed
router.get('/feed',
  ventController.getVentFeed
);

// Get regional vents
router.get('/regional/:country',
  ventController.getRegionalVents
);

// Get vent statistics
router.get('/stats',
  ventController.getVentStats
);

// Add reaction to vent
router.post('/:ventId/react',
  reactionLimit,
  validateReaction,
  ventController.addReaction
);

// Add reply to vent
router.post('/:ventId/reply',
  replyLimit,
  validateReply,
  ventController.addReply
);

// Flag vent for moderation
router.post('/:ventId/flag',
  validateFlag,
  ventController.flagVent
);

// Delete vent (only by creator)
router.delete('/:ventId',
  optionalAuth,
  ventController.deleteVent
);

export default router;