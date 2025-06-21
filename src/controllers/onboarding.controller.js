import User from '../models/user.model.js';
import { handleAsync } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import { errorResponse, successResponse } from '../utils/response.js';

class OnboardingController {
  // Step 1: Create user with username
  createUser = handleAsync(async (req, res) => {
    const { username } = req.body;
    
    // Check if username already exists
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      return errorResponse(res, 'Username already taken. Please choose another.', 400);
    }
    
    // Create user with minimal data
    const user = new User({
      username: username.toLowerCase(),
      pronouns: 'they/them', // Default, will be updated in next step
      ageGroup: '20s', // Default, will be updated
      isOnboardingComplete: false
    });
    
    await user.save();
    
    // Generate token immediately for seamless experience
    const token = user.generateAuthToken();
    
    logger.info(`New user created: ${username}`);
    
    successResponse(res, {
      message: 'User created successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          isOnboardingComplete: false
        },
        token,
        nextStep: 'pronouns'
      }
    }, 201);
  });

  // Step 2: Update pronouns
  updatePronouns = handleAsync(async (req, res) => {
    const { pronouns } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    user.pronouns = pronouns;
    await user.save();
    
    successResponse(res, {
      message: 'Pronouns updated successfully',
      data: {
        pronouns: user.pronouns,
        nextStep: 'ageGroup'
      }
    });
  });

  // Step 3: Update age group
  updateAgeGroup = handleAsync(async (req, res) => {
    const { ageGroup } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    user.ageGroup = ageGroup;
    await user.save();
    
    successResponse(res, {
      message: 'Age group updated successfully',
      data: {
        ageGroup: user.ageGroup,
        nextStep: 'avatar'
      }
    });
  });

  // Step 4: Update avatar and complete onboarding
  updateAvatar = handleAsync(async (req, res) => {
    const { avatar } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    user.avatar = avatar;
    user.isOnboardingComplete = true;
    await user.save();
    
    logger.info(`User onboarding completed: ${user.username}`);
    
    successResponse(res, {
      message: 'Onboarding completed successfully! Welcome to EMORA!',
      data: {
        user: {
          id: user._id,
          username: user.username,
          pronouns: user.pronouns,
          ageGroup: user.ageGroup,
          avatar: user.avatar,
          isOnboardingComplete: true
        },
        nextStep: 'dashboard'
      }
    });
  });

  // Get user profile
  getProfile = handleAsync(async (req, res) => {
    const user = await User.findById(req.user.id);
    
    successResponse(res, {
      message: 'Profile retrieved successfully',
      data: { user }
    });
  });

  // Update preferences
  updatePreferences = handleAsync(async (req, res) => {
    const { preferences } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    // Merge preferences
    user.preferences = { ...user.preferences, ...preferences };
    await user.save();
    
    successResponse(res, {
      message: 'Preferences updated successfully',
      data: { preferences: user.preferences }
    });
  });

  // Check username availability
  checkUsername = handleAsync(async (req, res) => {
    const { username } = req.params;
    
    const existingUser = await User.findOne({ 
      username: username.toLowerCase() 
    });
    
    successResponse(res, {
      message: 'Username availability checked',
      data: {
        available: !existingUser,
        username: username.toLowerCase()
      }
    });
  });
}

export default new OnboardingController();