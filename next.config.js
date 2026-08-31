/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        bufferutil: false,
        "utf-8-validate": false,
      };
    }

    config.module.exprContextCritical = false;
    config.ignoreWarnings = [
      { module: /node_modules\/@protobufjs\/inquire\/index\.js/ },
      { message: /Critical dependency: the request of a dependency is an expression/ }
    ];

    return config;
  },
};

module.exports = nextConfig;