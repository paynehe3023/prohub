// 解析小红书 __INITIAL_STATE__ 结构
const fs = require('fs');
const html = fs.readFileSync('/tmp/xhs-axios.html', 'utf8');

// 提取 window.__INITIAL_STATE__ = {...}
const m = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/)
  || html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/);
if (!m) { console.log('no __INITIAL_STATE__'); process.exit(0); }

let state;
try {
  // 有时是未转义 JSON，有时是 JSON 字符串
  const raw = m[1];
  try { state = JSON.parse(raw); }
  catch { state = JSON.parse(JSON.parse(raw)); }
} catch (e) { console.log('parse err:', e.message, 'raw head:', m[1].slice(0, 200)); process.exit(0); }

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
    console.log('note.user:', note.user?.nickname);
    // 找图片相关字段
    ['imageList', 'image_list', 'images', 'imageInfoList', 'image', 'imgs'].forEach(k => {
      if (note[k] !== undefined) console.log(`note.${k}:`, JSON.stringify(note[k]).slice(0, 400));
    });
    // 视频
    if (note.video) {
      console.log('\nnote.video keys:', Object.keys(note.video));
      console.log('note.video JSON (head 600):', JSON.stringify(note.video).slice(0, 600));
    }
  }
}
