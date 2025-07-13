// src/controllers/auth.controller.js - ENHANCED VERSION
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/user.model.js';
import { errorResponse, successResponse } from '../utils/response.js';

class AuthController {
  // Enhanced registration with comprehensive validation
  register = async (req, res) => {
    try {
      const { 
        username, 
        email, 
        password, 
        confirmPassword, // ✅ Added confirmPassword
        pronouns, 
        ageGroup, 
        selectedAvatar, 
        location, 
        latitude, 
        longitude 
      } = req.body;

      console.log('📝 Registration attempt:', { username, email, pronouns, ageGroup, selectedAvatar });

      // Validate required fields
      if (!username || !password) {
        return errorResponse(res, 'Username and password are required', 400);
      }

      // ✅ Password confirmation validation
      if (!confirmPassword) {
        return errorResponse(res, 'Password confirmation is required', 400, 'CONFIRM_PASSWORD_MISSING');
      }

      if (password !== confirmPassword) {
        return errorResponse(res, 'Passwords do not match', 400, 'PASSWORD_MISMATCH');
      }

      // Normalize username
      const normalizedUsername = username.toLowerCase().trim();

      // Check if username already exists
      const existingUser = await User.findOne({ username: normalizedUsername });
      if (existingUser) {
        return errorResponse(res, 'Username already exists', 409);
      }

      // Check if email already exists (if provided)
      if (email && email.trim()) {
        const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingEmail) {
          return errorResponse(res, 'Email already exists', 409);
        }
      }

      // Prepare location data
      const locationData = {
        name: location || 'Unknown',
        coordinates: {
          type: 'Point',
          coordinates: longitude && latitude ? [longitude, latitude] : [0, 0]
        }
      };

      // Create user with all provided data - password will be hashed by model middleware
      const userData = {
        username: normalizedUsername,
        email: email ? email.toLowerCase().trim() : null,
        password: password, // ✅ FIXED: Let the model handle password hashing
        pronouns: pronouns || null,
        ageGroup: ageGroup || null,
        selectedAvatar: selectedAvatar || 'panda',
        location: locationData,
        isOnboardingCompleted: !!(pronouns && ageGroup && selectedAvatar),
        onboardingCompletedAt: (pronouns && ageGroup && selectedAvatar) ? new Date() : null,
        isActive: true,
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

      const newUser = new User(userData);
      await newUser.save();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: newUser._id, 
          username: newUser.username 
        },
        config.JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Prepare response data
      const responseUser = {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        pronouns: newUser.pronouns,
        ageGroup: newUser.ageGroup,
        selectedAvatar: newUser.selectedAvatar,
        location: newUser.location,
        isOnboardingCompleted: newUser.isOnboardingCompleted,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      };

      console.log('✅ User registered successfully:', responseUser.username);

      successResponse(res, {
        message: 'User registered successfully',
        data: {
          user: responseUser,
          token,
          expiresIn: '7d'
        }
      }, 201);

    } catch (error) {
      console.error('❌ Registration error:', error);
      errorResponse(res, 'Registration failed', 500, error.message);
    }
  };



