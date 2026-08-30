// 使用 extractScriptJSON 的清洗逻辑，检查 noteDetailMap 中的图片字段
const fs = require('fs');
const html = fs.readFileSync('/tmp/xhs-axios.html', 'utf8');

function extractScriptJSON(html, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyRegex = new RegExp(`${escapedKey}\\s*=\\s*`, 'gi');
  let keyMatch, lastMatch;
  while ((keyMatch = keyRegex.exec(html)) !== null) { lastMatch = keyMatch; }
  if (!lastMatch) return null;
  const startIdx = lastMatch.index + lastMatch[0].length;
  const char = html[startIdx];
  if (char !== '{' && char !== '[') return null;
  const openChar = char, closeChar = openChar === '{' ? '}' : ']';
  let depth = 0, inString = false, escape = false;
  for (let i = startIdx; i < html.length; i++) {
    const c = html[i];
    if (escape) { escape = false; continue; }
    if (c === '\\') { escape = true; continue; }
    if (c === '"' || c === "'") { inString = !inString; continue; }
    if (inString) continue;
    if (c === openChar) depth++;
    else if (c === closeChar) {
      depth--;
      if (depth === 0) {
        const jsonStr = html.slice(startIdx, i + 1);
        const clean = jsonStr.replace(/\bundefined\b/g, 'null');
        try { return JSON.parse(clean); } catch (e) { console.log('parse err:', e.message); return null; }
      }
    }
  }
  return null;
}

const state = extractScriptJSON(html, 'window.__INITIAL_STATE__');
if (!state) { console.log('no state'); process.exit(0); }
console.log('顶层 keys:', Object.keys(state));

// 找 noteDetailMap
function findKey(obj, key, path = '') {
  if (!obj || typeof obj !== 'object') return [];
  const found = [];
  if (key in obj) found.push({ path, value: obj[key] });
  for (const k of Object.keys(obj)) found.push(...findKey(obj[k], key, `${path}.${k}`));
  return found;
}
const ndm = findKey(state, 'noteDetailMap');
console.log('\nnoteDetailMap 路径:', ndm.map(x => x.path));
if (ndm[0]) {
  const map = ndm[0].value;
  console.log('noteDetailMap keys:', Object.keys(map));
  const firstKey = Object.keys(map)[0];
  console.log('first entry key:', firstKey);
  const entry = map[firstKey];
  console.log('entry keys:', Object.keys(entry || {}));
  const note = entry?.note;
  if (note) {
    console.log('\n=== note keys ===');
    console.log(Object.keys(note));
    console.log('note.title:', note.title);
    console.log('note.desc:', (note.desc || '').slice(0, 80));
    console.log('note.user.nickname:', note.user?.nickname);
    console.log('note.type:', note.type);
    // 找图片相关字段（所有可能命名）
    ['imageList', 'image_list', 'images', 'imageInfoList', 'image', 'imgs', 'imageInfos', 'image_info_list', 'imageInfo'].forEach(k => {
      if (note[k] !== undefined) console.log(`note.${k}:`, JSON.stringify(note[k]).slice(0, 600));
    });
    // 视频
    if (note.video) {
      console.log('\nnote.video keys:', Object.keys(note.video));
      console.log('note.video (head 800):', JSON.stringify(note.video).slice(0, 800));
    }
    // 递归找 urlDefault / noWatermarkDefault 出现的地方
    function findImgUrls(obj, path = '', depth = 0, acc = []) {
      if (!obj || typeof obj !== 'object' || depth > 6) return acc;
      if (typeof obj.urlDefault === 'string') acc.push({ path, url: obj.urlDefault, noWm: obj.noWatermarkDefault });
      if (typeof obj.url === 'string' && /xhscdn|sns|webpic|xiaohongshu/.test(obj.url)) acc.push({ path, url: obj.url });
      for (const k of Object.keys(obj)) findImgUrls(obj[k], `${path}.${k}`, depth + 1, acc);
      return acc;
    }
    const urls = findImgUrls(note);
    console.log('\n=== 找到的图片 URL 候选 ===');
    console.log(JSON.stringify(urls.slice(0, 12), null, 2));
  } else {
    console.log('entry 无 note 字段, entry 全量 keys:', Object.keys(entry));
    console.log('entry JSON head 600:', JSON.stringify(entry).slice(0, 600));
  }
} else {
  console.log('无 noteDetailMap，state 结构:', JSON.stringify(state).slice(0, 800));
}
