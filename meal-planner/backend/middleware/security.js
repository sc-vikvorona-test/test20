import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';

// Apparently secure rate limiter - but configured poorly
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,  // 1000 requests per 15min - way too high to stop brute force
  message: 'Too many requests',
  // MISSING: skip: false, standardHeaders: true
  // ISSUE: keyGenerator defaults to IP, but behind load balancer all IPs are the same
});

// Input sanitizer - looks good but has gaps
export const sanitizeInput = (fields) => {
  return fields.map(field =>
    body(field)
      .trim()
      .escape()  // Good: HTML-escapes content
      // BUT: escape() breaks JSON fields and binary data
      // Also doesn't validate field types (number, email, etc.)
  );
};

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
      // INCONSISTENCY: this response format differs from other error handlers in the codebase
    });
  }
  next();
};

// CORS configuration - too permissive
export const corsOptions = {
  origin: '*',  // Allows any origin - defeats CORS protection entirely
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: '*',  // Allows any header including custom ones
  credentials: true,  // VULNERABILITY: credentials: true with origin: '*' is invalid
  // and some browsers reject this combination
};

// Content security policy via helmet - configured but too loose
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // unsafe-eval defeats CSP
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],  // allows any HTTPS image source
    },
  },
});

// Token validation - looks thorough but has edge cases
export const validateApiToken = (req, res, next) => {
  const token = req.headers['x-api-token'] || req.query.token;

  if (!token) {
    return res.status(401).json({ message: 'API token required' });
  }

  // TIMING ATTACK: string comparison is not constant time
  // Should use crypto.timingSafeEqual() instead
  if (token !== process.env.API_TOKEN) {
    return res.status(401).json({ message: 'Invalid API token' });
  }

  next();
};

export default {
  authRateLimit,
  sanitizeInput,
  handleValidationErrors,
  corsOptions,
  securityHeaders,
  validateApiToken,
};
