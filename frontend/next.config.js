/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Guarantee NEXT_PUBLIC_* vars are embedded at build time
  // even if vercel.json env section doesn't inject them during next build
  env: {
    NEXT_PUBLIC_API_URL:          process.env.NEXT_PUBLIC_API_URL          || 'https://agentmarket-production-e911.up.railway.app/api/v1',
    NEXT_PUBLIC_X_LAYER_CHAIN_ID: process.env.NEXT_PUBLIC_X_LAYER_CHAIN_ID || '196',
    NEXT_PUBLIC_X_LAYER_RPC_URL:  process.env.NEXT_PUBLIC_X_LAYER_RPC_URL  || 'https://rpc.xlayer.tech',
    NEXT_PUBLIC_X_LAYER_EXPLORER: process.env.NEXT_PUBLIC_X_LAYER_EXPLORER || 'https://www.oklink.com/xlayer',
    NEXT_PUBLIC_USDC_ADDRESS:     process.env.NEXT_PUBLIC_USDC_ADDRESS     || '0x74b7F16337b8972027F6196A17a631aC6dE26d22',
  },
  images: {
    domains: ['avatars.githubusercontent.com', 'ipfs.io'],
  },
  webpack: (config) => {
    // Silence missing optional peer dependencies from MetaMask SDK and WalletConnect
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization,X-Payment' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
