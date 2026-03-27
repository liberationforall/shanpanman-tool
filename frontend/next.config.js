/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Tells Next.js to produce a static site
  basePath: '/shanpanman-tool', // Required for GitHub Pages if not at root
  images: {
    unoptimized: true, // Required for static exports
  },
  // You can remove or comment out the 'rewrites' section 
  // since proxying won't work on a static host.
};

module.exports = nextConfig;
