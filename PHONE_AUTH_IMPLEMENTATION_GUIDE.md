# Phone Number + OTP Authentication Implementation Guide

## Overview
This guide explains how to implement phone number authentication with OTP verification in the ShelfMerch app for both `/auth` and `/store/auth` pages.

## Backend Implementation

### 1. Database Models

#### PhoneOTP Model (`backend/models/PhoneOTP.js`)
```javascript
const mongoose = require('mongoose');

const phoneOTPSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - auto-delete expired docs
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Static method to create or update OTP
phoneOTPSchema.statics.createOTP = async function(phone) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Delete any existing OTPs for this phone
  await this.deleteMany({ phone });

  await this.create({
    phone,
    otp,
    expiresAt,
    attempts: 0
  });

  return otp;
};

module.exports = mongoose.model('PhoneOTP', phoneOTPSchema);
```

#### User Model Updates (`backend/models/User.js`)
Add phone field to User schema:
```javascript
phone: {
  type: String,
  unique: true,
  sparse: true,
  trim: true,
  match: [
    /^\+91\d{10}$/,
    'Please provide a valid Indian phone number with +91'
  ]
},
```

### 2. SMS Service (`backend/utils/sms.js`)
```javascript
/**
 * SMS Service - Console mode for development
 * Logs OTP to terminal instead of sending real SMS
 */

const sendOTP = async (phone, otp) => {
  // Development mode - log OTP to console
  console.log('='.repeat(60));
  console.log('📱 SMS OTP (CONSOLE MODE)');
  console.log('='.repeat(60));
  console.log(`Phone: ${phone}`);
  console.log(`OTP: ${otp}`);
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log(`Expires: ${new Date(Date.now() + 10 * 60 * 1000).toLocaleString()}`);
  console.log('='.repeat(60));
  return true;
};

module.exports = { sendOTP };
```

**Production SMS Integration:**
Replace the console logging with actual SMS provider like Twilio, MSG91, or Fast2SMS.

### 3. Authentication Routes (`backend/routes/auth.js`)

#### Send Login OTP Route
```javascript
// @route   POST /api/auth/send-login-otp
// @desc    Send OTP to phone number for login
// @access  Public
router.post(
  '/send-login-otp',
  authLimiter,
  [
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^\+91\d{10}$/)
      .withMessage('Please provide a valid Indian phone number with +91'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { phone } = req.body;

      // Check if user exists with this phone
      const user = await User.findOne({ phone });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this phone number'
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact support.'
        });
      }

      // Create OTP
      const otp = await PhoneOTP.createOTP(phone);

      // Send OTP via SMS
      try {
        await sendOTP(phone, otp);
      } catch (smsError) {
        console.error('Error sending OTP:', smsError);
        return res.status(500).json({
          success: false,
          message: 'Failed to send OTP. Please try again later.'
        });
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your phone'
      });
    } catch (error) {
      console.error('Send login OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while sending OTP'
      });
    }
  }
);
```

#### Verify Login OTP Route
```javascript
// @route   POST /api/auth/verify-login-otp
// @desc    Verify OTP and log in user
// @access  Public
router.post(
  '/verify-login-otp',
  authLimiter,
  [
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .matches(/^\+91\d{10}$/)
      .withMessage('Please provide a valid Indian phone number with +91'),
    body('otp')
      .trim()
      .notEmpty()
      .withMessage('OTP is required')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
      .matches(/^\d+$/)
      .withMessage('OTP must contain only numbers'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { phone, otp } = req.body;

      // Find the OTP record
      const phoneOTPRecord = await PhoneOTP.findOne({ phone }).sort({ createdAt: -1 });

      if (!phoneOTPRecord) {
        return res.status(400).json({
          success: false,
          message: 'No OTP found for this phone number. Please request a new one.'
        });
      }

      // Check if expired
      if (new Date() > phoneOTPRecord.expiresAt) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.'
        });
      }

      // Check if max attempts reached
      if (phoneOTPRecord.attempts >= phoneOTPRecord.maxAttempts) {
        return res.status(400).json({
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.'
        });
      }

      // Increment attempts
      phoneOTPRecord.attempts += 1;
      await phoneOTPRecord.save();

      // Check if OTP matches
      if (phoneOTPRecord.otp !== otp) {
        const attemptsLeft = phoneOTPRecord.maxAttempts - phoneOTPRecord.attempts;
        return res.status(400).json({
          success: false,
          message: `Invalid OTP. ${attemptsLeft} attempt(s) remaining.`
        });
      }

      // OTP is valid - find user and log them in
      const user = await User.findOne({ phone });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Delete the OTP record
      await PhoneOTP.deleteMany({ phone });

      // Update last login
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      // Send token response
      await sendTokenResponse(user, 200, res);
    } catch (error) {
      console.error('Verify login OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while verifying OTP'
      });
    }
  }
);
```

