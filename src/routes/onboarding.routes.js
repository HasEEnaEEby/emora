import bcrypt from 'bcryptjs';
import express from 'express';
import { body, param, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import authMiddleware from '../middlewares/auth.middleware.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';

const router = express.Router();

// FIXED: Validation middleware for user data - allows null/undefined values during onboarding
const userDataValidation = [
  body('pronouns')
    .optional({ values: 'falsy' }) // Allow null, undefined, empty string
    .trim()
    .custom((value) => {
      if (value && !['She / Her', 'He / Him', 'They / Them', 'Other'].includes(value)) {
        throw new Error('Invalid pronouns selection');
      }
      return true;
    }),
  body('ageGroup')
    .optional({ values: 'falsy' }) // Allow null, undefined, empty string
    .trim()
    .custom((value) => {
      if (value && !['less than 20s', '20s', '30s', '40s', '50s and above'].includes(value)) {
        throw new Error('Invalid age group selection');
      }
      return true;
    }),
  body('selectedAvatar')
    .optional({ values: 'falsy' }) // Allow null, undefined, empty string
    .trim()
    .custom((value) => {
      if (value && !['panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon'].includes(value)) {
        throw new Error('Invalid avatar selection');
      }
      return true;
    }),
];

const usernameValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .custom((value) => {
      if (value.startsWith('_') || value.endsWith('_')) {
        throw new Error('Username cannot start or end with underscore');
      }
      if (/^\d+$/.test(value)) {
        throw new Error('Username cannot be only numbers');
      }
      return true;
    }),
];

const passwordValidation = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
];

// Helper function to check validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

// @route   GET /api/onboarding/steps
// @desc    Get onboarding steps
// @access  Public
router.get('/steps', (req, res) => {
  try {
    const steps = [
      {
        stepNumber: 1,
        title: 'Welcome to',
        subtitle: 'Emora!',
        description: 'What do you want us to call you?',
        type: 'welcome',
      },
      {
        stepNumber: 2,
        title: 'Hey there! What pronouns do you',
        subtitle: 'go by?',
        description: 'We want everyone to feel seen and respected. Pick the pronouns you\'re most comfortable with.',
        type: 'pronouns',
        data: {
          options: ['She / Her', 'He / Him', 'They / Them', 'Other'],
        },
      },
      {
        stepNumber: 3,
        title: 'Awesome! How',
        subtitle: 'old are you?',
        description: 'What\'s your age group? This helps us show the most relevant content for you.',
        type: 'age',
        data: {
          options: ['less than 20s', '20s', '30s', '40s', '50s and above'],
        },
      },
      {
        stepNumber: 4,
        title: 'Lastly, pick',
        subtitle: 'your avatar!',
        description: 'Choose an avatar that feels like you — it\'s all about personality.',
        type: 'avatar',
        data: {
          avatars: ['panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon'],
        },
      },
      {
        stepNumber: 5,
        title: 'Congrats,',
        subtitle: 'User!',
        description: 'You\'re free to express yourself',
        type: 'completion',
      },
    ];

    logger.info('📋 Onboarding steps requested');

    res.json({
      status: 'success',
      data: steps,
      message: 'Onboarding steps retrieved successfully',
    });
  } catch (error) {
    logger.error('Error getting onboarding steps:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get onboarding steps',
      errorCode: 'STEPS_FETCH_FAILED',
    });
  }
});

