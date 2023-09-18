export function sleep(ms: number) {
  return new Promise((resolve) =>
    // eslint-disable-next-line no-promise-executor-return
    setTimeout(resolve, ms),
  );
}

export const now = () => Date.now();
