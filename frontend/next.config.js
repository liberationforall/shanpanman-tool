/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  // Only use the basePath in production (GitHub Pages)
  basePath: isProd ? "/shanpanman-tool" : "",
  output: isProd ? "export" : undefined,
  images: {
    unoptimized: true, // Required for static exports
  },
};

module.exports = nextConfig;