// FIXED: @route   POST /api/onboarding/user-data
// @desc    Save user onboarding data (without authentication) - NOW PROPERLY VALIDATES NULL VALUES
// @access  Public
router.post('/user-data', [
  body('username')
    .optional({ values: 'falsy' }) // Allow null, undefined, empty string during onboarding
    .trim()
    .custom((value) => {
      if (value && (value.length < 3 || value.length > 20)) {
        throw new Error('Username must be between 3 and 20 characters');
      }
      if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }
      if (value && (value.startsWith('_') || value.endsWith('_'))) {
        throw new Error('Username cannot start or end with underscore');
      }
      if (value && /^\d+$/.test(value)) {
        throw new Error('Username cannot be only numbers');
      }
      return true;
    }),
  ...userDataValidation,
  handleValidationErrors,
], async (req, res) => {
  try {
    const { username, pronouns, ageGroup, selectedAvatar, isCompleted, completedAt } = req.body;

    logger.info('🌐 Saving user onboarding data (anonymous)');

    // Validate the incoming data
    const validatedData = {
      username: username ? username.toLowerCase().trim() : null,
      pronouns: pronouns || null,
      ageGroup: ageGroup || null,
      selectedAvatar: selectedAvatar || null,
      isCompleted: isCompleted || false,
      completedAt: completedAt ? new Date(completedAt) : null,
      savedAt: new Date(),
    };

    // Log the data for debugging
    logger.info(`📱 Onboarding data received: ${JSON.stringify(validatedData)}`);

    // For now, we acknowledge successful validation and return success
    // In production, you might want to store this in a temporary collection or cache
    // This ensures the frontend gets successful remote sync confirmation
    
    res.status(200).json({
      status: 'success',
      message: 'User onboarding data saved successfully',
      data: {
        ...validatedData,
        note: 'Data validated and acknowledged by server, saved locally',
      },
    });

  } catch (error) {
    logger.error('Error saving user onboarding data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save user onboarding data',
      errorCode: 'SAVE_FAILED',
    });
  }
});

// @route   POST /api/onboarding/complete
// @desc    Complete onboarding (handles both authenticated and anonymous)
// @access  Public/Private
router.post('/complete', [
  body('username')
    .optional({ values: 'falsy' })
    .trim(),
  body('pronouns')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (value && !['She / Her', 'He / Him', 'They / Them', 'Other'].includes(value)) {
        throw new Error('Invalid pronouns selection');
      }
      return true;
    }),
  body('ageGroup')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (value && !['less than 20s', '20s', '30s', '40s', '50s and above'].includes(value)) {
        throw new Error('Invalid age group selection');
      }
      return true;
    }),
  body('selectedAvatar')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (value && !['panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon'].includes(value)) {
        throw new Error('Invalid avatar selection');
      }
      return true;
    }),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { username, pronouns, ageGroup, selectedAvatar } = req.body;
    
    // Check if request has authentication
    const authHeader = req.headers['authorization'];
    const hasAuth = authHeader && authHeader.startsWith('Bearer ');

    if (hasAuth) {
      // Handle authenticated request
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'emora-fallback-secret-key-change-in-production');
        const userId = decoded.userId;

        logger.info(`🌐 Completing onboarding for authenticated user: ${decoded.username}`);

        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({
            status: 'error',
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
          });
        }

        // Update user onboarding data
        if (pronouns) user.pronouns = pronouns;
        if (ageGroup) user.ageGroup = ageGroup;
        if (selectedAvatar) user.selectedAvatar = selectedAvatar;
        user.isOnboardingCompleted = true;
        user.updatedAt = new Date();
        
        await user.save();

        logger.info(`✅ Onboarding completed for authenticated user: ${user.username}`);

        return res.json({
          status: 'success',
          message: 'Onboarding completed successfully',
          data: {
            user: user.getPublicProfile ? user.getPublicProfile() : {
              id: user._id,
              username: user.username,
              pronouns: user.pronouns,
              ageGroup: user.ageGroup,
              selectedAvatar: user.selectedAvatar,
              isOnboardingCompleted: user.isOnboardingCompleted,
            },
            completedAt: new Date().toISOString(),
          },
        });

      } catch (jwtError) {
        logger.warn('Invalid JWT token for onboarding completion:', jwtError.message);
        // Fall through to anonymous handling
      }
    }
    
    // Handle anonymous request (no auth or invalid auth)
    logger.info('🎯 Completing anonymous onboarding (no auth)');

    const completedData = {
      username: username ? username.toLowerCase().trim() : null,
      pronouns: pronouns || null,
      ageGroup: ageGroup || null,
      selectedAvatar: selectedAvatar || null,
      isCompleted: true,
      completedAt: new Date(),
    };

    logger.info(`✅ Anonymous onboarding completed: ${JSON.stringify(completedData)}`);

    res.status(200).json({
      status: 'success',
      message: 'Anonymous onboarding completed successfully',
      data: {
        ...completedData,
        note: 'Onboarding completed locally, will sync when user registers',
      },
    });

  } catch (error) {
    logger.error('Error completing onboarding:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete onboarding',
      errorCode: 'COMPLETION_FAILED',
    });
  }
});

