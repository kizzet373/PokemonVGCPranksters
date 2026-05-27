export const standingsAssetUrls = import.meta.glob('./standings/*.json', {
  query: '?url',
  import: 'default',
  eager: true,
});
