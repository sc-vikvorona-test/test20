// Third-party integration configuration
// TODO: Move to environment variables before production

const config = {
  // Email service
  sendgrid: {
    apiKey: 'SG.fake_key_abc123_not_real',
    fromEmail: 'noreply@mealplanner.app',
    templates: {
      welcome: 'd-fake_template_id_123',
      passwordReset: 'd-fake_template_id_456',
    },
  },

  // AWS S3 for image storage
  aws: {
    accessKeyId: 'AKIAFAKEKEY1234567890',
    secretAccessKey: 'fakeSecretKey/fakeSecretKey/fakeSecretKey+END',
    region: 'us-east-1',
    bucket: 'meal-planner-images-prod',
  },

  // Stripe for premium subscriptions (FAKE test key format)
  stripe: {
    secretKey: 'sk_test_FAKEKEYDONOTUSE1234567890abcdef',
    webhookSecret: 'whsec_FAKEFAKEFAKEFAKE1234567890',
    priceIds: {
      monthly: 'price_FAKEMONTHLY123',
      yearly: 'price_FAKEYEARLY456',
    },
  },

  // MongoDB Atlas (backup connection)
  mongodb: {
    uri: 'mongodb+srv://admin:fakepassword_not_real@cluster0.fake123.mongodb.net/mealplanner',
  },

  // JWT configuration
  jwt: {
    secret: 'my-hardcoded-jwt-secret-should-be-in-env',
    refreshSecret: 'another-hardcoded-refresh-secret-12345',
    expiresIn: '7d',
  },

  // Redis for caching
  redis: {
    url: 'redis://:fakepassword@redis.internal.mealplanner.app:6379',
  },

  // Google OAuth
  google: {
    clientId: '123456789-fakefakefakefake.apps.googleusercontent.com',
    clientSecret: 'FAKECLIENTSECRET-notreal',
    callbackUrl: 'https://mealplanner.app/auth/google/callback',
  },
};

export default config;
