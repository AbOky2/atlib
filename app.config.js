// EAS file variable: Firebase client configuration, never a service-account key.
// Preserve app.json as the source of identifiers, plugins and native settings.
// Google Sign-In on iOS needs the app's URL scheme to be the REVERSED iOS client
// ID (com.googleusercontent.apps.…). The plugin refuses to run without it, so it
// is added only once the value exists — the Google button hides itself until then.
const googleSignInPlugin = process.env.GOOGLE_IOS_URL_SCHEME
  ? [['@react-native-google-signin/google-signin', { iosUrlScheme: process.env.GOOGLE_IOS_URL_SCHEME }]]
  : [];

module.exports = ({ config }) => ({
  ...config,
  plugins: [...(config.plugins ?? []), ...googleSignInPlugin],
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
  },
});
