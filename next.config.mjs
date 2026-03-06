/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: {unoptimized: true},
  basePath: "/collage-generator",
  assetPrefix: "/collage-generator/"
};

export default nextConfig;
