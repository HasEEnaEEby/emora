import mongoose from 'mongoose';

const comfortReactionSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emotionEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UnifiedEmotion',
    required: true
  },
  reactionType: {
    type: String,
    enum: ['hug', 'support', 'rainbow', 'heart', 'strength', 'listening'],
    required: true
  },
  message: {
    type: String,
    maxlength: 100
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

comfortReactionSchema.index({ toUser: 1, isRead: 1 });
comfortReactionSchema.index({ emotionEntry: 1 });
comfortReactionSchema.index({ fromUser: 1, toUser: 1, emotionEntry: 1 }, { unique: true });

export default mongoose.model('ComfortReaction', comfortReactionSchema);