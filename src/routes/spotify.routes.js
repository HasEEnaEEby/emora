// src/routes/spotify.routes.js
import express from 'express';
import SpotifyService from '../services/spotify.service.js';
import { auth } from '../middleware/auth.middleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();
const spotifyService = new SpotifyService();

// Rate limiting for Spotify API calls
const spotifyRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  message: {
    success: false,
    message: 'Too many Spotify requests, please try again later.'
  }
});

// Apply rate limiting to all Spotify routes
router.use(spotifyRateLimit);

/**
 * @route GET /api/spotify/playlist
 * @desc Get mood-based playlist recommendation
 * @access Private
 */
router.get('/playlist', auth, async (req, res) => {
  try {
    console.log('🎵 Starting playlist request for user:', req.user?.id);
    console.log('📝 Query params:', req.query);

    const { mood } = req.query;

    // Validate mood parameter
    if (!mood || typeof mood !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Mood parameter is required',
        timestamp: new Date().toISOString()
      });
    }

    console.log('🎭 Processing mood:', mood);

    // Get playlist recommendation
    const playlistData = await spotifyService.getPlaylistForMood(mood.toLowerCase());

    if (!playlistData) {
      return res.status(404).json({
        success: false,
        message: 'No playlist found for this mood. Try: happy, sad, calm, energetic, romantic, focus',
        timestamp: new Date().toISOString()
      });
    }

    console.log('✅ Playlist generated successfully:', playlistData.name);

    res.json({
      success: true,
      data: {
        playlist: playlistData,
        mood: mood.toLowerCase(),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 Playlist Error Stack:');
    console.error(error.stack);

    res.status(500).json({
      success: false,
      message: 'Failed to get playlist recommendation',
      timestamp: new Date().toISOString(),
      errors: error.message
    });
  }
});

/**
 * @route GET /api/spotify/tracks
 * @desc Search tracks by mood with random selection
 * @access Private
 */
router.get('/tracks', auth, async (req, res) => {
  try {
    const { mood, limit = 20 } = req.query;

    if (!mood) {
      return res.status(400).json({
        success: false,
        message: 'Mood parameter is required'
      });
    }

    const tracks = await spotifyService.searchTracksByMood(mood, parseInt(limit));

    res.json({
      success: true,
      data: {
        tracks,
        mood,
        count: tracks.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 Tracks Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search tracks',
      errors: error.message
    });
  }
});

/**
 * @route GET /api/spotify/featured
 * @desc Get featured playlists
 * @access Private
 */
router.get('/featured', auth, async (req, res) => {
  try {
    const playlists = await spotifyService.getFeaturedPlaylists();

    res.json({
      success: true,
      data: {
        playlists,
        count: playlists.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 Featured Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get featured playlists',
      errors: error.message
    });
  }
});

/**
 * @route POST /api/spotify/play
 * @desc Play a track (requires Spotify Premium)
 * @access Private
 */
router.post('/play', auth, async (req, res) => {
  try {
    const { trackUri, deviceId } = req.body;

    if (!trackUri) {
      return res.status(400).json({
        success: false,
        message: 'Track URI is required'
      });
    }

    const result = await spotifyService.playTrack(trackUri, deviceId);

    res.json({
      success: true,
      data: result,
      message: 'Track started playing',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Play Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to play track',
      errors: error.message
    });
  }
});

/**
 * @route GET /api/spotify/devices
 * @desc Get user's available devices
 * @access Private
 */
router.get('/devices', auth, async (req, res) => {
  try {
    const devices = await spotifyService.getDevices();

    res.json({
      success: true,
      data: {
        devices,
        count: devices.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('💥 Devices Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get devices',
      errors: error.message
    });
  }
});

/**
 * @route GET /api/spotify/auth-url
 * @desc Get Spotify authorization URL
 * @access Private
 */
router.get('/auth-url', auth, async (req, res) => {
  try {
    const authUrl = spotifyService.getAuthUrl();

    res.json({
      success: true,
      data: {
        authUrl,
        message: 'Redirect user to this URL to authorize Spotify access'
      }
    });

  } catch (error) {
    console.error('💥 Auth URL Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate auth URL',
      errors: error.message
    });
  }
});

/**
 * @route POST /api/spotify/callback
 * @desc Handle Spotify authorization callback
 * @access Private
 */
router.post('/callback', auth, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code is required'
      });
    }

    const tokens = await spotifyService.handleCallback(code);

    // Store tokens for user (you might want to save to database)
    res.json({
      success: true,
      data: {
        message: 'Spotify authorization successful',
        expiresIn: tokens.expires_in
      }
    });

  } catch (error) {
    console.error('💥 Callback Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle Spotify callback',
      errors: error.message
    });
  }
});

export default router;
