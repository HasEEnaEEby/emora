// src/controllers/onboarding.controller.js - CLEAN AND SIMPLE VERSION
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/user.model.js';
import { handleAsync } from '../utils/helpers.js';
import logger from '../utils/logger.js';

class OnboardingController {
  // Get onboarding steps
  getOnboardingSteps = handleAsync(async (req, res) => {
    const steps = [
      {
        stepNumber: 1,
        title: 'Hey there! What pronouns do you',
        subtitle: 'go by?',
        description: 'We want everyone to feel seen and respected. Pick the pronouns you\'re most comfortable with.',
        type: 'pronouns',
        isRequired: true,
        data: {
          options: [
            { value: 'She / Her', label: 'She / Her' },
            { value: 'He / Him', label: 'He / Him' },
            { value: 'They / Them', label: 'They / Them' },
            { value: 'Other', label: 'Other' }
          ]
        }
      },
      {
        stepNumber: 2,
        title: 'Awesome! How',
        subtitle: 'old are you?',
        description: 'What\'s your age group? This helps us show the most relevant content for you.',
        type: 'age',
        isRequired: true,
        data: {
          options: [
            { value: 'Under 18', label: 'Under 18' },
            { value: '18-24', label: '18-24' },
            { value: '25-34', label: '25-34' },
            { value: '35-44', label: '35-44' },
            { value: '45-54', label: '45-54' },
            { value: '55-64', label: '55-64' },
            { value: '65+', label: '65+' }
          ]
        }
      },
      {
        stepNumber: 3,
        title: 'Lastly, pick',
        subtitle: 'your avatar!',
        description: 'Choose an avatar that feels like you — it\'s all about personality.',
        type: 'avatar',
        isRequired: true,
        data: {
          avatars: [
            { name: 'panda', displayName: 'Panda', emoji: '🐼' },
            { name: 'elephant', displayName: 'Elephant', emoji: '🐘' },
            { name: 'horse', displayName: 'Horse', emoji: '🐴' },
            { name: 'rabbit', displayName: 'Rabbit', emoji: '🐰' },
            { name: 'fox', displayName: 'Fox', emoji: '🦊' },
            { name: 'zebra', displayName: 'Zebra', emoji: '🦓' },
            { name: 'bear', displayName: 'Bear', emoji: '🐻' },
            { name: 'pig', displayName: 'Pig', emoji: '🐷' },
            { name: 'raccoon', displayName: 'Raccoon', emoji: '🦝' }
          ]
        }
      }
    ];

    logger.info('📋 Onboarding steps requested');

    return res.status(200).json({
      status: 'success',
      data: {
        steps,
        totalSteps: steps.length
      },
      message: 'Onboarding steps retrieved successfully'
    });
  });