#### Update Registration Route
Add phone support to registration:
```javascript
router.post(
  '/register',
  [
    // ... existing validations ...
    body('phone')
      .optional()
      .trim()
      .matches(/^\+91\d{10}$/)
      .withMessage('Please provide a valid Indian phone number with +91'),
  ],
  async (req, res) => {
    // ... existing code ...
    let { name, email, phone, password, role } = req.body;
    
    // Check if user already exists
    const query = phone ? { $or: [{ email }, { phone }] } : { email };
    const existingUser = await User.findOne(query);
    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists.'
        });
      }
      if (phone && existingUser.phone === phone) {
        return res.status(409).json({
          success: false,
          message: 'Phone number already registered.'
        });
      }
    }
    
    // Create user with phone if provided
    const userData = {
      name,
      email,
      password,
      role: userRole,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      verificationTokenExpiry: verificationTokenExpiry
    };
    
    if (phone) {
      userData.phone = phone;
    }
    
    const user = await User.create(userData);
    // ... rest of code ...
  }
);
```

## Frontend Implementation

### 1. API Functions (`src/lib/api.ts`)

```typescript
export const authApi = {
  // ... existing methods ...

  register: async (name: string, email: string, password: string, phone?: string) => {
    const payload: any = {
      name: name.trim(),
      email: email.trim().toLowerCase().replace(/^@+/, ''),
      password
    };

    if (phone && phone.trim()) {
      payload.phone = phone.trim();
    }

    const response = await apiRequest<{
      success: boolean;
      message?: string;
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string;
        isEmailVerified: boolean;
      };
      token?: string;
      refreshToken?: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.token && response.refreshToken) {
      saveTokens(response.token, response.refreshToken);
    }

    return response;
  },

  sendLoginOTP: async (phone: string) => {
    return apiRequest<{
      success: boolean;
      message: string;
    }>('/auth/send-login-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  verifyLoginOTP: async (phone: string, otp: string) => {
    const response = await apiRequest<{
      success: boolean;
      user: {
        id: string;
        name: string;
        email: string;
        role: string;
        createdAt: string;
      };
      token: string;
      refreshToken: string;
    }>('/auth/verify-login-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    });

    if (response.token && response.refreshToken) {
      saveTokens(response.token, response.refreshToken);
    }

    return response;
  },
};
```

### 2. Auth Context (`src/contexts/AuthContext.tsx`)

```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPhone: (phone: string, otp: string) => Promise<void>;
  signup: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isMerchant: boolean;
  refreshUser: () => Promise<void>;
}

// Add loginWithPhone method
const loginWithPhone = async (phone: string, otp: string) => {
  try {
    const response = await authApi.verifyLoginOTP(phone, otp);
    if (response.success && response.user) {
      setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role as UserRole,
        createdAt: response.user.createdAt,
      });
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Failed to login with phone. Please try again.');
  }
};

// Update signup to accept phone
const signup = async (email: string, password: string, name: string, phone?: string) => {
  try {
    const response = await authApi.register(name, email, password, phone);
    if (response.success) {
      return;
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Failed to create account. Please try again.');
  }
};
```

### 3. Auth Page UI (`src/pages/Auth.tsx`)

#### Add State Variables
```typescript
// Login state - support both email and phone
const [loginIdentifier, setLoginIdentifier] = useState(''); // Can be email or phone
const [loginPassword, setLoginPassword] = useState('');
const [loginType, setLoginType] = useState<'email' | 'phone' | null>(null);
const [loginOtp, setLoginOtp] = useState(['', '', '', '', '', '']);
const [isOtpSent, setIsOtpSent] = useState(false);
const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
const [otpError, setOtpError] = useState('');

// Signup state - add phone (optional)
const [signupPhone, setSignupPhone] = useState('');
const [phoneError, setPhoneError] = useState('');
```

#### Auto-detect Login Type
```typescript
// Auto-detect login type (email or phone)
useEffect(() => {
  const identifier = loginIdentifier.trim();
  if (!identifier) {
    setLoginType(null);
    setIsOtpSent(false);
    return;
  }

  // Check if it's a phone number (10 digits)
  if (/^\d{10}$/.test(identifier)) {
    setLoginType('phone');
  } else if (/@/.test(identifier)) {
    setLoginType('email');
  } else {
    setLoginType(null);
  }
}, [loginIdentifier]);
```

