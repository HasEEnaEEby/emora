// src/controllers/spotify.controller.js
import axios from 'axios';
import config from '../config/index.js';
import { successResponse, errorResponse } from '../utils/response.js';

class SpotifyController {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  getAccessToken = async () => {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${config.SPOTIFY_CLIENT_ID}:${config.SPOTIFY_CLIENT_SECRET}`
      ).toString('base64');

      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
      console.log('✅ Spotify access token obtained');
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get Spotify access token:', error.message);
      throw new Error('Spotify authentication failed');
    }
  };

  getPlaylistForMood = async (req, res) => {
    try {
      const { mood, emotion, energy, valence, limit = 10 } = req.query;
      
      if (!mood && !emotion) {
        return errorResponse(res, 'Mood or emotion parameter is required', 400);
      }

      const searchMood = mood || emotion;
      console.log(`🎵 Searching Spotify playlists for mood: ${searchMood}`);

      const token = await this.getAccessToken();
      const searchQuery = this.buildSearchQuery(searchMood, energy, valence);
      
      const searchResponse = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=playlist&limit=${limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const playlists = searchResponse.data.playlists.items;
      
      if (playlists.length === 0) {
        return successResponse(res, {
          message: 'No playlists found for this mood',
          data: { playlist: null, searchQuery, mood: searchMood }
        });
      }

      const selectedPlaylist = this.selectBestPlaylist(playlists, searchMood);
      
      const tracksResponse = await axios.get(
        `https://api.spotify.com/v1/playlists/${selectedPlaylist.id}/tracks?limit=20`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const tracks = tracksResponse.data.items
        .filter(item => item.track)
        .map(item => ({
          id: item.track.id,
          name: item.track.name,
          artists: item.track.artists.map(artist => artist.name).join(', '),
          previewUrl: item.track.preview_url,
          spotifyUrl: item.track.external_urls.spotify,
          durationMs: item.track.duration_ms,
          imageUrl: item.track.album.images[0]?.url || null,
          album: item.track.album.name,
          popularity: item.track.popularity
        }));

      const playlistData = {
        id: selectedPlaylist.id,
        name: selectedPlaylist.name,
        description: selectedPlaylist.description || '',
        imageUrl: selectedPlaylist.images[0]?.url || null,
        trackCount: selectedPlaylist.tracks.total,
        spotifyUrl: selectedPlaylist.external_urls.spotify,
        tracks: tracks,
        moodMatch: this.calculateMoodMatch(selectedPlaylist, searchMood),
        searchQuery,
        mood: searchMood
      };

      console.log(`✅ Found playlist: ${playlistData.name} with ${tracks.length} tracks`);

