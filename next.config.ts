import type { NextConfig } from "next";

/**
 * SEO landing aliases. Each short keyword URL permanently redirects to its
 * canonical page so link equity consolidates on one URL per topic.
 */
const seoAliases: Record<string, string> = {
  "/air-permits": "/permit-finder",
  "/air-permit-calculator": "/calculators",
  "/emissions-calculator": "/calculators",
  "/air-permit-search": "/permits",
  "/air-permit-jobs": "/jobs",
  "/air-quality-jobs": "/jobs",
  "/texas-air-permits": "/states/texas",
  "/new-mexico-air-permits": "/states/new-mexico",
  "/oil-gas-air-permits": "/industries/oil-gas",
  "/nsps": "/regulations/nsps",
  "/neshap": "/regulations/neshap",
  "/title-v": "/regulations/title-v",
  "/nsr": "/regulations/nsr",
  "/psd": "/regulations/psd",
  "/ap-42": "/regulations/ap-42",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return Object.entries(seoAliases).map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;
