const isDev = import.meta.env.DEV;

export const debugLog = (...args: unknown[]) => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};


