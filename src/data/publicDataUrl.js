export const publicDataUrl = (pathname) => `${import.meta.env.BASE_URL}data/${pathname}`.replace(/\/{2,}/g, '/');
