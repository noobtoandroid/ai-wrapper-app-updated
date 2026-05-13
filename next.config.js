/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: process.env.REPLIT_DEV_DOMAIN
    ? [process.env.REPLIT_DEV_DOMAIN]
    : [],
}

module.exports = nextConfig
