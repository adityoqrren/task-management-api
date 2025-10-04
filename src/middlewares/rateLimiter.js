import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 20, // Maksimal 100 request per IP per windowMs
  message: {
    status: 429,
    message: 'Too many requests, please try again later.',
  },
});
