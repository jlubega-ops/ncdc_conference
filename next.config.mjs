/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  /* config options here */
  productionBrowserSourceMaps: false,
  reactCompiler: true,
};

export default nextConfig;
