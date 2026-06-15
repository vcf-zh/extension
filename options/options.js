const toggle = document.getElementById('toggle');
const refreshBtn = document.getElementById('refresh');
const status = document.getElementById('status');
const unknownCount = document.getElementById('unknownCount');
const submitBtn = document.getElementById('submitBtn');
const clearBtn = document.getElementById('clearBtn');

const ISSUE_URL = 'https://github.com/vcf-zh/strings/issues/new?labels=new-strings&title=新字符串提交';

async function updateStatus() {
  const { last_updated, vcf_zh_translations, vcf_zh_unknown } = await chrome.storage.local.get(
    ['last_updated', 'vcf_zh_translations', 'vcf_zh_unknown']
  );
  const count = vcf_zh_translations ? Object.keys(vcf_zh_translations).length : 0;
  const time = last_updated ? new Date(last_updated).toLocaleString('zh-CN') : '从未';
  status.textContent = `已翻译：${count} 条 | 最近更新：${time}`;

  const unknown = vcf_zh_unknown || {};
  unknownCount.textContent = Object.keys(unknown).length;
}

chrome.storage.local.get('vcf_zh_enabled', ({ vcf_zh_enabled }) => {
  toggle.checked = vcf_zh_enabled !== false;
});

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ vcf_zh_enabled: toggle.checked });
});

refreshBtn.addEventListener('click', async () => {
  status.textContent = '更新中...';
  await chrome.runtime.sendMessage({ action: 'update' });
  await updateStatus();
});

submitBtn.addEventListener('click', async () => {
  const { vcf_zh_unknown } = await chrome.storage.local.get('vcf_zh_unknown');
  const unknown = vcf_zh_unknown || {};
  if (Object.keys(unknown).length === 0) {
    status.textContent = '暂无新字符串，请先浏览 VCF 界面';
    return;
  }
  const json = JSON.stringify(unknown, null, 2);
  await navigator.clipboard.writeText(json);
  submitBtn.textContent = '✓ 已复制！正在打开 GitHub...';
  setTimeout(() => { submitBtn.textContent = '📋 复制并提交 GitHub Issue'; }, 3000);
  chrome.tabs.create({ url: ISSUE_URL });
});

clearBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove('vcf_zh_unknown');
  unknownCount.textContent = '0';
});

// 监听storage变化实时更新计数
chrome.storage.onChanged.addListener((changes) => {
  if (changes.vcf_zh_unknown) {
    const unknown = changes.vcf_zh_unknown.newValue || {};
    unknownCount.textContent = Object.keys(unknown).length;
  }
});

updateStatus();