      successResponse(res, {
        message: 'Playlist recommendation retrieved successfully',
        data: { playlist: playlistData }
      });

    } catch (error) {
      console.error('❌ Spotify API error:', error.message);
      errorResponse(res, 'Failed to get playlist recommendation', 500, error.message);
    }
  };

  buildSearchQuery(mood, energy, valence) {
    const moodLower = mood.toLowerCase();
    
    const moodQueries = {
      'happy': 'happy upbeat feel good positive',
      'joy': 'joyful uplifting positive energy',
      'excited': 'energetic dance party upbeat',
      'sad': 'sad emotional melancholy heartbreak',
      'angry': 'rock alternative intense aggressive',
      'frustrated': 'punk rock metal intense',
      'calm': 'chill relaxing peaceful ambient',
      'peaceful': 'meditation zen peaceful calm',
      'stressed': 'stress relief calming soothing',
      'anxious': 'anxiety relief meditation calming',
      'love': 'romantic love songs r&b soul',
      'grateful': 'uplifting inspirational positive',
      'gratitude': 'grateful thankful inspirational',
      'nostalgic': 'throwback nostalgic memories',
      'lonely': 'comforting healing supportive',
      'content': 'peaceful content satisfied',
      'hopeful': 'hopeful inspiring uplifting'
    };

    let query = moodQueries[moodLower] || `${moodLower} mood music`;

    if (energy !== undefined) {
      const energyLevel = parseFloat(energy);
      if (energyLevel > 0.7) query += ' high energy dance';
      else if (energyLevel < 0.3) query += ' low energy ambient';
    }

    if (valence !== undefined) {
      const valenceLevel = parseFloat(valence);
      if (valenceLevel > 0.7) query += ' positive happy';
      else if (valenceLevel < 0.3) query += ' emotional deep sad';
    }

    return query;
  }

  selectBestPlaylist(playlists, mood) {
    let bestPlaylist = playlists[0];
    let bestScore = 0;

    for (const playlist of playlists) {
      let score = 0;
      const name = playlist.name.toLowerCase();
      const description = (playlist.description || '').toLowerCase();
      const trackCount = playlist.tracks.total;

      if (trackCount > 20 && trackCount < 200) score += 3;
      if (trackCount >= 10) score += 1;

      const moodKeywords = this.getMoodKeywords(mood);
      for (const keyword of moodKeywords) {
        if (name.includes(keyword)) score += 4;
        if (description.includes(keyword)) score += 2;
      }

      if (playlist.followers?.total > 1000) score += 2;
      if (playlist.followers?.total > 10000) score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestPlaylist = playlist;
      }
    }

    return bestPlaylist;
  }

  getMoodKeywords(mood) {
    const keywordMap = {
      'happy': ['happy', 'joy', 'positive', 'upbeat', 'feel good', 'cheerful'],
      'sad': ['sad', 'melancholy', 'emotional', 'heartbreak', 'blue', 'down'],
      'calm': ['chill', 'calm', 'peaceful', 'relaxing', 'zen', 'serene'],
      'angry': ['rock', 'metal', 'aggressive', 'intense', 'punk', 'hard'],
      'love': ['love', 'romantic', 'heart', 'valentine', 'romance', 'soul'],
      'anxious': ['calm', 'peaceful', 'meditation', 'soothing', 'relief'],
      'excited': ['party', 'dance', 'energy', 'pump', 'hype', 'upbeat'],
      'grateful': ['grateful', 'thankful', 'blessed', 'appreciation', 'positive'],
      'gratitude': ['grateful', 'thankful', 'blessed', 'appreciation', 'positive']
    };
    
    return keywordMap[mood.toLowerCase()] || [mood.toLowerCase()];
  }

  calculateMoodMatch(playlist, mood) {
    const name = playlist.name.toLowerCase();
    const description = (playlist.description || '').toLowerCase();
    const keywords = this.getMoodKeywords(mood);
    
    let score = 0.5;
    for (const keyword of keywords) {
      if (name.includes(keyword)) score += 0.15;
      if (description.includes(keyword)) score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  getFeaturedPlaylists = async (req, res) => {
    try {
      const token = await this.getAccessToken();
      const { limit = 10 } = req.query;

      const response = await axios.get(
        `https://api.spotify.com/v1/browse/featured-playlists?limit=${limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const playlists = response.data.playlists.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description || '',
        imageUrl: playlist.images[0]?.url || null,
        trackCount: playlist.tracks.total,
        spotifyUrl: playlist.external_urls.spotify
      }));

      successResponse(res, {
        message: 'Featured playlists retrieved successfully',
        data: { playlists }
      });

    } catch (error) {
      errorResponse(res, 'Failed to get featured playlists', 500, error.message);
    }
  };

  searchTracksByMood = async (req, res) => {
    try {
      const { mood, limit = 20 } = req.query;
      const token = await this.getAccessToken();
      
      const searchQuery = this.buildSearchQuery(mood);
      
      const response = await axios.get(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=${limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      const tracks = response.data.tracks.items.map(track => ({
        id: track.id,
        name: track.name,
        artists: track.artists.map(artist => artist.name).join(', '),
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls.spotify,
        durationMs: track.duration_ms,
        imageUrl: track.album.images[0]?.url || null,
        album: track.album.name,
        popularity: track.popularity
      }));

      successResponse(res, {
        message: 'Tracks retrieved successfully',
        data: { tracks, searchQuery }
      });

    } catch (error) {
      errorResponse(res, 'Failed to search tracks', 500, error.message);
    }
  };
}

export default new SpotifyController(); 