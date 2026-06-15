let translations = null;
let enabled = true;
const pending = new Set();
let translateTimer = null;

const LOOKUP_URL =
  'https://cdn.jsdelivr.net/gh/vcf-zh/strings@main/versions/9.1/lookup.json';
const SKIP = /^[\d\s.,:%\/\-]+$|^\d+\s*(items?|VMs?|Hosts?|GB|MHz|ms)$|[一-鿿]|^[a-z0-9._:\-\/\\@]+$|\{.+\}|202\d[年\-]/;

async function loadTranslations() {
  const result = await chrome.storage.local.get(['vcf_zh_translations', 'vcf_zh_enabled']);
  enabled = result.vcf_zh_enabled !== false;
  if (result.vcf_zh_translations && Object.keys(result.vcf_zh_translations).length > 0) {
    translations = result.vcf_zh_translations;
  } else {
    try {
      const resp = await fetch(LOOKUP_URL);
      if (resp.ok) {
        translations = await resp.json();
        chrome.storage.local.set({ vcf_zh_translations: translations, last_updated: Date.now() });
      }
    } catch { translations = {}; }
  }
}

function processNode(node) {
  if (node.nodeType !== Node.TEXT_NODE) return;
  const text = node.textContent.trim();
  if (!text || text.length < 2 || text.length > 80 || SKIP.test(text)) return;

  if (enabled && translations?.[text]) {
    node.textContent = node.textContent.replace(text, translations[text]);
    return;
  }
  // 未翻译 → 加入待翻译队列
  if (translations && !translations[text]) {
    pending.add(text);
    scheduleBatchTranslate();
  }
}

function walkTree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let n;
  while ((n = walker.nextNode())) nodes.push(n);
  nodes.forEach(processNode);
}

function scheduleBatchTranslate() {
  if (translateTimer) return;
  // 积累 3 秒或达到 20 条就触发
  translateTimer = setTimeout(() => {
    translateTimer = null;
    if (pending.size === 0) return;
    const batch = [...pending].slice(0, 50);
    batch.forEach(s => pending.delete(s));
    chrome.runtime.sendMessage({ action: 'translate', strings: batch });
  }, pending.size >= 20 ? 500 : 3000);
}

const observer = new MutationObserver(mutations => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) walkTree(node);
      else processNode(node);
    }
  }
});

loadTranslations().then(() => {
  walkTree(document.body || document.documentElement);
  observer.observe(document.documentElement, { childList: true, subtree: true });
});

// 收到新翻译 → 重新扫描页面
chrome.storage.onChanged.addListener(changes => {
  if (changes.vcf_zh_translations) {
    translations = changes.vcf_zh_translations.newValue;
    walkTree(document.body);
  }
  if (changes.vcf_zh_enabled) enabled = changes.vcf_zh_enabled.newValue;
});
