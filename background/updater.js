const LOOKUP_URL =
  'https://cdn.jsdelivr.net/gh/vcf-zh/strings@main/versions/9.1/lookup.json';
const MINIMAX_URL = 'https://api.minimax.chat/v1/chat/completions';
const KEEP_ENGLISH = new Set([
  'vMotion','NSX','DRS','HA','VCF','ESXi','vSAN','BGP','VXLAN','Geneve',
  'vSphere','vCenter','SDDC','CPU','GPU','NVMe','RAID','IOPS','DNS','DHCP',
  'VMware','Kubernetes','vDS','VKS','EVC','VMDK','OVF','OVA','API',
]);

const SYSTEM_PROMPT = `你是 VMware 产品 UI 本地化专家，将英文界面字符串翻译为简体中文。
规则：
1. 以下品牌名保持英文原文不翻译：${[...KEEP_ENGLISH].join('、')}
2. UI 标签要简洁，不超过英文长度的 1.5 倍
3. 输出纯 JSON 对象，key 与输入相同，value 为中文译文
4. 不输出任何解释`;

async function fetchLookup() {
  try {
    const resp = await fetch(LOOKUP_URL + '?t=' + Date.now());
    if (!resp.ok) return null;
    return await resp.json();
  } catch { return null; }
}

async function updateLookup() {
  const data = await fetchLookup();
  if (data) {
    await chrome.storage.local.set({ vcf_zh_translations: data, last_updated: Date.now() });
    console.log('[vcf-zh] 翻译包已更新，共', Object.keys(data).length, '条');
  }
}

async function translateBatch(strings, apiKey) {
  if (!apiKey || strings.length === 0) return {};
  const batch = {};
  strings.forEach(s => { batch[s] = s; });
  try {
    const resp = await fetch(MINIMAX_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: '翻译：\n' + JSON.stringify(batch, null, 2) },
        ],
        temperature: 0.1,
      }),
    });
    if (!resp.ok) return {};
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    const clean = text.startsWith('```') ? text.split('```')[1].replace(/^json/, '') : text;
    return JSON.parse(clean);
  } catch (e) {
    console.warn('[vcf-zh] 翻译失败:', e);
    return {};
  }
}

async function autoTranslate(strings) {
  const { vcf_zh_minimax_key, vcf_zh_translations } = await chrome.storage.local.get(
    ['vcf_zh_minimax_key', 'vcf_zh_translations']
  );
  if (!vcf_zh_minimax_key) return;

  const existing = vcf_zh_translations || {};
  const todo = strings.filter(s => !existing[s] && !KEEP_ENGLISH.has(s));
  if (todo.length === 0) return;

  console.log('[vcf-zh] 自动翻译', todo.length, '条新字符串...');
  const result = await translateBatch(todo, vcf_zh_minimax_key);

  const merged = { ...existing };
  for (const [en, zh] of Object.entries(result)) {
    if (zh && zh !== en) merged[en] = zh;
  }
  // keep_original 强制还原
  todo.forEach(s => { if (KEEP_ENGLISH.has(s)) merged[s] = undefined; });

  await chrome.storage.local.set({ vcf_zh_translations: merged });
  console.log('[vcf-zh] 翻译完成，词库增至', Object.keys(merged).length, '条');
}

// 初始化：拉取远端词库
chrome.runtime.onInstalled.addListener(updateLookup);
chrome.alarms.create('update-lookup', { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'update-lookup') updateLookup();
});

// 消息处理
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'update') {
    updateLookup().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.action === 'translate' && msg.strings) {
    autoTranslate(msg.strings).then(() => sendResponse({ ok: true }));
    return true;
  }
});