  // Check username availability
  checkUsernameAvailability = handleAsync(async (req, res) => {
    const { username } = req.params;
    
    if (!username || username.length < 3) {
      return res.status(400).json({
        status: 'error',
        message: 'Username must be at least 3 characters',
        isAvailable: false
      });
    }

    const normalizedUsername = username.toLowerCase().trim();
    
    // Check if username exists in database
    const existingUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${normalizedUsername}$`, 'i') } 
    });
    
    const isAvailable = !existingUser;
    
    logger.info(`Username check: ${normalizedUsername} - ${isAvailable ? 'Available' : 'Taken'}`);

    return res.status(200).json({
      status: 'success',
      data: {
        username: normalizedUsername,
        isAvailable: isAvailable,
        message: isAvailable ? 'Username is available' : 'Username is already taken'
      }
    });
  });

  // Save user onboarding data (for anonymous users - no username required)
  saveUserOnboardingData = handleAsync(async (req, res) => {
    logger.info('🌐 Saving user onboarding data (anonymous)');
    
    const { pronouns, ageGroup, selectedAvatar, isCompleted } = req.body;

    // Just acknowledge the data - no validation required for anonymous onboarding
    const savedData = {
      pronouns: pronouns || null,
      ageGroup: ageGroup || null,
      selectedAvatar: selectedAvatar || null,
      isCompleted: isCompleted || false,
      savedAt: new Date(),
      sessionId: req.sessionID || `anonymous_${Date.now()}`
    };

    logger.info(`📱 Onboarding data saved: ${JSON.stringify(savedData)}`);

    return res.status(200).json({
      status: 'success',
      message: 'User onboarding data saved successfully',
      data: savedData
    });
  });

  // Complete anonymous onboarding (no username required)
  completeOnboarding = handleAsync(async (req, res) => {
    logger.info('🎯 Completing anonymous onboarding');
    
    const { pronouns, ageGroup, selectedAvatar } = req.body;
    
    // For anonymous onboarding, we only need the core data (no username)
    if (!pronouns || !ageGroup || !selectedAvatar) {
      return res.status(400).json({
        status: 'error',
        message: 'Pronouns, age group, and avatar are required',
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const completedData = {
      pronouns: pronouns,
      ageGroup: ageGroup,
      selectedAvatar: selectedAvatar,
      isCompleted: true,
      completedAt: new Date(),
      sessionId: req.sessionID || `anonymous_${Date.now()}`
    };

    logger.info(`✅ Anonymous onboarding completed: ${JSON.stringify(completedData)}`);

    return res.status(200).json({
      status: 'success',
      message: 'Anonymous onboarding completed successfully',
      data: completedData
    });
  });

  // Register user with onboarding data
  registerUser = handleAsync(async (req, res) => {
    logger.info('📥 Registration attempt received');
    
    const {
      username,
      password,
      email,
      pronouns, 
      ageGroup,
      selectedAvatar,
      location,
      latitude,
      longitude,
      termsAccepted,
      privacyAccepted
    } = req.body;

    // Validate required fields
    if (!username || !password || !email) {
      return res.status(400).json({
        status: 'error',
        message: 'Username, password, and email are required',
        errorCode: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validate terms acceptance
    if (!termsAccepted || !privacyAccepted) {
      return res.status(400).json({
        status: 'error',
        message: 'Terms of service and privacy policy must be accepted',
        errorCode: 'TERMS_NOT_ACCEPTED'
      });
    }

    // Normalize inputs
    const normalizedUsername = username.toLowerCase().trim();
    const normalizedEmail = email.toLowerCase().trim();

    // Check if username exists
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

    // Check if email exists
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

    // Create user data object - password will be hashed by model middleware
    const userData = {
      username: normalizedUsername,
      email: normalizedEmail,
      password: password, // ✅ FIXED: Let the model handle password hashing
      pronouns: pronouns || 'They / Them',
      ageGroup: ageGroup || '18-24',
      selectedAvatar: selectedAvatar || 'panda',
      isOnboardingCompleted: true,
      isActive: true,
      isEmailVerified: false,
      termsAccepted: termsAccepted,
      privacyAccepted: privacyAccepted,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date()
    };

    // Add location data if provided
    if (location || (latitude && longitude)) {
      userData.location = {
        name: location || 'Unknown',
        coordinates: {
          type: 'Point',
          coordinates: [parseFloat(longitude) || 0, parseFloat(latitude) || 0]
        },
        recordedAt: new Date()
      };
    }

    logger.info('💾 Creating user:', {
      username: userData.username,
      email: userData.email,
      pronouns: userData.pronouns,
      ageGroup: userData.ageGroup,
      selectedAvatar: userData.selectedAvatar
    });

    try {
      // Create and save user
      const newUser = new User(userData);
      const savedUser = await newUser.save();

      logger.info('✅ User saved successfully:', savedUser.username);

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: savedUser._id,
          username: savedUser.username,
          email: savedUser.email
        },
        config.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Return user data (excluding password)
      const userResponse = {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        pronouns: savedUser.pronouns,
        ageGroup: savedUser.ageGroup,
        selectedAvatar: savedUser.selectedAvatar,
        isOnboardingCompleted: savedUser.isOnboardingCompleted,
        isEmailVerified: savedUser.isEmailVerified,
        createdAt: savedUser.createdAt,
        lastLoginAt: savedUser.lastLoginAt,
        location: savedUser.location ? {
          name: savedUser.location.name,
          coordinates: savedUser.location.coordinates
        } : null
      };

      logger.info(`🎉 User registered successfully: ${savedUser.username}`);

      return res.status(201).json({
        success: true,
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
        if (error.keyPattern?.username) {
          return res.status(409).json({
            status: 'error',
            message: 'Username is already taken',
            errorCode: 'USERNAME_EXISTS'
          });
        }
        if (error.keyPattern?.email) {
          return res.status(409).json({
            status: 'error',
            message: 'Email is already registered',
            errorCode: 'EMAIL_EXISTS'
          });
        }
      }
      
      throw error;
    }
  });

  // Login existing user
  loginUser = handleAsync(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username and password are required',
        errorCode: 'MISSING_CREDENTIALS'
      });
    }

    logger.info(`🔐 Login attempt for: ${username}`);

    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${username}$`, 'i') } },
        { email: { $regex: new RegExp(`^${username}$`, 'i') } }
      ]
    });

    if (!user) {
      logger.warn(`❌ Login failed - user not found: ${username}`);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password',
        errorCode: 'INVALID_CREDENTIALS'
      });
    }

    // ✅ FIXED: Use the model's comparePassword method
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      logger.warn(`❌ Login failed - invalid password: ${username}`);
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
        email: user.email
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`✅ User logged in successfully: ${user.username}`);

    // Return user data (excluding password)
    const userResponse = {
      id: user._id,
      username: user.username,
      email: user.email,
      pronouns: user.pronouns,
      ageGroup: user.ageGroup,
      selectedAvatar: user.selectedAvatar,
      isOnboardingCompleted: user.isOnboardingCompleted,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      location: user.location ? {
        name: user.location.name,
        coordinates: user.location.coordinates
      } : null
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token,
        expiresIn: '7d'
      }
    });
  });
}

export default new OnboardingController();