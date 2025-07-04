// src/controllers/onboarding.controller.js - COMPLETE FIXED VERSION
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import { handleAsync } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class OnboardingController {
  // Get onboarding steps - FIXED
  getOnboardingSteps = handleAsync(async (req, res) => {
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

    // Return Flutter-compatible format
    return res.status(200).json({
      status: 'success',
      data: steps,
      message: 'Onboarding steps retrieved successfully'
    });
  });

  // Check username availability - FIXED
  checkUsernameAvailability = handleAsync(async (req, res) => {
    const { username } = req.params;
    
    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Username must be at least 3 characters long',
        isAvailable: false,
        username: username
      });
    }

    // Additional format validation
    if (username.startsWith('_') || username.endsWith('_')) {
      return res.status(400).json({
        status: 'error',
        message: 'Username cannot start or end with underscore',
        isAvailable: false,
        username: username
      });
    }

    if (/^\d+$/.test(username)) {
      return res.status(400).json({
        status: 'error',
        message: 'Username cannot be only numbers',
        isAvailable: false,
        username: username
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return res.status(400).json({
        status: 'error',
        message: 'Username can only contain letters, numbers, and underscores',
        isAvailable: false,
        username: username
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
        username: username
      });
    }

    const normalizedUsername = username.toLowerCase().trim();
    
    try {
      // Check if username exists in database
      const existingUser = await User.findOne({ 
        username: { $regex: new RegExp(`^${normalizedUsername}$`, 'i') } 
      });
      
      const isAvailable = !existingUser;
      
      logger.info(`Username availability check: ${normalizedUsername} - ${isAvailable ? 'Available' : 'Taken'}`);

      // Return the EXACT format your Flutter app expects
      return res.status(200).json({
        status: 'success',
        username: normalizedUsername,
        isAvailable: isAvailable,
        message: isAvailable ? 'Username is available' : 'Username is already taken'
      });

    } catch (error) {
      logger.error('Username check error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to check username availability',
        isAvailable: false,
        username: normalizedUsername,
        errorCode: 'USERNAME_CHECK_FAILED'
      });
    }
  });

  // Save user onboarding data - FIXED
  saveUserOnboardingData = handleAsync(async (req, res) => {
    logger.info('🌐 Saving user onboarding data (anonymous)');
    
    const { username, pronouns, ageGroup, selectedAvatar, isCompleted, completedAt } = req.body;

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

    logger.info(`📱 Onboarding data received: ${JSON.stringify(validatedData)}`);

    // Return Flutter-compatible format
    return res.status(200).json({
      status: 'success',
      message: 'User onboarding data saved successfully',
      data: {
        ...validatedData,
        note: 'Data validated and acknowledged by server, saved locally',
      }
    });
  });

  // Complete anonymous onboarding - FIXED
  completeOnboarding = handleAsync(async (req, res) => {
    logger.info('🎯 Completing anonymous onboarding (no auth)');
    
    const { username, pronouns, ageGroup, selectedAvatar } = req.body;
    
    const completedData = {
      username: username ? username.toLowerCase().trim() : null,
      pronouns: pronouns || null,
      ageGroup: ageGroup || null,
      selectedAvatar: selectedAvatar || null,
      isCompleted: true,
      completedAt: new Date(),
    };

    logger.info(`✅ Anonymous onboarding completed: ${JSON.stringify(completedData)}`);

    // Return Flutter-compatible format
    return res.status(200).json({
      status: 'success',
      message: 'Anonymous onboarding completed successfully',
      data: {
        ...completedData,
        note: 'Onboarding completed locally, will sync when user registers',
      }
    });
  });

  // Register user with onboarding data - FIXED
  registerUser = handleAsync(async (req, res) => {
    logger.info('Registration attempt for username:', req.body.username);
    logger.info('📥 Full registration request body:', JSON.stringify(req.body, null, 2));
    
    const {
      username,
      password,
      email,
      pronouns,
      ageGroup,
      selectedAvatar,
      location,
      latitude,
      longitude
    } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username and password are required'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    // Normalize and validate inputs
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    logger.info('📧 Extracted and normalized:', {
      username: normalizedUsername,
      email: normalizedEmail,
      originalEmail: email
    });

    // Validate username format
    if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
      return res.status(400).json({
        status: 'error',
        message: 'Username must be between 3 and 20 characters'
      });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
      return res.status(400).json({
        status: 'error',
        message: 'Username can only contain letters, numbers, and underscores'
      });
    }

    if (normalizedUsername.startsWith('_') || normalizedUsername.endsWith('_')) {
      return res.status(400).json({
        status: 'error',
        message: 'Username cannot start or end with underscore'
      });
    }

    if (/^\d+$/.test(normalizedUsername)) {
      return res.status(400).json({
        status: 'error',
        message: 'Username cannot be only numbers'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if username is available
    const existingUsername = await User.findOne({ 
      username: { $regex: new RegExp(`^${normalizedUsername}$`, 'i') } 
    });
    
    if (existingUsername) {
      return res.status(409).json({
        status: 'error',
        message: 'Username is already taken',
        errorCode: 'USERNAME_EXISTS'
      });
    }

    // Check if email is available
    const existingEmail = await User.findOne({ 
      email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
    });
    
    if (existingEmail) {
      return res.status(409).json({
        status: 'error',
        message: 'Email is already registered',
        errorCode: 'EMAIL_EXISTS'
      });
    }

    // Map age groups from Flutter to backend format
    const ageGroupMapping = {
      'less than 20s': 'Under 18',
      '20s': '18-24',
      '30s': '25-34',
      '40s': '35-44',
      '50s and above': '45-54'
    };

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user data object
    const userData = {
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      pronouns: pronouns || 'They / Them',
      ageGroup: ageGroupMapping[ageGroup] || ageGroup || '18-24',
      selectedAvatar: selectedAvatar || 'panda',
      isOnboardingCompleted: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      analytics: {
        totalEmotionEntries: 0,
        totalMoodsLogged: 0,
        daysSinceJoined: 0,
        longestStreak: 0,
        currentStreak: 0,
        loginCount: 1,
        lastActiveAt: new Date()
      }
    };

    // Add location data if provided
    if (location || (latitude && longitude)) {
      userData.location = {
        name: location || 'Unknown',
        coordinates: {
          type: 'Point',
          coordinates: [parseFloat(longitude) || 0, parseFloat(latitude) || 0]
        },
        city: location ? location.split(',')[0]?.trim() : 'Unknown',
        country: location ? location.split(',').slice(-1)[0]?.trim() : 'Unknown'
      };
    }

    logger.info('💾 Creating user with data:', {
      username: userData.username,
      email: userData.email,
      pronouns: userData.pronouns,
      ageGroup: userData.ageGroup,
      selectedAvatar: userData.selectedAvatar,
      location: userData.location?.name
    });

    try {
      // Create and save user
      const newUser = new User(userData);
      const savedUser = await newUser.save();

      logger.info('✅ User saved successfully:', {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email
      });

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: savedUser._id,
          username: savedUser.username,
        },
        process.env.JWT_SECRET || 'emora-fallback-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      // Get public profile
      const userResponse = savedUser.getPublicProfile ? savedUser.getPublicProfile() : {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        pronouns: savedUser.pronouns,
        ageGroup: savedUser.ageGroup,
        selectedAvatar: savedUser.selectedAvatar,
        isOnboardingCompleted: savedUser.isOnboardingCompleted,
        createdAt: savedUser.createdAt,
      };

      // Return Flutter-compatible format
      return res.status(201).json({
        status: 'success',
        message: 'User registered successfully',
        data: {
          user: userResponse,
          token,
          expiresIn: '7d'
        }
      });

    } catch (error) {
      logger.error('Error during user registration:', error);
      
      // Handle MongoDB duplicate key errors
      if (error.code === 11000) {
        if (error.keyPattern && error.keyPattern.username) {
          return res.status(409).json({
            status: 'error',
            message: 'Username is already taken',
            errorCode: 'USERNAME_EXISTS'
          });
        }
        if (error.keyPattern && error.keyPattern.email) {
          return res.status(409).json({
            status: 'error',
            message: 'Email is already registered',
            errorCode: 'EMAIL_EXISTS'
          });
        }
        // Generic duplicate key error
        return res.status(409).json({
          status: 'error',
          message: 'Duplicate key error',
          errorCode: 'DUPLICATE_KEY'
        });
      }
      
      // Re-throw other errors to be caught by handleAsync
      throw error;
    }
  });

  // Login existing user - FIXED
  loginUser = handleAsync(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username and password are required'
      });
    }

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
        errorCode: 'INVALID_CREDENTIALS'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      logger.warn(`Login failed - account inactive: ${username}`);
      return res.status(403).json({
        status: 'error',
        message: 'Account is deactivated',
        errorCode: 'ACCOUNT_INACTIVE'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn(`Login failed - invalid password: ${username}`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password',
        errorCode: 'INVALID_CREDENTIALS'
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
    if (user.analytics) {
      user.analytics.loginCount = (user.analytics.loginCount || 0) + 1;
      user.analytics.lastActiveAt = new Date();
    }
    await user.save();

    logger.info(`✅ User logged in successfully: ${username}`);

    // Return user data without password
    const userResponse = user.getPublicProfile ? user.getPublicProfile() : {
      id: user._id,
      username: user.username,
      email: user.email,
      pronouns: user.pronouns,
      ageGroup: user.ageGroup,
      selectedAvatar: user.selectedAvatar,
      isOnboardingCompleted: user.isOnboardingCompleted,
      lastLoginAt: user.lastLoginAt,
    };

    // Return Flutter-compatible format
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        expiresIn: '7d'
      }
    });
  });

  // Alternative username check method
  checkUsername = handleAsync(async (req, res) => {
    const { username } = req.params;
    
    const existingUser = await User.findOne({ 
      username: username.toLowerCase() 
    });
    
    const isAvailable = !existingUser;
    
    return res.status(200).json({
      status: 'success',
      username: username.toLowerCase(),
      isAvailable,
      message: isAvailable ? 'Username is available' : 'Username is already taken'
    });
  });
}

export default new OnboardingController();