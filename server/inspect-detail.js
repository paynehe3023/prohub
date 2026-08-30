const d = require('/tmp/dy-stealth-detail.json');
const a = d.aweme_detail;
console.log('aweme_id:', a.aweme_id);
console.log('desc:', a.desc);
console.log('author:', a.author && a.author.nickname);
const v = a.video || {};
console.log('video keys:', Object.keys(v));
console.log('bit_rate len:', (v.bit_rate || []).length);
const br = (v.bit_rate || [])[0] || {};
console.log('br0 play_addr urls:', (br.play_addr || br.playAddr || {}).url_list);
console.log('play_addr urls:', (v.play_addr || {}).url_list);
console.log('play_addr_str:', v.play_addr_str);
console.log('play_addr_h264 urls:', (v.play_addr_h264 || {}).url_list);
console.log('play_addr_265 urls:', (v.play_addr_265 || {}).url_list);
console.log('download_addr urls:', (v.download_addr || {}).url_list);
console.log('download_suffix_logo_addr urls:', (v.download_suffix_logo_addr || {}).url_list);
console.log('cover:', (v.cover || {}).url_list && (v.cover || {}).url_list[0]);
console.log('images:', (a.images || []).length);
// 检查所有 url_list 是否有水印关键词
const allUrls = JSON.stringify(v);
['watermark','water-v2','/wm/','wm_','play_wm','logo'].forEach(k => {
  if (allUrls.includes(k)) console.log('FOUND watermark hint:', k);
});
