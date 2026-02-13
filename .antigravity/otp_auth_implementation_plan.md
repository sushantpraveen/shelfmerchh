# OTP-Based Authentication Implementation Plan

## Overview
Replace password-based authentication with OTP (One-Time Password) verification for both login and signup flows.

## Implementation Steps

### Phase 1: Frontend Components

#### 1. Create Reusable OTP Input Component
**File**: `src/components/ui/OTPInput.tsx`
- 6-digit input fields
- Auto-focus next field
- Paste support
- Backspace navigation
- Used for: Login OTP, Phone verification, Email verification

#### 2. Redesign Auth.tsx
**File**: `src/pages/Auth.tsx`

**Login Flow**:
```
Step 1: Enter phone/email → Click Continue
Step 2: Show OTP input below (expand, don't navigate)
Step 3: Verify OTP → Login → Redirect to /dashboard
```

**Signup Flow**:
```
Step 1: Name + Phone → Click Continue
Step 2: Show OTP input below → Verify phone
Step 3: Show Email input below → Click Continue
Step 4: Show OTP input below → Verify email
Step 5: Create account → Auto login → Redirect to /dashboard
```

### Phase 2: Backend API

#### 1. Update User Model
**File**: `backend/models/User.js`

Add fields:
```javascript
{
  phone: {
    type: String,
    unique: true,
    sparse: true,
    required: false  // For backward compatibility
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  phoneOTP: String,
  phoneOTPExpiry: Date,
  emailOTP: String,
  emailOTPExpiry: Date,
  
  // Comment out password field (keep for backward compatibility)
  // password: { ... }
}
```

#### 2. Create OTP Endpoints
**File**: `backend/routes/auth.js`

**POST /api/auth/send-login-otp**
- Accept: phone OR email
- Check if user exists
- Generate 6-digit OTP
- Send via SMS/Email
- Store in DB with expiry (10 mins)
- Response: `{ success: true, message: "OTP sent" }`

**POST /api/auth/verify-login-otp**
- Accept: phone/email + OTP
- Verify OTP
- Create session
- Response: `{ success: true, token, refreshToken, user }`

**POST /api/auth/send-signup-phone-otp**
- Accept: phone
- Check if phone already exists → Error
- Generate OTP
- Send SMS
- Store temporarily (not in User model yet)
- Response: `{ success: true, tempToken }`

**POST /api/auth/verify-signup-phone-otp**
- Accept: phone + OTP + tempToken
- Verify OTP
- Mark phone as verified
- Response: `{ success: true, phoneVerified: true, tempToken }`

**POST /api/auth/send-signup-email-otp**
- Accept: email + tempToken
- Check if email already exists → Error
- Generate OTP
- Send email
- Response: `{ success: true }`

**POST /api/auth/verify-signup-email-otp**
- Accept: email + OTP + tempToken + name + phone
- Verify OTP
- Create user in DB:
  ```javascript
  {
    name,
    phone,
    email,
    isPhoneVerified: true,
    isEmailVerified: true
  }
  ```
- Create session
- Response: `{ success: true, token, refreshToken, user }`

#### 3. OTP Generation & Sending
**File**: `backend/utils/otp.js`

```javascript
// Generate 6-digit OTP
generateOTP() => "123456"

// Send SMS (integrate with service like Twilio)
sendSMS(phone, otp)

// Send Email (use existing mailer)
sendOTPEmail(email, otp, name)
```

### Phase 3: Database Schema

#### User Model Updates
```javascript
{
  // Existing fields
  name: String,
  email: String,
  role: String,
  
  // New fields
  phone: String,
  isPhoneVerified: Boolean,
  isEmailVerified: Boolean,
  
  // OTP fields (temporary storage)
  phoneOTP: String,
  phoneOTPExpiry: Date,
  emailOTP: String,
  emailOTPExpiry: Date,
  
  // Comment out (keep for backward compatibility)
  // password: String,
  // passwordResetToken: String,
  // passwordResetExpires: Date
}
```

#### Temporary OTP Storage (Alternative)
Create separate collection for pending signups:
```javascript
PendingSignup {
  phone: String,
  phoneOTP: String,
  phoneOTPExpiry: Date,
  phoneVerified: Boolean,
  email: String,
  emailOTP: String,
  emailOTPExpiry: Date,
  emailVerified: Boolean,
  name: String,
  createdAt: Date,
  expiresAt: Date  // TTL index - auto-delete after 1 hour
}
```

### Phase 4: Frontend State Management

#### Auth Context Updates
**File**: `src/contexts/AuthContext.tsx`

Update methods:
```typescript
// Remove password-based methods
// login(email, password)
// signup(email, password, name)

// Add OTP-based methods
sendLoginOTP(identifier: string)  // phone or email
verifyLoginOTP(identifier: string, otp: string)

sendSignupPhoneOTP(phone: string)
verifySignupPhoneOTP(phone: string, otp: string)

sendSignupEmailOTP(email: string, tempToken: string)
verifySignupEmailOTP(email: string, otp: string, tempToken: string, name: string, phone: string)
```

#### API Client Updates
**File**: `src/lib/api.ts`

```typescript
authApi.sendLoginOTP(identifier: string)
authApi.verifyLoginOTP(identifier: string, otp: string)
authApi.sendSignupPhoneOTP(phone: string)
authApi.verifySignupPhoneOTP(phone: string, otp: string)
authApi.sendSignupEmailOTP(email: string, tempToken: string)
authApi.verifySignupEmailOTP(data: { email, otp, tempToken, name, phone })
```

### Phase 5: UI/UX Flow