#### Handle Login
```typescript
const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setIsLoading(true);
  setOtpError('');

  try {
    const identifier = loginIdentifier.trim();

    if (loginType === 'phone') {
      // Phone login - send OTP
      if (!isOtpSent) {
        const phone = `+91${identifier}`;
        await authApi.sendLoginOTP(phone);
        setIsOtpSent(true);
        toast.success('OTP sent to your phone');
        setIsLoading(false);
        return;
      }

      // Verify OTP
      const otpString = loginOtp.join('');
      if (otpString.length !== 6) {
        setOtpError('Please enter the complete 6-digit code');
        setIsLoading(false);
        return;
      }

      const phone = `+91${identifier}`;
      await loginWithPhone(phone, otpString);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } else {
      // Email login - traditional
      await login(identifier, loginPassword);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    }
  } catch (error: any) {
    if (loginType === 'phone') {
      setOtpError(error?.message || 'Invalid OTP');
    }
    toast.error(error?.message || 'Failed to login');
  } finally {
    setIsLoading(false);
  }
};
```

#### OTP Handlers
```typescript
const handleOtpChange = (index: number, value: string) => {
  if (value && !/^\d$/.test(value)) return;

  const newOtp = [...loginOtp];
  newOtp[index] = value;
  setLoginOtp(newOtp);
  setOtpError('');

  if (value && index < 5) {
    const nextInput = document.getElementById(`login-otp-${index + 1}`);
    nextInput?.focus();
  }
};

const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
  if (e.key === 'Backspace' && !loginOtp[index] && index > 0) {
    const prevInput = document.getElementById(`login-otp-${index - 1}`);
    prevInput?.focus();
  }
};

const handleOtpPaste = (e: React.ClipboardEvent) => {
  e.preventDefault();
  const pasted = e.clipboardData.getData('text').trim();
  if (/^\d{6}$/.test(pasted)) {
    const digits = pasted.split('');
    setLoginOtp(digits);
    const lastInput = document.getElementById('login-otp-5');
    lastInput?.focus();
  }
};

const handleResendOTP = async () => {
  setIsLoading(true);
  setOtpError('');
  
  try {
    const phone = `+91${loginIdentifier.trim()}`;
    await authApi.sendLoginOTP(phone);
    setLoginOtp(['', '', '', '', '', '']);
    toast.success('OTP resent successfully');
  } catch (error: any) {
    toast.error(error?.message || 'Failed to resend OTP');
  } finally {
    setIsLoading(false);
  }
};
```

#### Login Form JSX
```tsx
<form onSubmit={handleLogin} className="space-y-4">
  <div className="space-y-2">
    <Label htmlFor="login-identifier">Email or Phone Number</Label>
    <Input
      id="login-identifier"
      type="text"
      value={loginIdentifier}
      onChange={(e) => {
        setLoginIdentifier(e.target.value);
        setEmailError('');
        setOtpError('');
      }}
      placeholder="email@example.com or 9876543210"
      required
    />
    {loginType && (
      <p className="text-xs text-muted-foreground">
        {loginType === 'email' ? '📧 Email login' : '📱 Phone login with OTP'}
      </p>
    )}
  </div>

  {/* Show password field for email, OTP field for phone */}
  {loginType === 'email' && (
    <div className="space-y-2">
      <Label htmlFor="login-password">Password</Label>
      <PasswordInput
        id="login-password"
        value={loginPassword}
        onChange={(e) => setLoginPassword(e.target.value)}
        placeholder="••••••••"
        required
      />
    </div>
  )}

  {loginType === 'phone' && isOtpSent && (
    <div className="space-y-2">
      <Label>Enter 6-digit OTP</Label>
      <div className="flex gap-2 justify-center">
        {loginOtp.map((digit, index) => (
          <Input
            key={index}
            id={`login-otp-${index}`}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onPaste={handleOtpPaste}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            className="w-12 h-12 text-center text-lg font-semibold"
            required
          />
        ))}
      </div>
      {otpError && (
        <p className="text-sm text-red-600 text-center">{otpError}</p>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={handleResendOTP}
        disabled={isLoading}
      >
        Resend OTP
      </Button>
    </div>
  )}

  {/* Show forgot password only for email login */}
  {loginType === 'email' && (
    <div className="text-right">
      <button
        type="button"
        onClick={handleForgotPasswordClick}
        className="text-sm text-primary hover:underline"
      >
        Forgot password?
      </button>
    </div>
  )}

  <Button type="submit" className="w-full" disabled={isLoading}>
    {isLoading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {loginType === 'phone' && !isOtpSent ? 'Sending OTP...' : 'Logging in...'}
      </>
    ) : (
      loginType === 'phone' && !isOtpSent ? 'Send OTP' : 'Log in'
    )}
  </Button>
</form>
```

