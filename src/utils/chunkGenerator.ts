

export function* chunkGenerator(str: string, chunkSize = 1) {
  for (let i = 0; i < str.length; i += chunkSize) {
    yield str.slice(i, i + chunkSize);
  }
}

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
