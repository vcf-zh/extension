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

// 加载翻译：优先本地内置文件，有网时后台拉取更新
async function loadTranslations() {
  const { vcf_zh_translations } = await chrome.storage.local.get('vcf_zh_translations');
  if (vcf_zh_translations && Object.keys(vcf_zh_translations).length > 0) return;

  // storage 为空 → 从内置文件加载
  try {
    const url = chrome.runtime.getURL('translations/lookup.json');
    const resp = await fetch(url);
    const data = await resp.json();
    await chrome.storage.local.set({ vcf_zh_translations: data, last_updated: Date.now() });
    console.log('[vcf-zh] 已从内置文件加载', Object.keys(data).length, '条翻译');
  } catch (e) {
    console.warn('[vcf-zh] 加载内置翻译失败:', e);
  }
}

// 联网时后台静默拉取最新翻译（合并而非覆盖，不丢失 MiniMax 缓存）
async function fetchOnlineUpdate() {
  try {
    const resp = await fetch(LOOKUP_URL + '?t=' + Date.now(), { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return;
    const online = await resp.json();
    const { vcf_zh_translations } = await chrome.storage.local.get('vcf_zh_translations');
    const merged = { ...online, ...(vcf_zh_translations || {}) };
    await chrome.storage.local.set({ vcf_zh_translations: merged, last_updated: Date.now() });
    console.log('[vcf-zh] 在线更新完成，词库', Object.keys(merged).length, '条');
  } catch {
    // 离线或超时，静默忽略
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
      signal: AbortSignal.timeout(30000),
    });
    if (!resp.ok) return {};
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';
    const clean = text.startsWith('```') ? text.split('```')[1].replace(/^json/, '') : text;
    return JSON.parse(clean);
  } catch {
    return {};
  }
}

async function autoTranslate(strings) {
  const { vcf_zh_minimax_key, vcf_zh_translations } = await chrome.storage.local.get(
    ['vcf_zh_minimax_key', 'vcf_zh_translations']
  );
  if (!vcf_zh_minimax_key) return; // 离线或未配置 key，跳过

  const existing = vcf_zh_translations || {};
  const todo = strings.filter(s => !existing[s] && !KEEP_ENGLISH.has(s));
  if (todo.length === 0) return;

  const result = await translateBatch(todo, vcf_zh_minimax_key);
  const merged = { ...existing };
  for (const [en, zh] of Object.entries(result)) {
    if (zh && zh !== en) merged[en] = zh;
  }
  await chrome.storage.local.set({ vcf_zh_translations: merged });
  console.log('[vcf-zh] 自动翻译', todo.length, '条，词库增至', Object.keys(merged).length, '条');
}

// 启动
chrome.runtime.onInstalled.addListener(async () => {
  await loadTranslations();
  fetchOnlineUpdate(); // 后台静默，不阻塞
});

// 每24小时后台更新一次（仅联网时生效）
chrome.alarms.create('online-update', { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'online-update') fetchOnlineUpdate();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'update') {
    fetchOnlineUpdate().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg.action === 'translate' && msg.strings) {
    autoTranslate(msg.strings).then(() => sendResponse({ ok: true }));
    return true;
  }
});
