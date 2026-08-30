// 1) 测试水印检测；2) 用带 xsec_token 的链接检查 noteDetailMap 结构
const axios = require('axios');
const { isWatermarkedImageUrl, allNoWatermark } = require('./utils/watermark');

const imgUrl = 'http://sns-webpic-qc.xhscdn.com/202608291843/66649b6c86756f7f14c8b9b3dd222fe3/notes_pre_post/1040g3k0322fat0b1na005pr078n62t06j08g33o!h5_1080jpg';
console.log('isWatermarkedImageUrl:', isWatermarkedImageUrl(imgUrl));
console.log('allNoWatermark([img]):', allNoWatermark([imgUrl], 'image'));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const NOTE_URL = 'https://www.xiaohongshu.com/explore/6a518f22000000000702228e?xsec_token=AB5M1sl2HL9hcJlYHsx1UBo54Kjr5gw4WrHr4DWl5p8hk=&xsec_source=pc_feed';

(async () => {
  const res = await axios.get(NOTE_URL, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9', Cookie: 'xsecappid=xhs-pc-web; webId=abc123;', Referer: 'https://www.xiaohongshu.com/' },
    timeout: 15000, maxRedirects: 5, responseType: 'text', validateStatus: s => s < 500,
  });
  const html = res.data || '';
  console.log('\nnote page len:', html.length, 'has noteDetailMap:', html.includes('noteDetailMap'), 'has imageList:', html.includes('imageList'));

  // 复用 extractScriptJSON 清洗
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
  if (!state) { console.log('no state'); return; }
  const note = state?.note?.noteDetailMap ? Object.values(state.note.noteDetailMap)[0]?.note : null;
  if (!note) { console.log('no note in noteDetailMap; state.note keys:', Object.keys(state.note || {})); return; }
  console.log('\nnote keys:', Object.keys(note));
  console.log('note.title:', note.title);
  console.log('note.type:', note.type);
  // 找所有可能的图片字段
  Object.keys(note).forEach(k => {
    if (/image|img|pic|photo|media/i.test(k)) {
      console.log(`\nnote.${k} (type ${Array.isArray(note[k]) ? 'array['+note[k].length+']' : typeof note[k]}):`);
      console.log(JSON.stringify(note[k]).slice(0, 1200));
    }
  });
})();
