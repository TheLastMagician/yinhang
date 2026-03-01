export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'yinhang-secret-key-2024',
  jwtExpiresIn: 86400, // 24 hours in seconds
};
