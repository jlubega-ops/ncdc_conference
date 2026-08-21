/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  productionBrowserSourceMaps: false,
  // React Compiler is useful in `next dev` but uses a lot of RAM during
  // `next build` and can get the process killed on small production VPS hosts.
  reactCompiler: process.env.NODE_ENV !== "production",
};

export default nextConfig;