#### Login Page
```
┌─────────────────────────────────────┐
│  Enter mobile number or email       │
│  [_____________________________]    │
│  [Continue Button]                  │
│                                     │
│  Don't have an account? Sign Up     │
└─────────────────────────────────────┘

After clicking Continue:
┌─────────────────────────────────────┐
│  Enter mobile number or email       │
│  [user@example.com]                 │
│                                     │
│  ↓ Enter OTP sent to your email     │
│  [_] [_] [_] [_] [_] [_]           │
│  [Verify OTP Button]                │
│  Resend OTP                         │
└─────────────────────────────────────┘
```

#### Signup Page
```
Step 1:
┌─────────────────────────────────────┐
│  Name                               │
│  [_____________________________]    │
│  Phone Number                       │
│  [_____________________________]    │
│  [Continue Button]                  │
└─────────────────────────────────────┘

Step 2 (Phone Verification):
┌─────────────────────────────────────┐
│  Name: John Doe                     │
│  Phone: +1234567890                 │
│                                     │
│  ↓ Enter OTP sent to your phone     │
│  [_] [_] [_] [_] [_] [_]           │
│  [Verify Phone Button]              │
│  Resend OTP                         │
└─────────────────────────────────────┘

Step 3 (Email Input):
┌─────────────────────────────────────┐
│  Name: John Doe                     │
│  Phone: +1234567890 ✓               │
│                                     │
│  ↓ Email                            │
│  [_____________________________]    │
│  [Continue Button]                  │
└─────────────────────────────────────┘

Step 4 (Email Verification):
┌─────────────────────────────────────┐
│  Name: John Doe                     │
│  Phone: +1234567890 ✓               │
│  Email: user@example.com            │
│                                     │
│  ↓ Enter OTP sent to your email     │
│  [_] [_] [_] [_] [_] [_]           │
│  [Verify Email Button]              │
│  Resend OTP                         │
└─────────────────────────────────────┘

Final: Account created → Auto login → Redirect to /dashboard
```

### Phase 6: Validation & Error Handling

#### Validations
- Phone: Must be valid format (E.164)
- Email: Must be valid email format
- OTP: Must be 6 digits
- Name: 2-50 characters, letters and spaces only

#### Error Messages
- "Account already exists. Please login."
- "Invalid or expired OTP"
- "Phone number already registered"
- "Email already registered"
- "OTP sent successfully"
- "Phone verified successfully"
- "Email verified successfully"

### Phase 7: Security Considerations

1. **Rate Limiting**
   - Max 3 OTP requests per phone/email per hour
   - Max 5 verification attempts per OTP

2. **OTP Expiry**
   - 10 minutes expiry time
   - Auto-delete after expiry

3. **Temporary Token**
   - JWT token for signup flow
   - Contains: phone (after verification)
   - Expires in 1 hour

4. **SMS/Email Service**
   - Use Twilio for SMS
   - Use existing mailer for email
   - Implement fallback mechanisms

### Phase 8: Backward Compatibility

#### Keep Commented Code
- Keep all password-related code commented
- Don't delete password fields from DB
- Keep password validation utils (commented)
- Keep PasswordInput component (commented)

#### Migration Strategy
- Existing users with passwords can still login (if needed)
- New users use OTP only
- Gradual migration path available

### Phase 9: Testing Checklist

#### Login Flow
- [ ] Enter email → Receive OTP → Verify → Login
- [ ] Enter phone → Receive OTP → Verify → Login
- [ ] Invalid OTP → Show error
- [ ] Expired OTP → Show error
- [ ] Resend OTP → Works correctly
- [ ] Non-existent user → Show error

#### Signup Flow
- [ ] Enter name + phone → Receive OTP → Verify
- [ ] Enter email → Receive OTP → Verify → Account created
- [ ] Duplicate phone → Show error
- [ ] Duplicate email → Show error
- [ ] Invalid OTP at any step → Show error
- [ ] Successful signup → Auto login → Redirect to /dashboard

#### Edge Cases
- [ ] Network error during OTP send
- [ ] Network error during verification
- [ ] Multiple OTP requests
- [ ] OTP expiry during entry
- [ ] Browser refresh during signup flow
- [ ] Back button navigation

### Phase 10: Files to Create/Modify

#### New Files
1. `src/components/ui/OTPInput.tsx`
2. `backend/utils/otp.js`
3. `backend/models/PendingSignup.js` (optional)

#### Modified Files
1. `src/pages/Auth.tsx` - Complete redesign
2. `backend/routes/auth.js` - Add OTP endpoints
3. `backend/models/User.js` - Add phone fields
4. `src/contexts/AuthContext.tsx` - Update methods
5. `src/lib/api.ts` - Add OTP API calls
6. `src/utils/authValidation.ts` - Add phone validation

#### Commented Files (Keep for reference)
1. `src/components/ui/PasswordInput.tsx` - Comment usage
2. Password-related validation in `authValidation.ts`

## Implementation Order

1. ✅ Create OTPInput component
2. ✅ Update User model (add phone fields)
3. ✅ Create OTP utility functions
4. ✅ Implement backend OTP endpoints
5. ✅ Update API client
6. ✅ Update AuthContext
7. ✅ Redesign Auth.tsx (Login flow)
8. ✅ Redesign Auth.tsx (Signup flow)
9. ✅ Test all flows
10. ✅ Add error handling
11. ✅ Add rate limiting
12. ✅ Deploy and monitor

## Notes

- Keep all password code commented, don't delete
- Use environment variables for SMS API keys
- Log all OTP sends for debugging (development only)
- Monitor OTP delivery success rates
- Have fallback to email if SMS fails
- Consider adding "Login with password" link for existing users
