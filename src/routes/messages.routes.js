import express from 'express';
import Message from '../models/message.model.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import messageRoutes from './messages.routes.js';

const router = express.Router();

// Send a message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    console.log('💬 Sending message from user:', req.user.userId);
    console.log('📤 Message data:', req.body);
    
    const { recipientId, message } = req.body;
    const senderId = req.user.userId;

    if (!recipientId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID and message content are required'
      });
    }

    // Don't allow sending messages to yourself
    if (senderId === recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send message to yourself'
      });
    }

    // Create new message
    const newMessage = new Message({
      senderId,
      recipientId,
      content: message,
      messageType: 'text',
      status: 'sent'
    });

    await newMessage.save();

    console.log('✅ Message sent successfully:', newMessage.id);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: newMessage.id,
        senderId,
        recipientId,
        content: message,
        sentAt: newMessage.createdAt
      }
    });

  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get conversation between two users
router.get('/conversation/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    console.log(`💬 Getting conversation between ${currentUserId} and ${userId}`);

    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, recipientId: userId },
        { senderId: userId, recipientId: currentUserId }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate('senderId', 'username displayName selectedAvatar')
    .populate('recipientId', 'username displayName selectedAvatar');

    res.json({
      success: true,
      message: 'Conversation retrieved successfully',
      data: {
        messages: messages.reverse()
      }
    });

  } catch (error) {
    console.error('❌ Error getting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve conversation'
    });
  }
});

// Get inbox messages for the authenticated user
router.get('/inbox', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const messages = await Message.find({ recipientId: userId })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username displayName selectedAvatar');

    const formatted = messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId?._id || msg.senderId,
      senderName: msg.senderId?.displayName || msg.senderId?.username || 'Unknown',
      senderAvatar: msg.senderId?.selectedAvatar || 'default',
      content: msg.content,
      sentAt: msg.createdAt,
    }));

    res.json({ success: true, data: { messages: formatted } });
  } catch (error) {
    console.error('❌ Error getting inbox:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve inbox' });
  }
});

export default router; 