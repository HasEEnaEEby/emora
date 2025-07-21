
import axios from 'axios';

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.redirectUri = process.env.CLIENT_URL + '/spotify/callback';
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Initialize with app credentials
    this.initializeAppToken();
  }

  /**
   * Initialize app-only access token for searching music
   */
  async initializeAppToken() {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', 
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      console.log('✅ Spotify app token initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Spotify token:', error.response?.data || error.message);
    }
  }

  /**
   * Ensure we have a valid access token
   */
  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.initializeAppToken();
    }
  }

  /**
   * Get mood-based search terms
   */
  getMoodSearchTerms(mood) {
    const moodMap = {
      'happy': ['happy', 'upbeat', 'feel good', 'cheerful', 'joyful', 'positive', 'bright'],
      'sad': ['sad', 'melancholy', 'emotional', 'heartbreak', 'lonely', 'blue', 'somber'],
      'calm': ['chill', 'relaxing', 'peaceful', 'zen', 'ambient', 'serene', 'tranquil'],
      'energetic': ['energetic', 'pump up', 'workout', 'intense', 'powerful', 'dynamic'],
      'romantic': ['love', 'romantic', 'intimate', 'passionate', 'soulful', 'tender'],
      'focus': ['focus', 'concentration', 'study', 'minimal', 'instrumental', 'productivity'],
      'angry': ['angry', 'aggressive', 'intense', 'rage', 'heavy', 'fierce'],
      'excited': ['excited', 'party', 'celebration', 'fun', 'wild', 'energized'],
      'nostalgic': ['nostalgic', 'throwback', 'classic', 'vintage', 'memories', 'retro'],
      'confident': ['confident', 'boss', 'swagger', 'powerful', 'strong', 'bold'],
      'anxious': ['calming', 'soothing', 'anxiety relief', 'peaceful', 'gentle'],
      'grateful': ['grateful', 'thankful', 'blessed', 'appreciation', 'inspirational'],
      'stressed': ['stress relief', 'relaxation', 'meditation', 'calm', 'healing']
    };

    return moodMap[mood.toLowerCase()] || ['music', 'songs', 'playlist'];
  }

  /**
   * Get music genres for mood
   */
  getMoodGenres(mood) {
    const genreMap = {
      'happy': ['pop', 'dance', 'funk', 'reggae', 'indie-pop'],
      'sad': ['indie', 'alternative', 'folk', 'singer-songwriter', 'acoustic'],
      'calm': ['ambient', 'classical', 'jazz', 'lo-fi', 'new-age'],
      'energetic': ['rock', 'electronic', 'hip-hop', 'metal', 'punk'],
      'romantic': ['r-n-b', 'soul', 'jazz', 'pop', 'indie'],
      'focus': ['ambient', 'classical', 'instrumental', 'minimal-techno', 'post-rock'],
      'angry': ['metal', 'punk', 'hardcore', 'rock', 'industrial'],
      'excited': ['dance', 'electronic', 'party', 'disco', 'house'],
      'nostalgic': ['classic-rock', 'oldies', '80s', '90s', 'retro'],
      'confident': ['hip-hop', 'rap', 'rock', 'pop', 'r-n-b']
    };

    return genreMap[mood.toLowerCase()] || ['pop', 'rock', 'indie'];
  }

  /**
   * Search for tracks by mood
   */
  async searchTracksByMood(mood, limit = 20) {
    await this.ensureValidToken();

    try {
      const searchTerms = this.getMoodSearchTerms(mood);
      const genres = this.getMoodGenres(mood);
      
      // Create multiple search queries to get variety
      const queries = [
        ...searchTerms.slice(0, 3),
        ...genres.slice(0, 2).map(genre => `genre:${genre}`)
      ];

      const allTracks = [];

      // Search with different terms to get variety
      for (const query of queries) {
        try {
          const response = await axios.get('https://api.spotify.com/v1/search', {
            headers: {
              'Authorization': `Bearer ${this.accessToken}`
            },
            params: {
              q: query,
              type: 'track',
              limit: Math.ceil(limit / queries.length),
              market: 'US'
            }
          });

          if (response.data.tracks?.items) {
            allTracks.push(...response.data.tracks.items);
          }
        } catch (queryError) {
          console.warn(`⚠️ Query failed for: ${query}`, queryError.message);
        }
      }

      // Remove duplicates and format tracks
      const uniqueTracks = this.removeDuplicateTracks(allTracks);
      const formattedTracks = this.formatTracks(uniqueTracks);

      // Shuffle and limit results
      const shuffledTracks = this.shuffleArray(formattedTracks).slice(0, limit);

      console.log(`✅ Found ${shuffledTracks.length} tracks for mood: ${mood}`);
      return shuffledTracks;

    } catch (error) {
      console.error('❌ Search tracks error:', error.response?.data || error.message);
      throw new Error('Failed to search tracks');
    }
  }

  /**
   * Generate a playlist for a specific mood
   */
  async getPlaylistForMood(mood) {
    try {
      const tracks = await this.searchTracksByMood(mood, 25);
      
      if (!tracks || tracks.length === 0) {
        return null;
      }

      const playlistData = {
        id: `emora-${mood}-${Date.now()}`,
        name: this.generatePlaylistName(mood),
        description: this.generatePlaylistDescription(mood),
        mood: mood,
        trackCount: tracks.length,
        tracks: tracks,
        duration: this.calculateTotalDuration(tracks),
        created: new Date().toISOString(),
        coverImage: this.getPlaylistCoverImage(mood),
        spotifyUrl: null, // Will be null for generated playlists
        genres: this.getMoodGenres(mood),
        energy: this.getMoodEnergy(mood),
        valence: this.getMoodValence(mood)
      };

      console.log(`✅ Generated playlist "${playlistData.name}" with ${tracks.length} tracks`);
      return playlistData;

    } catch (error) {
      console.error('❌ Generate playlist error:', error);
      throw new Error('Failed to generate playlist');
    }
  }

  /**
   * Generate creative playlist names
   */
  generatePlaylistName(mood) {
    const nameTemplates = {
      'happy': ['Sunshine Vibes', 'Happy Hour Mix', 'Feel Good Favorites', 'Joy Unleashed', 'Bright Day Beats'],
      'sad': ['Rainy Day Reflection', 'Melancholy Moments', 'Emotional Journey', 'Healing Hearts', 'Quiet Contemplation'],
      'calm': ['Peaceful Escape', 'Zen Garden', 'Tranquil Waters', 'Mindful Moments', 'Serene Sounds'],
      'energetic': ['Power Surge', 'High Voltage', 'Energy Boost', 'Adrenaline Rush', 'Electric Pulse'],
      'romantic': ['Love Letters', 'Romantic Rendezvous', 'Heartstrings', 'Passionate Playlist', 'Love Lounge'],
      'focus': ['Deep Focus', 'Concentration Zone', 'Study Session', 'Mindful Productivity', 'Flow State'],
      'angry': ['Rage Release', 'Anger Outlet', 'Fury Unleashed', 'Intense Energy', 'Raw Power'],
      'excited': ['Excitement Explosion', 'Party Mode', 'Celebration Central', 'Hype Train', 'Electric Energy'],
      'nostalgic': ['Memory Lane', 'Throwback Thursday', 'Vintage Vibes', 'Golden Oldies', 'Nostalgic Journey'],
      'confident': ['Boss Mode', 'Confidence Boost', 'Swagger Station', 'Power Moves', 'Unstoppable'],
      'anxious': ['Anxiety Relief', 'Calming Comfort', 'Peaceful Mind', 'Stress Soother', 'Gentle Healing'],
      'grateful': ['Gratitude Flow', 'Thankful Heart', 'Blessed Vibes', 'Appreciation Station', 'Grateful Soul'],
      'stressed': ['Stress Relief', 'Relaxation Remedy', 'Calm & Collected', 'Unwind Time', 'Peace & Quiet']
    };

    const templates = nameTemplates[mood.toLowerCase()] || ['Custom Mood Mix', 'Emotional Journey', 'Vibe Check'];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  /**
   * Generate playlist descriptions
   */
  generatePlaylistDescription(mood) {
    const descriptions = {
      'happy': 'Uplifting tracks to boost your mood and spread positive vibes.',
      'sad': 'Emotional songs for reflection and healing during tough times.',
      'calm': 'Peaceful melodies to help you relax and find inner tranquility.',
      'energetic': 'High-energy tracks to fuel your workout and boost motivation.',
      'romantic': 'Intimate songs perfect for romantic moments and date nights.',
      'focus': 'Instrumental and minimal tracks designed for deep concentration.',
      'angry': 'Intense music to help you channel and release your anger.',
      'excited': 'Party anthems and celebration songs for your most exciting moments.',
      'nostalgic': 'Classic hits that transport you back to cherished memories.',
      'confident': 'Empowering tracks to boost your confidence and self-esteem.',
      'anxious': 'Soothing melodies to ease anxiety and promote relaxation.',
      'grateful': 'Inspirational songs that celebrate gratitude and appreciation.',
      'stressed': 'Calming music designed to reduce stress and restore peace.'
    };

    return descriptions[mood.toLowerCase()] || 'Curated tracks that match your current emotional state.';
  }

  /**
   * Get featured playlists from Spotify
   */
  async getFeaturedPlaylists() {
    await this.ensureValidToken();

    try {
      const response = await axios.get('https://api.spotify.com/v1/browse/featured-playlists', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          limit: 20,
          country: 'US'
        }
      });

      return response.data.playlists.items.map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        image: playlist.images?.[0]?.url,
        trackCount: playlist.tracks.total,
        spotifyUrl: playlist.external_urls.spotify,
        owner: playlist.owner.display_name
      }));

    } catch (error) {
      console.error('❌ Featured playlists error:', error);
      return [];
    }
  }

  /**
   * Format track data for consistent response
   */
  formatTracks(tracks) {
    return tracks.map(track => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      duration: track.duration_ms,
      durationFormatted: this.formatDuration(track.duration_ms),
      preview: track.preview_url,
      spotifyUrl: track.external_urls.spotify,
      uri: track.uri,
      image: track.album.images?.[0]?.url,
      popularity: track.popularity,
      explicit: track.explicit,
      releaseDate: track.album.release_date
    }));
  }

  /**
   * Remove duplicate tracks by ID
   */
  removeDuplicateTracks(tracks) {
    const seen = new Set();
    return tracks.filter(track => {
      if (seen.has(track.id)) {
        return false;
      }
      seen.add(track.id);
      return true;
    });
  }

  /**
   * Shuffle array randomly
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Format duration from milliseconds to MM:SS
   */
  formatDuration(durationMs) {
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Calculate total playlist duration
   */
  calculateTotalDuration(tracks) {
    const totalMs = tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
    const totalMinutes = Math.floor(totalMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  /**
   * Get playlist cover image based on mood
   */
  getPlaylistCoverImage(mood) {
    // You can add custom mood-based images here
    const imageMap = {
      'happy': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
      'sad': 'https://images.unsplash.com/photo-1499920637423-0e2b1e3c87a0?w=300&h=300&fit=crop',
      'calm': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=300&fit=crop',
      'energetic': 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=300&fit=crop',
      'romantic': 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=300&h=300&fit=crop'
    };

    return imageMap[mood.toLowerCase()] || 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop';
  }

  /**
   * Get mood energy level (0-1)
   */
  getMoodEnergy(mood) {
    const energyMap = {
      'happy': 0.8,
      'sad': 0.2,
      'calm': 0.1,
      'energetic': 0.95,
      'romantic': 0.4,
      'focus': 0.3,
      'angry': 0.9,
      'excited': 0.95,
      'nostalgic': 0.5,
      'confident': 0.8,
      'anxious': 0.2,
      'grateful': 0.6,
      'stressed': 0.1
    };

    return energyMap[mood.toLowerCase()] || 0.5;
  }

  /**
   * Get mood valence level (0-1, negative to positive)
   */
  getMoodValence(mood) {
    const valenceMap = {
      'happy': 0.9,
      'sad': 0.1,
      'calm': 0.7,
      'energetic': 0.8,
      'romantic': 0.8,
      'focus': 0.5,
      'angry': 0.1,
      'excited': 0.9,
      'nostalgic': 0.4,
      'confident': 0.8,
      'anxious': 0.2,
      'grateful': 0.9,
      'stressed': 0.2
    };

    return valenceMap[mood.toLowerCase()] || 0.5;
  }

  /**
   * Play a track (requires user authentication and Spotify Premium)
   */
  async playTrack(trackUri, deviceId = null) {
    // This requires user OAuth token, not app token
    throw new Error('Track playback requires user authentication. Please implement OAuth flow.');
  }

  /**
   * Get user's devices (requires user authentication)
   */
  async getDevices() {
    throw new Error('Getting devices requires user authentication. Please implement OAuth flow.');
  }

  /**
   * Get Spotify authorization URL
   */
  getAuthUrl() {
    const scopes = [
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'playlist-read-private',
      'playlist-read-collaborative'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes,
      state: 'emora-spotify-auth'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  /**
   * Handle authorization callback
   */
  async handleCallback(code) {
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('❌ Callback error:', error.response?.data || error.message);
      throw new Error('Failed to exchange code for tokens');
    }
  }
}

export default SpotifyService;