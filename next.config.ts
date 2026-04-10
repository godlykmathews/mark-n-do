import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

if (process.env.NODE_ENV === "development") {
  void import("@opennextjs/cloudflare").then((m) =>
    m.initOpenNextCloudflareForDev(),
  );
}
