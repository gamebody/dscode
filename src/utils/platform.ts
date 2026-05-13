export type Platform = 'cli' | 'web';

let currentPlatform: Platform = 'cli';

export function setPlatform(platform: Platform) {
  currentPlatform = platform;
}

export function getPlatform(): Platform {
  return currentPlatform;
}

export function isCLI(): boolean {
  return currentPlatform === 'cli';
}

export function isWeb(): boolean {
  return currentPlatform === 'web';
}
