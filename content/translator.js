let translations = null;
let enabled = true;
const unknown = new Set();

const TRANSLATIONS_URL =
  'https://cdn.jsdelivr.net/gh/vcf-zh/strings@main/versions/9.1/lookup.json';

const SKIP_PATTERN = /^[\d\s.,:%/\-ms]+$|^\d+\s*(items?|VMs?|Hosts?|GB|MHz)$|[一-鿿]|^[a-z0-9._:\-\/]+$|\{.*\}|@|202\d[年\-]/i;

async function loadTranslations() {
  const result = await chrome.storage.local.get(['vcf_zh_translations', 'vcf_zh_enabled']);
  enabled = result.vcf_zh_enabled !== false;
  if (result.vcf_zh_translations && Object.keys(result.vcf_zh_translations).length > 0) {
    translations = result.vcf_zh_translations;
  } else {
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

function processNode(node) {
  if (!translations || node.nodeType !== Node.TEXT_NODE) return;
  const text = node.textContent.trim();
  if (!text || text.length < 2 || text.length > 80) return;

  const zh = enabled && translations[text];
  if (zh && zh !== text) {
    node.textContent = node.textContent.replace(text, zh);
  } else if (!zh && !SKIP_PATTERN.test(text)) {
    unknown.add(text);
  }
}

function walkTree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  nodes.forEach(processNode);
}

// 每30秒把新增未知字符串存入storage
function flushUnknown() {
  if (unknown.size === 0) return;
  chrome.storage.local.get('vcf_zh_unknown', ({ vcf_zh_unknown }) => {
    const existing = vcf_zh_unknown || {};
    unknown.forEach(t => { existing[t] = t; });
    chrome.storage.local.set({ vcf_zh_unknown: existing });
    unknown.clear();
  });
}
setInterval(flushUnknown, 30000);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) walkTree(node);
      else if (node.nodeType === Node.TEXT_NODE) processNode(node);
    }
  }
});

loadTranslations().then(() => {
  walkTree(document.body || document.documentElement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.vcf_zh_translations) translations = changes.vcf_zh_translations.newValue;
  if (changes.vcf_zh_enabled) enabled = changes.vcf_zh_enabled.newValue;
});

window.addEventListener('beforeunload', flushUnknown);
