/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js App Router expects app directory at root, but we've moved it
  // We'll use a symlink or keep app at root for Next.js compatibility
  // For now, we'll configure paths to work with the new structure
}

export default nextConfig
