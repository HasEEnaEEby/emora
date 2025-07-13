# Manual Testing Guide for /api/user/home-data Endpoint

## Prerequisites
- Backend server running on `http://localhost:8000`
- curl command available (or use browser/Postman)

## Step 1: Register a Test User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "email": "test@example.com", 
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "pronouns": "They / Them",
    "ageGroup": "18-24",
    "selectedAvatar": "panda"
  }'
```

## Step 2: Login to Get Auth Token

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser123",
    "password": "SecurePass123!"
  }'
```

**Save the token from the response!** It looks like:
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {...}
  }
}
```

## Step 3: Create Test Emotion Data

Replace `YOUR_TOKEN_HERE` with the actual token from Step 2:

```bash
curl -X POST http://localhost:8000/api/emotions/log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "emotion": "joy",
    "intensity": 8,
    "context": "work",
    "notes": "Great day at work!",
    "location": {
      "name": "Office",
      "coordinates": [-74.006, 40.7128],
      "city": "New York",
      "country": "USA"
    }
  }'
```

Repeat with different emotions:

```bash
curl -X POST http://localhost:8000/api/emotions/log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "emotion": "gratitude",
    "intensity": 9,
    "context": "family",
    "notes": "Family dinner was amazing",
    "location": {
      "name": "Home",
      "coordinates": [-74.006, 40.7128],
      "city": "New York", 
      "country": "USA"
    }
  }'
```

## Step 4: Test Home Data Endpoint

Replace `YOUR_TOKEN_HERE` with your actual token:

```bash
curl -X GET http://localhost:8000/api/user/home-data \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

## Expected Response

You should see a response like:

```json
{
  "status": "success",
  "message": "Home data retrieved successfully",
  "data": {
    "user": {
      "id": "...",
      "username": "testuser123",
      "email": "test@example.com",
      "selectedAvatar": "panda",
      "pronouns": "They / Them",
      "ageGroup": "18-24"
    },
    "stats": {
      "totalEmotionEntries": 2,  // ← Should be > 0 if real data
      "totalMoodsLogged": 2,
      "currentStreak": 1,
      "daysSinceJoined": 0,
      "averageRating": 8.5
    },
    "recentEmotions": [...],     // ← Should contain your logged emotions
    "recommendations": [...],
    "insights": {...}
  }
}
```

## Success Indicators

✅ **Real Data Working**: If you see:
- `totalEmotionEntries > 0`
- `recentEmotions` array with actual data
- User-specific information

❌ **Mock Data Still Active**: If you see:
- `totalEmotionEntries: 0`
- Empty `recentEmotions` array
- Generic/placeholder data

## Method 2: Browser Testing

1. Open browser developer tools (F12)
2. Go to Network tab
3. Visit: `http://localhost:8000/api/health`
4. Use the browser console to run JavaScript:

```javascript
// First register and login (paste the register/login curl commands as fetch requests)

// Then test home data:
fetch('http://localhost:8000/api/user/home-data', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('Home Data:', data));
```

## Method 3: Postman/Insomnia Testing

1. Create a new collection
2. Add requests for:
   - POST `/api/auth/register`
   - POST `/api/auth/login` 
   - POST `/api/emotions/log` (multiple times)
   - GET `/api/user/home-data`
3. Use the login token in Authorization header for protected routes

## Troubleshooting

### If you get authentication errors:
- Make sure the token is properly formatted: `Bearer <token>`
- Check that the token hasn't expired (7 days)
- Verify the token was copied completely

### If emotions aren't showing up:
- Check emotion logging endpoint returns success
- Wait a few seconds for database processing
- Verify emotion data format matches the API spec

### If home-data still returns mock data:
- Check that the user analytics are being updated
- Verify the emotion controller is properly updating user stats
- Check database connection and data persistence 