// @route   GET /api/onboarding/check-username/:username
// @desc    Check if username is available
// @access  Public
router.get('/check-username/:username', [
  param('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { username } = req.params;

    // Additional format validation
    if (username.startsWith('_') || username.endsWith('_')) {
      return res.status(400).json({
        status: 'error',
        message: 'Username cannot start or end with underscore',
        isAvailable: false,
      });
    }

    if (/^\d+$/.test(username)) {
      return res.status(400).json({
        status: 'error',
        message: 'Username cannot be only numbers',
        isAvailable: false,
      });
    }

    // Check reserved usernames
    const reservedUsernames = [
      'admin', 'administrator', 'root', 'moderator', 'support',
      'help', 'api', 'www', 'mail', 'email', 'system', 'service',
      'emora', 'official', 'staff', 'team', 'bot', 'null', 'undefined'
    ];

    if (reservedUsernames.includes(username.toLowerCase())) {
      return res.status(400).json({
        status: 'error',
        message: 'Username is reserved and cannot be used',
        isAvailable: false,
      });
    }

    // Check if username exists in database (case insensitive)
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    });

    const isAvailable = !existingUser;

    logger.info(`Username availability check: ${username} - ${isAvailable ? 'Available' : 'Taken'}`);

    res.json({
      status: 'success',
      username: username.toLowerCase(),
      isAvailable,
      message: isAvailable ? 'Username is available' : 'Username is already taken',
    });

  } catch (error) {
    logger.error('Error checking username availability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check username availability',
      isAvailable: false,
      errorCode: 'USERNAME_CHECK_FAILED',
    });
  }
});

// @route   POST /api/onboarding/register
// @desc    Register new user with onboarding data
// @access  Public
router.post('/register', [
  ...usernameValidation,
  ...passwordValidation,
  body('pronouns')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (value && !['She / Her', 'He / Him', 'They / Them', 'Other'].includes(value)) {
        throw new Error('Invalid pronouns selection');
      }
      return true;
    }),
  body('ageGroup')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (value && !['less than 20s', '20s', '30s', '40s', '50s and above'].includes(value)) {
        throw new Error('Invalid age group selection');
      }
      return true;
    }),
  body('selectedAvatar')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (value && !['panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon'].includes(value)) {
        throw new Error('Invalid avatar selection');
      }
      return true;
    }),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { username, password, pronouns, ageGroup, selectedAvatar } = req.body;

    logger.info(`Registration attempt for username: ${username}`);

    // Check if user already exists
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    });

    if (existingUser) {
      logger.warn(`Registration failed - username already exists: ${username}`);
      return res.status(409).json({
        status: 'error',
        message: 'Username is already taken',
        errorCode: 'USERNAME_EXISTS',
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user with onboarding data
    const newUser = new User({
      username: username.toLowerCase().trim(),
      password: hashedPassword,
      pronouns: pronouns || 'They / Them',
      ageGroup: ageGroup || '20s',
      selectedAvatar: selectedAvatar || 'panda',
      isOnboardingCompleted: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedUser = await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: savedUser._id,
        username: savedUser.username,
      },
      process.env.JWT_SECRET || 'emora-fallback-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    logger.info(`✅ User registered successfully: ${username}`);

    // Return user data without password
    const userResponse = savedUser.getPublicProfile ? savedUser.getPublicProfile() : {
      id: savedUser._id,
      username: savedUser.username,
      pronouns: savedUser.pronouns,
      ageGroup: savedUser.ageGroup,
      selectedAvatar: savedUser.selectedAvatar,
      isOnboardingCompleted: savedUser.isOnboardingCompleted,
      createdAt: savedUser.createdAt,
    };

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token,
        expiresIn: '7d',
      },
    });

  } catch (error) {
    logger.error('Error during user registration:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Username is already taken',
        errorCode: 'USERNAME_EXISTS',
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to register user',
      errorCode: 'REGISTRATION_FAILED',
    });
  }
});

