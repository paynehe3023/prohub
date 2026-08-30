/**
 * 三大平台无水印解析端到端测试
 * 用法: node test-watermark-all.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] || 3001;
const HOST = '127.0.0.1';

const TESTS = [
  {
    name: '微博',
    url: 'https://weibo.com/6910766537/5272858477464864',
    expect: { type: 'image', noWatermark: true },
    downloadImage: true,
  },
  {
    name: '抖音',
    url: 'https://www.iesdouyin.com/share/video/7172831829785988383',
    expect: { type: 'video', noWatermark: true },
    downloadVideo: true,
  },
  {
    name: '小红书',
    url: 'https://www.xiaohongshu.com/explore/6a518f22000000000702228e?xsec_token=AB5M1sl2HL9hcJlYHsx1UBo54Kjr5gw4WrHr4DWl5p8hk=&xsec_source=pc_feed',
    expect: { type: 'image', noWatermark: true, urlContains: 'nd_dft' },
    downloadImage: true,
  },
];

function parseUrl(url) {
  const body = JSON.stringify({ url });
  const options = {
    hostname: HOST,
    port: PORT,
    path: '/api/parse',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    timeout: 120000,
  };
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed: ${e.message}\nRaw: ${data.slice(0, 500)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout (120s)')); });
    req.write(body);
    req.end();
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = http.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(dest);
        resolve({ size: stats.size, contentType: res.headers['content-type'] });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Download timeout')); });
    req.setTimeout(60000);
  });
}

async function runTest(test) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`测试: ${test.name}`);
  console.log(`URL: ${test.url}`);
  console.log('='.repeat(60));

  const result = await parseUrl(test.url);

  // 保存完整响应
  const safeName = test.name.replace(/[^a-zA-Z0-9]/g, '_');
  const outFile = path.join(__dirname, `test-result-${safeName}.json`);
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`响应已保存: ${outFile}`);

  // 检查基本字段
  const checks = [];
  checks.push(['success=true', result.success === true]);
  checks.push(['platform 识别', !!result.platform]);
  checks.push(['title 非空', !!result.title]);
  checks.push(['noWatermark=true', result.noWatermark === true]);
  checks.push(['type 匹配', result.type === test.expect.type]);
  if (test.expect.type === 'image') {
    checks.push(['images 非空', Array.isArray(result.images) && result.images.length > 0]);
  } else if (test.expect.type === 'video') {
    checks.push(['video 非空', !!result.video]);
  }
  if (test.expect.urlContains) {
    const hasKeyword = (result.images || []).some(u => u.includes(test.expect.urlContains)) ||
                       (result.video || '').includes(test.expect.urlContains);
    checks.push([`URL 含 ${test.expect.urlContains}`, hasKeyword]);
  }

  // 检查图片/视频 URL 不含水印关键词
  const allUrls = [...(result.images || []), result.video].filter(Boolean);
  const wmPatterns = /water-v2|\/wm\/|wm_video|play_wm|_wm\.mp4|watermarked|wm_h264|download_suffix_logo_addr|logo_name=aweme_dark|!h5_1080/i;
  const hasWm = allUrls.some(u => wmPatterns.test(u));
  checks.push(['URL 无水印关键词', !hasWm]);

  // 输出检查结果
  let allPass = true;
  for (const [name, pass] of checks) {
    console.log(`  ${pass ? 'PASS' : 'FAIL'}: ${name}`);
    if (!pass) allPass = false;
  }

  // 输出媒体 URL
  console.log(`\n媒体 URL:`);
  if (result.images && result.images.length > 0) {
    result.images.forEach((u, i) => console.log(`  [img ${i}] ${u.slice(0, 120)}...`));
  }
  if (result.video) {
    console.log(`  [video] ${result.video.slice(0, 120)}...`);
  }

  // 下载验证
  if (test.downloadImage && result.images && result.images.length > 0) {
    const imgUrl = result.images[0];
    const proxyUrl = `http://${HOST}:${PORT}/api/proxy-image?url=${encodeURIComponent(imgUrl)}`;
    const dest = path.join(__dirname, `test-download-${safeName}.jpg`);
    try {
      console.log(`\n下载图片验证: ${proxyUrl.slice(0, 80)}...`);
      const info = await downloadFile(proxyUrl, dest);
      console.log(`  下载成功: ${dest} (${info.size} bytes, type=${info.contentType})`);
      if (info.size < 5000) {
        console.log(`  WARN: 文件过小 (${info.size} bytes)，可能下载失败`);
        allPass = false;
      }
    } catch (e) {
      console.log(`  下载失败: ${e.message}`);
      allPass = false;
    }
  }

  if (test.downloadVideo && result.video) {
    const proxyUrl = `http://${HOST}:${PORT}/api/proxy-video?url=${encodeURIComponent(result.video)}`;
    const dest = path.join(__dirname, `test-download-${safeName}.mp4`);
    try {
      console.log(`\n下载视频验证: ${proxyUrl.slice(0, 80)}...`);
      const info = await downloadFile(proxyUrl, dest);
      console.log(`  下载成功: ${dest} (${info.size} bytes, type=${info.contentType})`);
      if (info.size < 10000) {
        console.log(`  WARN: 文件过小 (${info.size} bytes)，可能下载失败`);
        allPass = false;
      }
    } catch (e) {
      console.log(`  下载失败: ${e.message}`);
      allPass = false;
    }
  }

  return { name: test.name, pass: allPass, result };
}

async function main() {
  console.log(`\n三大平台无水印解析端到端测试`);
  console.log(`目标: http://${HOST}:${PORT}`);
  console.log(`开始时间: ${new Date().toISOString()}`);

  const results = [];
  for (const test of TESTS) {
    try {
      const r = await runTest(test);
      results.push(r);
    } catch (e) {
      console.log(`\n测试 ${test.name} 异常: ${e.message}`);
      results.push({ name: test.name, pass: false, error: e.message });
    }
  }

  // 汇总
  console.log(`\n${'='.repeat(60)}`);
  console.log('测试汇总');
  console.log('='.repeat(60));
  for (const r of results) {
    console.log(`  ${r.pass ? 'PASS' : 'FAIL'}: ${r.name}${r.error ? ` (${r.error})` : ''}`);
  }
  const allPass = results.every(r => r.pass);
  console.log(`\n总结: ${allPass ? 'ALL PASS' : 'SOME FAILED'}`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
