import User from '../models/user.model.js';
import { handleAsync } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import { errorResponse, successResponse } from '../utils/response.js';

class AuthController {
  // Simple login (optional - for users who want password protection)
  login = handleAsync(async (req, res) => {
    const { username, password } = req.body;
    
    // Find user
    const user = await User.findOne({ 
      username: username.toLowerCase() 
    }).select('+password');
    
    if (!user) {
      return errorResponse(res, 'Invalid credentials', 401);
    }
    
    // Check password (if user has one)
    if (user.password) {
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return errorResponse(res, 'Invalid credentials', 401);
      }
    } else if (password) {
      // User doesn't have password but one was provided
      return errorResponse(res, 'This account does not require a password', 400);
    }
    
    // Generate token
    const token = user.generateAuthToken();
    
    logger.info(`User logged in: ${username}`);
    
    successResponse(res, {
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          pronouns: user.pronouns,
          ageGroup: user.ageGroup,
          avatar: user.avatar,
          isOnboardingComplete: user.isOnboardingComplete
        },
        token
      }
    });
  });

  // Get current user
  getMe = handleAsync(async (req, res) => {
    successResponse(res, {
      message: 'Current user retrieved',
      data: { user: req.user }
    });
  });

  // Optional: Add password to existing account
  addPassword = handleAsync(async (req, res) => {
    const { password } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    if (user.password) {
      return errorResponse(res, 'Account already has a password. Use change password instead.', 400);
    }
    
    user.password = password;
    await user.save();
    
    successResponse(res, {
      message: 'Password added successfully. Your account is now more secure!'
    });
  });

  // Simple username-only access (for returning users without password)
  quickAccess = handleAsync(async (req, res) => {
    const { username } = req.body;
    
    const user = await User.findOne({ 
      username: username.toLowerCase() 
    });
    
    if (!user) {
      return errorResponse(res, 'User not found. Please check your username or create a new account.', 404);
    }
    
    // If user has a password, they must use regular login
    if (user.password) {
      return errorResponse(res, 'This account is password protected. Please use the login option.', 400);
    }
    
    const token = user.generateAuthToken();
    
    logger.info(`Quick access granted: ${username}`);
    
    successResponse(res, {
      message: 'Access granted',
      data: {
        user: {
          id: user._id,
          username: user.username,
          pronouns: user.pronouns,
          ageGroup: user.ageGroup,
          avatar: user.avatar,
          isOnboardingComplete: user.isOnboardingComplete
        },
        token
      }
    });
  });
}

export default new AuthController();