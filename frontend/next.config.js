/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Tells Next.js to produce a static site
  images: {
    unoptimized: true, // Required for static exports
  },
  // You can remove or comment out the 'rewrites' section 
  // since proxying won't work on a static host.
};

module.exports = nextConfig;
