const toggle = document.getElementById('toggle');
const refreshBtn = document.getElementById('refresh');
const status = document.getElementById('status');
const apiKeyInput = document.getElementById('apiKey');
const saveKeyBtn = document.getElementById('saveKey');
const savedHint = document.getElementById('savedHint');

async function updateStatus() {
  const { last_updated, vcf_zh_translations, vcf_zh_minimax_key } = await chrome.storage.local.get(
    ['last_updated', 'vcf_zh_translations', 'vcf_zh_minimax_key']
  );
  const count = vcf_zh_translations ? Object.keys(vcf_zh_translations).length : 0;
  const time = last_updated ? new Date(last_updated).toLocaleString('zh-CN') : '从未';
  status.textContent = `已翻译 ${count} 条 | 更新于 ${time}`;

  if (vcf_zh_minimax_key) {
    apiKeyInput.placeholder = '已保存（点击重新输入）';
    savedHint.textContent = '✓ API Key 已配置，浏览 VCF 时自动翻译新字符串';
  }
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

saveKeyBtn.addEventListener('click', async () => {
  const key = apiKeyInput.value.trim();
  if (!key) return;
  await chrome.storage.local.set({ vcf_zh_minimax_key: key });
  apiKeyInput.value = '';
  apiKeyInput.placeholder = '已保存（点击重新输入）';
  savedHint.textContent = '✓ 已保存！刷新 VCF 页面即开始自动翻译';
});

updateStatus();