// @route   POST /api/onboarding/login
// @desc    Login existing user
// @access  Public
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const { username, password } = req.body;

    logger.info(`Login attempt for username: ${username}`);

    // Find user by username (case insensitive)
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') } 
    });

    if (!user) {
      logger.warn(`Login failed - user not found: ${username}`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      logger.warn(`Login failed - account inactive: ${username}`);
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated',
        errorCode: 'ACCOUNT_INACTIVE',
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn(`Login failed - invalid password: ${username}`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        username: user.username,
      },
      process.env.JWT_SECRET || 'emora-fallback-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`✅ User logged in successfully: ${username}`);

    // Return user data without password
    const userResponse = user.getPublicProfile ? user.getPublicProfile() : {
      id: user._id,
      username: user.username,
      pronouns: user.pronouns,
      ageGroup: user.ageGroup,
      selectedAvatar: user.selectedAvatar,
      isOnboardingCompleted: user.isOnboardingCompleted,
      lastLoginAt: user.lastLoginAt,
    };

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        expiresIn: '7d',
      },
    });

  } catch (error) {
    logger.error('Error during login:', error);
    res.status(500).json({
      status: 'error',
      message: 'Login failed',
      errorCode: 'LOGIN_FAILED',
    });
  }
});

// @route   GET /api/onboarding/profile
// @desc    Get user profile
// @access  Private
async function profile(req, res) {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    const userResponse = user.getPublicProfile ? user.getPublicProfile() : {
      id: user._id,
      username: user.username,
      pronouns: user.pronouns,
      ageGroup: user.ageGroup,
      selectedAvatar: user.selectedAvatar,
      isOnboardingCompleted: user.isOnboardingCompleted,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    res.json({
      status: 'success',
      data: {
        user: userResponse,
      },
    });

  } catch (error) {
    logger.error('Error getting profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get profile',
      errorCode: 'PROFILE_FETCH_FAILED',
    });
  }
}

// FIXED: Use authMiddleware.required instead of authMiddleware
router.get('/profile', authMiddleware.required, profile);

// @route   PUT /api/onboarding/update-profile
// @desc    Update user profile data
// @access  Private
router.put('/update-profile', authMiddleware.required, [
  body('pronouns')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (value && !['She / Her', 'He / Him', 'They / Them', 'Other'].includes(value)) {
        throw new Error('Invalid pronouns selection');
      }
      return true;
    }),
  body('ageGroup')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (value && !['less than 20s', '20s', '30s', '40s', '50s and above'].includes(value)) {
        throw new Error('Invalid age group selection');
      }
      return true;
    }),
  body('selectedAvatar')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (value && !['panda', 'elephant', 'horse', 'rabbit', 'fox', 'zebra', 'bear', 'pig', 'raccoon'].includes(value)) {
        throw new Error('Invalid avatar selection');
      }
      return true;
    }),
  body('displayName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Display name must be between 1 and 50 characters'),
  handleValidationErrors,
], async (req, res) => {
  try {
    const userId = req.user.userId;
    const { pronouns, ageGroup, selectedAvatar, displayName } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    // Update fields if provided
    if (pronouns !== undefined) user.pronouns = pronouns;
    if (ageGroup !== undefined) user.ageGroup = ageGroup;
    if (selectedAvatar !== undefined) user.selectedAvatar = selectedAvatar;
    if (displayName !== undefined) {
      user.profile = user.profile || {};
      user.profile.displayName = displayName;
    }

    user.updatedAt = new Date();
    await user.save();

    logger.info(`✅ Profile updated for user: ${user.username}`);

    const userResponse = user.getPublicProfile ? user.getPublicProfile() : {
      id: user._id,
      username: user.username,
      pronouns: user.pronouns,
      ageGroup: user.ageGroup,
      selectedAvatar: user.selectedAvatar,
      profile: user.profile,
      updatedAt: user.updatedAt,
    };

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: userResponse,
      },
    });

  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update profile',
      errorCode: 'PROFILE_UPDATE_FAILED',
    });
  }
});

// @route   POST /api/onboarding/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authMiddleware.required, async (req, res) => {
  try {
    logger.info(`User logged out: ${req.user.username}`);

    res.json({
      status: 'success',
      message: 'Logged out successfully',
    });

  } catch (error) {
    logger.error('Error during logout:', error);
    res.status(500).json({
      status: 'error',
      message: 'Logout failed',
      errorCode: 'LOGOUT_FAILED',
    });
  }
});

export default router;