// src/utils/templateRenderer.js

/**
 * Simple HTML template renderer.
 * Replaces {{key}} with data[key] for each key in the data object.
 *
 * Example:
 *  html: "Hello, {{ name }}!"
 *  data: { name: "Hunzala" } → "Hello, Hunzala!"
 */
function renderTemplate(html, data) {
  if (!html || typeof html !== 'string') return html;

  let rendered = html;

  for (const [key, value] of Object.entries(data)) {
    const re = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(re, value != null ? String(value) : '');
  }

  return rendered;
}

module.exports = {
  renderTemplate,
};
