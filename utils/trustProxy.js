module.exports = (value) => {
  const setting = String(value || '').trim().toLowerCase();
  if (!setting || setting === 'false' || setting === '0') return false;
  if (setting === 'true') return 1;
  if (/^[1-9]\d*$/.test(setting)) return Number(setting);
  return setting;
};
