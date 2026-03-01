import prisma from '../utils/prisma';

const configCache = new Map<string, { value: string; expiresAt: number }>();
const CACHE_TTL = 60000;

export async function getConfig(key: string, defaultValue: string = ''): Promise<string> {
  const cached = configCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const config = await prisma.systemConfig.findUnique({ where: { key } });
  const value = config?.value ?? defaultValue;

  configCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL });
  return value;
}

export function clearConfigCache() {
  configCache.clear();
}
