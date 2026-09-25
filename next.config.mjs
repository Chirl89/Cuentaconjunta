/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_ACTIONS === true;
const repoName = "Cuentaconjunta";
const basePath = isGithubActions ? `/${repoName}` : (process.env.NEXT_PUBLIC_BASE_PATH || "");

const isStaticExport = isGithubActions || process.env.NEXT_STATIC_EXPORT === "true";

const nextConfig = {
  ...(isStaticExport ? { output: "export" } : {}),
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
};

export default nextConfig;
