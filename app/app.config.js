// Ergänzt app.json: Für die Web-Version auf GitHub Pages liegt die App unter
// https://toki79.github.io/sigrids-spielekiste/ – der Pfad kommt aus EXPO_BASE_URL.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  return baseUrl ? { ...config, experiments: { ...(config.experiments ?? {}), baseUrl } } : config;
};
