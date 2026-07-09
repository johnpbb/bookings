import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function getDeploymentId(): string | undefined {
  if (process.env.NEXT_DEPLOYMENT_ID) return process.env.NEXT_DEPLOYMENT_ID;
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return undefined;
  }
}

const nextConfig: NextConfig = {
  // Ties every build to the deployed commit so clients with a stale page open
  // (referencing a previous build's chunk hashes) get a full reload instead of
  // a ChunkLoadError/500 when the in-place `.next` rebuild swaps chunks out.
  deploymentId: getDeploymentId(),
};

export default nextConfig;
