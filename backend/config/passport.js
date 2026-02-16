const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const User = require('../models/User');

module.exports = function(passport) {
  // Only configure Google OAuth if credentials are provided
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Determine base URL based on environment
    const BASE_URL = isProduction 
      ? (process.env.BASE_URL || 'https://shelfmerch.com')
      : 'http://localhost:5000';
    
    // The callback URL MUST match one of the authorized redirect URIs in Google Console
    const callbackURL = `${BASE_URL}/api/auth/google/callback`;
    
    console.log(`📡 Google OAuth Strategy Configured:`);
    console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   - Callback URL: ${callbackURL}`);
    console.log(`   - Proxy Enabled: true`);
    
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: callbackURL,
          proxy: true // Required for accurate protocol detection behind proxies like Nginx
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await User.findOne({ googleId: profile.id });
            if (user) {
              return done(null, user);
            } else {
              const email = profile.emails[0].value;
              user = await User.findOne({ email });
              if (user) {
                user.googleId = profile.id;
                if (!user.avatar) {
                  user.avatar = profile.photos[0].value;
                }
                await user.save();
                return done(null, user);
              } else {
                const newUser = {
                  googleId: profile.id,
                  name: profile.displayName,
                  email: email,
                  avatar: profile.photos[0].value,
                  isEmailVerified: true,
                  role: 'merchant'
                };
                user = await User.create(newUser);
                return done(null, user);
              }
            }
          } catch (err) {
            console.error('Google OAuth error:', err);
            return done(err, null);
          }
        }
      )
    );
    console.log('✓ Google OAuth strategy configured');
  } else {
    console.log('⚠️  Google OAuth not configured: GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET missing');
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => done(err, user));
  });
};
