const mongoose = require('mongoose');

const ventReplySchema = new mongoose.Schema({
  vent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vent',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 500,
    trim: true
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return !this.isAnonymous; }
  },
  supportType: {
    type: String,
    enum: ['comfort', 'advice', 'validation', 'distraction', 'resource'],
    required: true
  },
  reactions: {
    helpful: { type: Number, default: 0 },
    heart: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ventReplySchema.index({ vent: 1, createdAt: -1 });
ventReplySchema.index({ author: 1, createdAt: -1 });

export default mongoose.model('VentReply', ventReplySchema);
