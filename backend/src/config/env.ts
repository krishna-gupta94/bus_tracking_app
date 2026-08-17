import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // Email verification redirect — points to the FRONTEND/mobile screen
  supabaseEmailRedirectUrl: process.env.SUPABASE_EMAIL_REDIRECT_URL || 'http://localhost:19006/registration-status',

  // Supabase webhook secret (HMAC)
  registrationWebhookSecret: process.env.REGISTRATION_WEBHOOK_SECRET || '',

  // Mobile app deep-link scheme (used in approval email)
  mobileDeeplink: process.env.MOBILE_DEEPLINK || 'smartbus://setup-password',

  // Password-setup token expiry (hours)
  passwordSetupTokenTtlHours: parseInt(process.env.PASSWORD_SETUP_TOKEN_TTL_HOURS || '72', 10),

  // SMTP (Nodemailer) — for approval & rejection emails
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
};
