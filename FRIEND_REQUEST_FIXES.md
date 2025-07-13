# Friend Request Timeout Fixes

## Issues Identified

1. **Database Performance Issues**: The friend controller was using inefficient array operations on embedded arrays without proper indexing
2. **Multiple Database Queries**: The `sendFriendRequest` method was making multiple separate database calls
3. **Timeout Configuration**: Both backend and frontend had mismatched timeout settings
4. **Rate Limiting**: The rate limiting was working correctly but causing 429 errors after timeouts

## Fixes Implemented

### 1. Database Indexes (user.model.js)
```javascript
// ✅ ADDED: Indexes for friend arrays to improve performance
userSchema.index({ 'friends.userId': 1 });
userSchema.index({ 'friendRequests.sent.userId': 1 });
userSchema.index({ 'friendRequests.received.userId': 1 });
userSchema.index({ 'friends.status': 1 });
userSchema.index({ 'friends.userId': 1, 'friends.status': 1 });
```

### 2. Optimized Friend Controller (friend.controller.js)
- **Replaced multiple queries with single aggregation**: Used `User.aggregate()` to fetch both users in one query
- **Replaced individual updates with bulk operations**: Used `User.bulkWrite()` for better performance
- **Reduced database round trips**: Combined operations to minimize network calls

### 3. Server Timeout Configuration (server.js)
```javascript
// ✅ ADDED: Configure server timeouts
server.timeout = 120000; // 2 minutes
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds
```

### 4. Timeout Middleware (error.middleware.js)
```javascript
// ✅ ADDED: Timeout middleware for long-running requests
export const timeoutMiddleware = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`⚠️ Request timeout after ${timeoutMs}ms: ${req.method} ${req.originalUrl}`);
        res.status(408).json({
          success: false,
          message: 'Request timeout - please try again',
          errorCode: 'REQUEST_TIMEOUT',
          timestamp: new Date().toISOString()
        });
      }
    }, timeoutMs);
    // ... cleanup logic
  };
};
```

### 5. Applied Timeout Middleware to Friend Routes (friend.routes.js)
```javascript
// ✅ ADDED: Apply timeout middleware to all friend routes
router.use(timeoutMiddleware(45000)); // 45 seconds timeout
```

### 6. Enhanced Error Handling (error.middleware.js)
```javascript
// ✅ ADDED: Timeout errors
if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
  const message = 'Request timeout - please try again';
  error = { message, statusCode: 408 };
}

// ✅ ADDED: Database connection errors
if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
  const message = 'Database connection error - please try again';
  error = { message, statusCode: 503 };
}
```

### 7. Flutter App Timeout Updates
- **dio_client.dart**: Increased timeouts from 30s to 60s
- **enhanced_api_service.dart**: Increased timeout from 30s to 60s

## Performance Improvements

### Before:
- Multiple separate database queries
- Array operations without indexes
- 30-second timeouts
- No timeout handling

### After:
- Single aggregation queries
- Bulk database operations
- Proper database indexes
- 45-60 second timeouts
- Comprehensive timeout handling
- Better error messages

## Testing

Created `test-friend-request.js` to verify the fixes:
```bash
node test-friend-request.js
```

## Expected Results

1. **Faster Response Times**: Friend requests should complete in under 5 seconds
2. **No More Timeouts**: Proper timeout handling prevents 30-second hangs
3. **Better Error Messages**: Clear error messages for different failure scenarios
4. **Rate Limiting**: Proper 429 responses instead of timeouts

## Monitoring

Monitor the following logs for performance:
- `logger.info('Friend request sent from ${currentUserId} to ${userId}')`
- `logger.warn('⚠️ Request timeout after ${timeoutMs}ms')`
- Database query performance in MongoDB logs 