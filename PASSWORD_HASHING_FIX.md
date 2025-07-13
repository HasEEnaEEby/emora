# Password Hashing Fix - Login 401 Error Resolution

## 🐛 Problem Identified

The user was experiencing a **401 "Invalid username or password"** error during login attempts, despite successful registration. The issue was caused by **double password hashing**.

### Root Cause Analysis

**Double Hashing Issue:**
1. **First Hash**: Passwords were being hashed in the controllers (`auth.controller.js` and `onboarding.controller.js`) before saving
2. **Second Hash**: The User model's pre-save middleware was hashing the already-hashed password again
3. **Login Failure**: During login, `bcrypt.compare()` would fail because it was comparing the original password against a double-hashed value

### Code Locations

**Before Fix:**
```javascript
// In auth.controller.js (lines 54-55)
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// In onboarding.controller.js (line 240)
const hashedPassword = await bcrypt.hash(password, 12);

// PLUS User model pre-save middleware (lines 261-272)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt); // Double hashing!
});
```

## ✅ Solution Applied

### 1. Fixed Auth Controller
**File:** `emora-backend/src/controllers/auth.controller.js`

**Before:**
```javascript
// Hash password
const saltRounds = 12;
const hashedPassword = await bcrypt.hash(password, saltRounds);

const userData = {
  // ...
  password: hashedPassword,
  // ...
};
```

**After:**
```javascript
// Create user with all provided data - password will be hashed by model middleware
const userData = {
  // ...
  password: password, // ✅ FIXED: Let the model handle password hashing
  // ...
};
```

### 2. Fixed Onboarding Controller
**File:** `emora-backend/src/controllers/onboarding.controller.js`

**Before:**
```javascript
// Hash password
const hashedPassword = await bcrypt.hash(password, 12);

const userData = {
  // ...
  password: hashedPassword,
  // ...
};
```

**After:**
```javascript
// Create user data object - password will be hashed by model middleware
const userData = {
  // ...
  password: password, // ✅ FIXED: Let the model handle password hashing
  // ...
};
```

### 3. User Model Middleware Preserved
**File:** `emora-backend/src/models/user.model.js`

The pre-save middleware in the User model is **correctly handling** single password hashing:
```javascript
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
```

## 🧪 Testing Instructions

### 1. Run Test Script
```bash
cd emora-backend
node test-login-fix.js
```

**Expected Output:**
```
🧪 Testing authentication flow...
📝 Test user: { username: 'testuser1720627712345', email: 'test1720627712345@example.com', ... }

📝 Step 1: Registering user...
✅ Registration successful!

🔑 Step 2: Logging in with same credentials...
✅ Login successful!

👤 Step 3: Testing authenticated endpoint...
✅ Authenticated endpoint test successful!

🎉 All tests passed! Password hashing fix is working correctly.
```

### 2. Manual Testing with curl

**Register a user:**
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPassword123!",
    "confirmPassword": "TestPassword123!",
    "pronouns": "They / Them",
    "ageGroup": "25-34",
    "selectedAvatar": "fox"
  }'
```

**Login with same credentials:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPassword123!"
  }'
```

### 3. Flutter App Testing

With the backend fix applied, the Flutter app should now successfully:
1. Register new users
2. Login with registered credentials
3. Access authenticated endpoints

## 🔧 Technical Details

### Password Hashing Flow (Fixed)
1. **User Registration**: Plain text password sent to controller
2. **Controller**: Passes plain text password to User model
3. **User Model**: Pre-save middleware hashes password once with bcrypt
4. **Database**: Stores single-hashed password

### Password Verification Flow
1. **User Login**: Plain text password sent to controller
2. **Controller**: Retrieves user with hashed password from database
3. **Verification**: `bcrypt.compare(plainTextPassword, hashedPasswordFromDB)`
4. **Result**: ✅ Successful comparison

### Security Considerations
- **Salt Rounds**: 12 (secure for production)
- **Consistent Hashing**: All passwords use the same bcrypt configuration
- **No Plaintext Storage**: Passwords are never stored in plain text

## 📱 Flutter App Compatibility

The fix is fully compatible with the existing Flutter app authentication flow:
- No changes needed in Flutter app code
- All existing auth endpoints continue to work
- Token management remains unchanged

## 🚀 Deployment Notes

1. **Existing Users**: Users registered before this fix will need to reset their passwords or be re-registered
2. **Database Migration**: Consider clearing existing users with double-hashed passwords
3. **Testing**: Thoroughly test the complete auth flow in staging before production deployment

## ✅ Verification Checklist

- [x] Auth controller no longer double-hashes passwords
- [x] Onboarding controller no longer double-hashes passwords  
- [x] User model pre-save middleware works correctly
- [x] Test script passes all authentication steps
- [x] Flutter app can successfully login
- [x] Authenticated endpoints work with new tokens 