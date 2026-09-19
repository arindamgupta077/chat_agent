export default {
  input: ['src/renderer/**/*.{js,jsx,ts,tsx}', 'packages/chatbox-core/src/session/message-finish-tip.ts'],
  output: 'src/renderer/i18n/locales/$LOCALE/$NAMESPACE.json',
  locales: ['en'],
  createOldCatalogs: false,
  keepRemoved: false,
  pluralSeparator: false,
  keySeparator: false,
  namespaceSeparator: false,
  sort: true,
}
