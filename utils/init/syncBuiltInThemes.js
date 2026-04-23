const { readFile, writeFile } = require('fs/promises');

const syncBuiltInThemes = async () => {
  const builtInThemesFile = await readFile('utils/init/themes.json', 'utf8');
  const themesFile = await readFile('data/themes.json', 'utf8');

  const builtInContent = JSON.parse(builtInThemesFile);
  const content = JSON.parse(themesFile);
  const themeNames = new Set(content.themes.map((theme) => theme.name));
  const missingThemes = builtInContent.themes.filter(
    (theme) => !theme.isCustom && !themeNames.has(theme.name)
  );

  if (!missingThemes.length) {
    return;
  }

  await writeFile(
    'data/themes.json',
    JSON.stringify({
      ...content,
      themes: [...content.themes, ...missingThemes],
    })
  );
};

module.exports = syncBuiltInThemes;
