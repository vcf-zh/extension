let translations = null;
let enabled = true;

const TRANSLATIONS_URL =
  'https://cdn.jsdelivr.net/gh/vcf-zh/strings@main/versions/9.1/lookup.json';

async function loadTranslations() {
  const result = await chrome.storage.local.get(['vcf_zh_translations', 'vcf_zh_enabled']);
  enabled = result.vcf_zh_enabled !== false;
  if (result.vcf_zh_translations && Object.keys(result.vcf_zh_translations).length > 0) {
    translations = result.vcf_zh_translations;
  } else {
    // service worker 未运行时（Firefox 常见）直接 fetch
    try {
      const resp = await fetch(TRANSLATIONS_URL);
      if (resp.ok) {
        translations = await resp.json();
        chrome.storage.local.set({ vcf_zh_translations: translations, last_updated: Date.now() });
      }
    } catch (e) {
      translations = {};
    }
  }
}

function translateNode(node) {
  if (!enabled || !translations || node.nodeType !== Node.TEXT_NODE) return;
  const text = node.textContent.trim();
  if (!text || text.length < 2) return;

  const zh = translations[text];
  if (zh && zh !== text) {
    node.textContent = node.textContent.replace(text, zh);
  }
}

function translateTree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  nodes.forEach(translateNode);
}

const observer = new MutationObserver((mutations) => {
  if (!enabled || !translations) return;
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) translateTree(node);
      else if (node.nodeType === Node.TEXT_NODE) translateNode(node);
    }
  }
});

loadTranslations().then(() => {
  translateTree(document.body || document.documentElement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.vcf_zh_translations) translations = changes.vcf_zh_translations.newValue;
  if (changes.vcf_zh_enabled) enabled = changes.vcf_zh_enabled.newValue;
});