#### Signup Form - Add Optional Phone Field
```tsx
<div className="space-y-2">
  <Label htmlFor="signup-phone">
    Phone Number (Optional)
  </Label>
  <div className="flex gap-2">
    <div className="flex items-center px-3 border border-input rounded-md bg-muted">
      <span className="text-sm font-medium">+91</span>
    </div>
    <Input
      id="signup-phone"
      type="tel"
      value={signupPhone}
      onChange={(e) => handlePhoneChange(e.target.value)}
      placeholder="9876543210"
      maxLength={10}
    />
  </div>
  {phoneError && (
    <p className="text-sm text-red-600">{phoneError}</p>
  )}
  {!phoneError && signupPhone.length === 10 && (
    <p className="text-xs text-green-600">✓ Valid mobile number</p>
  )}
  <p className="text-xs text-muted-foreground">
    Add your phone number to enable quick OTP login
  </p>
</div>
```

## Testing Guide

### Backend Testing

1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Test Send OTP**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/send-login-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+919876543210"}'
   ```

3. **Check Console** for OTP (in development mode)

4. **Test Verify OTP**:
   ```bash
   curl -X POST http://localhost:5000/api/auth/verify-login-otp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+919876543210", "otp": "123456"}'
   ```

### Frontend Testing

1. **Test Signup with Phone**:
   - Go to `/auth?tab=signup`
   - Fill in name, email, password
   - Optionally add phone number (10 digits)
   - Submit and verify email

2. **Test Login with Email**:
   - Go to `/auth`
   - Enter email
   - Should show "📧 Email login"
   - Enter password
   - Submit

3. **Test Login with Phone**:
   - Go to `/auth`
   - Enter 10-digit phone number
   - Should show "📱 Phone login with OTP"
   - Click "Send OTP"
   - Check backend console for OTP
   - Enter OTP in 6 input fields
   - Submit

### Edge Cases to Test

1. **Invalid Phone Number**: Less than or more than 10 digits
2. **Phone Not Registered**: Should show error
3. **Expired OTP**: Wait 10 minutes and try to verify
4. **Wrong OTP**: Should show attempts remaining
5. **Max Attempts Exceeded**: Try wrong OTP 5 times
6. **Resend OTP**: Verify old OTP is invalidated

## Production Deployment

### Environment Variables

Add to `.env`:
```
SMS_PROVIDER=console  # Change to 'twilio', 'msg91', etc. for production
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

### SMS Provider Integration

Replace `backend/utils/sms.js` with actual SMS provider:

**Twilio Example**:
```javascript
const twilio = require('twilio');

const sendOTP = async (phone, otp) => {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  
  await client.messages.create({
    body: `Your ShelfMerch login OTP is: ${otp}. Valid for 10 minutes.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
};
```

## Security Considerations

1. **Rate Limiting**: Already implemented with `authLimiter`
2. **OTP Expiry**: Set to 10 minutes
3. **Attempt Limits**: Maximum 5 verification attempts
4. **Auto-cleanup**: TTL index deletes expired OTPs automatically
5. **Phone Format Validation**: Enforced at both frontend and backend
6. **SQL Injection**: Prevented by Mongoose parameterized queries

## Future Enhancements

1. **SMS Templates**: Use SMS provider's templates for better delivery
2. **Two-Factor Authentication**: Add OTP as 2FA for email logins
3. **Phone Verification Badge**: Show verified phone icon in profile
4. **Multiple Phone Numbers**: Allow users to add backup phone numbers
5. **International Support**: Extend beyond +91 (India) to other countries
6. **Analytics**: Track OTP success rates and failed attempts

## Troubleshooting

### OTP Not Received
- Check backend console logs for OTP (development mode)
- Verify SMS provider credentials (production)
- Check phone number format (+91XXXXXXXXXX)

### Login Fails After OTP Verification
- Ensure user exists with the phone number
- Check if account is active
- Verify token generation is working

### Maximum Attempts Exceeded
- Request a new OTP
- Each new OTP resets the attempt counter

## Support

For issues or questions, contact the development team or refer to:
- Backend API documentation: `/api/docs`
- Frontend component library: Storybook
- Database schema: `backend/models/README.md`