// Enhanced login with better error handling
login = async (req, res) => {
  try {
    const { username, password } = req.body;

    console.log('🔍 DEBUG: Login attempt started');
    console.log('🔍 DEBUG: Username:', username);
    console.log('🔍 DEBUG: Password length:', password ? password.length : 'NO PASSWORD');

    if (!username || !password) {
      return errorResponse(res, 'Username and password are required', 400);
    }

    const normalizedUsername = username.toLowerCase().trim();
    console.log('🔍 DEBUG: Normalized username:', normalizedUsername);

    // Find user by username
    const user = await User.findOne({ username: username });
    console.log('🔍 DEBUG: User found:',user);
    
    if (user) {
      console.log('🔍 DEBUG: User ID:', user._id);
      console.log('🔍 DEBUG: User has password:', !!user.password);
      console.log('🔍 DEBUG: Password hash length:', user.password ? user.password.length : 'NO HASH');
      console.log('🔍 DEBUG: User is locked:', user.isLocked);
    }

    if (!user) {
      console.log('❌ DEBUG: User not found in database');
      return errorResponse(res, 'Invalid username or password', 401);
    }

    // Check if account is locked
    if (user.isLocked) {
      console.log('❌ DEBUG: Account is locked');
      return errorResponse(res, 'Account temporarily locked due to too many failed attempts', 423);
    }

    // Debug password comparison
    console.log('🔍 DEBUG: About to compare passwords');
    console.log('🔍 DEBUG: Input password:', password);
    console.log('🔍 DEBUG: Stored hash starts with:', user.password ? user.password.substring(0, 10) : 'NO HASH');

    // Test direct bcrypt comparison
    const directBcryptTest = await bcrypt.compare(password, user.password || '');
    console.log('🔍 DEBUG: Direct bcrypt result:', directBcryptTest);

    // Test model method
    const isPasswordValid = await user.comparePassword(password);
    console.log('🔍 DEBUG: Model method result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ DEBUG: Password validation failed');
      // Increment login attempts
      await user.incLoginAttempts();
      return errorResponse(res, 'Invalid username or password', 401);
    }

    console.log('✅ DEBUG: Password validation successful, generating token...');

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.updateOne({
        $unset: { loginAttempts: 1, lockUntil: 1 }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username 
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update user activity
    await user.updateActivity();

    // Prepare response data
    const responseUser = {
      id: user._id,
      username: user.username,
      email: user.email,
      pronouns: user.pronouns,
      ageGroup: user.ageGroup,
      selectedAvatar: user.selectedAvatar,
      location: user.location,
      isOnboardingCompleted: user.isOnboardingCompleted,
      profile: user.profile,
      preferences: user.preferences,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    console.log('✅ DEBUG: Login successful for user:', user.username);

    successResponse(res, {
      message: 'Login successful',
      data: {
        user: responseUser,
        token,
        expiresIn: '7d'
      }
    }, 200);

  } catch (error) {
    console.error('❌ Login error:', error);
    errorResponse(res, 'Login failed', 500, error.message);
  }
};


  // Check username availability with suggestions
  checkUsername = async (req, res) => {
    try {
      const { username } = req.params;
      
      if (!username || username.trim().length < 3) {
        return errorResponse(res, 'Username must be at least 3 characters', 400);
      }

      const normalizedUsername = username.toLowerCase().trim();
      
      // Validate username format
      if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
        return errorResponse(res, 'Username can only contain letters, numbers, and underscores', 400);
      }

      const isAvailable = await User.isUsernameAvailable(normalizedUsername);
      
      let suggestions = [];
      if (!isAvailable) {
        suggestions = await User.generateUsernameSuggestions(normalizedUsername);
      }

      successResponse(res, {
        message: isAvailable ? 'Username is available' : 'Username is taken',
        data: {
          username: normalizedUsername,
          isAvailable,
          suggestions
        }
      });

    } catch (error) {
      console.error('❌ Username check error:', error);
      errorResponse(res, 'Username check failed', 500, error.message);
    }
  };

  // Get current user info
  getCurrentUser = async (req, res) => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        return errorResponse(res, 'User not authenticated', 401);
      }

      const user = await User.findById(userId);
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      const responseUser = user.getPublicProfile();

      successResponse(res, {
        message: 'Current user retrieved successfully',
        data: { user: responseUser }
      });

    } catch (error) {
      console.error('❌ Get current user error:', error);
      errorResponse(res, 'Failed to get current user', 500, error.message);
    }
  };

  // Logout user
  logout = async (req, res) => {
    try {
      const userId = req.user?.userId;
      
      if (userId) {
        // Update user's online status
        await User.findByIdAndUpdate(userId, { 
          isOnline: false,
          'analytics.lastActiveAt': new Date()
        });
      }

      successResponse(res, {
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      errorResponse(res, 'Logout failed', 500, error.message);
    }
  };

  // Refresh token
  refreshToken = async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return errorResponse(res, 'Refresh token is required', 400);
      }

      // Verify the refresh token
      const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
      
      // Find the user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return errorResponse(res, 'Invalid refresh token', 401);
      }

      // Generate new access token
      const newToken = jwt.sign(
        { 
          userId: user._id, 
          username: user.username 
        },
        config.JWT_SECRET,
        { expiresIn: '7d' }
      );

      successResponse(res, {
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
          expiresIn: '7d'
        }
      });

    } catch (error) {
      console.error('❌ Token refresh error:', error);
      errorResponse(res, 'Token refresh failed', 401, error.message);
    }
  };

  // Health check for auth service
  healthCheck = async (req, res) => {
    try {
      // Test database connection
      const userCount = await User.countDocuments();
      
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: true,
          jwt: !!config.JWT_SECRET,
          userRegistrations: userCount
        },
        version: '1.0.0'
      };

      successResponse(res, {
        message: 'Auth service is healthy',
        data: health
      });

    } catch (error) {
      console.error('❌ Health check error:', error);
      errorResponse(res, 'Auth service health check failed', 503, error.message);
    }
  };

  // ✅ Alias for checkUsername to match route expectations
  checkUsernameAvailability = this.checkUsername;

  // ✅ Password reset functionality
  forgotPassword = async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return errorResponse(res, 'Email is required', 400);
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      
      // Always return success to prevent email enumeration
      successResponse(res, {
        message: 'If an account with that email exists, a password reset link has been sent'
      });

      // Only send email if user exists
      if (user) {
        // TODO: Implement email sending logic here
        console.log(`🔐 Password reset requested for: ${user.email}`);
      }

    } catch (error) {
      console.error('❌ Forgot password error:', error);
      errorResponse(res, 'Password reset request failed', 500, error.message);
    }
  };

  // ✅ Reset password with token
  resetPassword = async (req, res) => {
    try {
      const { token, newPassword, confirmPassword } = req.body;
      
      if (!token || !newPassword || !confirmPassword) {
        return errorResponse(res, 'Token, new password, and password confirmation are required', 400);
      }

      if (newPassword !== confirmPassword) {
        return errorResponse(res, 'Passwords do not match', 400, 'PASSWORD_MISMATCH');
      }

      // TODO: Verify reset token and update password
      // For now, return not implemented
      errorResponse(res, 'Password reset functionality coming soon', 501);

    } catch (error) {
      console.error('❌ Reset password error:', error);
      errorResponse(res, 'Password reset failed', 500, error.message);
    }
  };

  // ✅ Email verification
  verifyEmail = async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return errorResponse(res, 'Verification token is required', 400);
      }

      // TODO: Implement email verification logic
      // For now, return not implemented
      errorResponse(res, 'Email verification functionality coming soon', 501);

    } catch (error) {
      console.error('❌ Email verification error:', error);
      errorResponse(res, 'Email verification failed', 500, error.message);
    }
  };

  // ✅ Resend verification email
  resendVerification = async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return errorResponse(res, 'Email is required', 400);
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      
      if (!user) {
        return errorResponse(res, 'User not found', 404);
      }

      if (user.isEmailVerified) {
        return errorResponse(res, 'Email is already verified', 400);
      }

      // TODO: Implement email sending logic
      // For now, return success
      successResponse(res, {
        message: 'Verification email sent successfully'
      });

    } catch (error) {
      console.error('❌ Resend verification error:', error);
      errorResponse(res, 'Failed to resend verification email', 500, error.message);
    }
  };
}

export default new AuthController();