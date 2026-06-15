const TRANSLATIONS_URL =
  'https://cdn.jsdelivr.net/gh/vcf-zh/strings@main/versions/9.0/vsphere/zh_CN.json';
const CACHE_KEY = 'vcf_zh_translations';
const UPDATE_INTERVAL_HOURS = 24;

async function fetchTranslations() {
  try {
    const resp = await fetch(TRANSLATIONS_URL + '?t=' + Date.now());
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) {
    console.warn('[vcf-zh] 翻译包更新失败:', e);
    return null;
  }
}

async function updateTranslations() {
  const data = await fetchTranslations();
  if (data) {
    await chrome.storage.local.set({ [CACHE_KEY]: data, last_updated: Date.now() });
    console.log('[vcf-zh] 翻译包已更新，共', Object.keys(data).length, '条');
  }
}

chrome.runtime.onInstalled.addListener(updateTranslations);

chrome.alarms.create('update-translations', { periodInMinutes: UPDATE_INTERVAL_HOURS * 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'update-translations') updateTranslations();
});
