const mongoose = require('mongoose');

const ventReactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vent'
  },
  ventReply: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VentReply'
  },
  reactionType: {
    type: String,
    enum: ['support', 'hug', 'strength', 'listening', 'helpful', 'heart'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure user can only react once per vent/reply
ventReactionSchema.index({ user: 1, vent: 1, reactionType: 1 }, { 
  unique: true, 
  partialFilterExpression: { vent: { $exists: true } } 
});
ventReactionSchema.index({ user: 1, ventReply: 1, reactionType: 1 }, { 
  unique: true, 
  partialFilterExpression: { ventReply: { $exists: true } } 
});

export default mongoose.model('VentReaction', ventReactionSchema);