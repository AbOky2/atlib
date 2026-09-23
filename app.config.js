// EAS file variable: Firebase client configuration, never a service-account key.
// Preserve app.json as the source of identifiers, plugins and native settings.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON
      ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON }
      : {}),
  },
});
