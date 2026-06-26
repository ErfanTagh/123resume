/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep URLs clean and crawler-friendly.
  trailingSlash: false,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
