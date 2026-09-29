// The Node.js versions this project runs on (the same rule Prisma and Vite use)
export const NODE_REQUIREMENT = '22.12 or newer (or 20.19+)';

export function isSupportedNode(version = process.versions.node): boolean {
  const [major, minor] = version.split('.').map(Number);
  return major > 22 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19);
}
