const toggle = document.getElementById('toggle');
const refreshBtn = document.getElementById('refresh');
const status = document.getElementById('status');

async function updateStatus() {
  const { last_updated, vcf_zh_translations } = await chrome.storage.local.get(['last_updated', 'vcf_zh_translations']);
  const count = vcf_zh_translations ? Object.keys(vcf_zh_translations).length : 0;
  const time = last_updated ? new Date(last_updated).toLocaleString('zh-CN') : '从未';
  status.textContent = `翻译条数：${count} | 最近更新：${time}`;
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

updateStatus();
