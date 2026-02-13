const GoogleStrategy = require('passport-google-oauth20').Strategy;
const mongoose = require('mongoose');
const User = require('../models/User');

module.exports = function(passport) {
  // Only configure Google OAuth if credentials are provided
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Build callback URL - use GOOGLE_CALLBACK_URL if set, otherwise construct from BASE_DOMAIN/BASE_URL
    const BASE_DOMAIN = process.env.BASE_DOMAIN || 'shelfmerch.com';
    const BASE_URL = process.env.BASE_URL || (process.env.NODE_ENV === 'production' 
      ? `https://${BASE_DOMAIN}` 
      : 'http://localhost:5000');
    
    // Allow explicit override via GOOGLE_CALLBACK_URL env var
    const callbackURL = process.env.GOOGLE_CALLBACK_URL || `${BASE_URL}/api/auth/google/callback`;
    
    console.log(`🔗 Google OAuth callback URL: ${callbackURL}`);
    console.log(`🔑 Google Client ID: ${process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 15) + '...' : 'MISSING'}`);
    
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: callbackURL,
          proxy: true
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
