/**
 * X-Bogus 签名算法 — 精确移植自 jiji262/douyin-downloader/utils/xbogus.py
 * 来源: https://github.com/jiji262/douyin-downloader
 * 原始: Evil0ctal/Douyin_TikTok_Download_API (Apache 2.0)
 */

class XBogus {
  constructor(userAgent) {
    this._array = [
      null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
      null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
      null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
      0,1,2,3,4,5,6,7,8,9,null,null,null,null,null,null,null,null,null,null,null,
      null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,
      null,null,null,null,null,null,null,null,null,null,null,null,10,11,12,13,14,15
    ];
    this._character = "Dkdpgh4ZKsQB80/Mfvw36XI1R25-WUAlEi7NLboqYTOPuzmFjJnryx9HVGcaStCe=";
    this._ua_key = [0x00, 0x01, 0x0c];
    this._user_agent = userAgent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
  }

  _md5StrToArray(md5Str) {
    if (typeof md5Str === 'string' && md5Str.length > 32) {
      return [...md5Str].map(c => c.charCodeAt(0));
    }
    const array = [];
    for (let idx = 0; idx < md5Str.length; idx += 2) {
      array.push((this._array[md5Str.charCodeAt(idx)] << 4) | this._array[md5Str.charCodeAt(idx + 1)]);
    }
    return array;
  }

  _md5(input) {
    const crypto = require('crypto');
    let data;
    if (typeof input === 'string') {
      data = this._md5StrToArray(input);
    } else {
      data = input;
    }
    const buf = Buffer.from(data);
    return crypto.createHash('md5').update(buf).digest('hex');
  }

  _md5Encrypt(urlPath) {
    const hashed = this._md5(this._md5StrToArray(this._md5(urlPath)));
    return this._md5StrToArray(hashed);
  }

  _rc4Encrypt(key, data) {
    const s = Array.from({length: 256}, (_, i) => i);
    let j = 0;
    const encrypted = [];
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + key[i % key.length]) % 256;
      [s[i], s[j]] = [s[j], s[i]];
    }
    let ii = 0; j = 0;
    for (const byte of data) {
      ii = (ii + 1) % 256;
      j = (j + s[ii]) % 256;
      [s[ii], s[j]] = [s[j], s[ii]];
      encrypted.push(byte ^ s[(s[ii] + s[j]) % 256]);
    }
    return encrypted;
  }

  _calculation(a1, a2, a3) {
    const x3 = ((a1 & 255) << 16) | ((a2 & 255) << 8) | (a3 & 255);
    return (
      this._character[(x3 & 16515072) >> 18] +
      this._character[(x3 & 258048) >> 12] +
      this._character[(x3 & 4032) >> 6] +
      this._character[x3 & 63]
    );
  }

  _encodingConversion(a, b, c, e, d, t, f, r, n, o, i, _, x, u, s, l, v, h, p) {
    const payload = [a, parseInt(i), b, _, c, x, e, u, d, s, t, l, f, v, r, h, n, p, o];
    return payload.map(v => String.fromCharCode(v)).join('');
  }

  build(url) {
    // UA MD5 processing: RC4 encrypt UA, then base64, then MD5
    const uaBytes = [...this._user_agent].map(c => c.charCodeAt(0));
    const uaRc4 = this._rc4Encrypt(this._ua_key, uaBytes);
    const uaB64 = Buffer.from(uaRc4).toString('base64');
    const uaMd5 = this._md5StrToArray(this._md5(uaB64));

    // Empty string MD5
    const emptyMd5 = this._md5StrToArray(this._md5(this._md5StrToArray("d41d8cd98f00b204e9800998ecf8427e")));

    // URL MD5 processing
    const urlMd5 = this._md5Encrypt(url);

    const timer = Math.floor(Date.now() / 1000);
    const ct = 536919696;

    const new_array = [
      64,
      0.00390625,
      1,
      12,
      urlMd5[14],
      urlMd5[15],
      emptyMd5[14],
      emptyMd5[15],
      uaMd5[14],
      uaMd5[15],
      (timer >> 24) & 255,
      (timer >> 16) & 255,
      (timer >> 8) & 255,
      timer & 255,
      (ct >> 24) & 255,
      (ct >> 16) & 255,
      (ct >> 8) & 255,
      ct & 255,
    ];

    // XOR all values
    let xor_result = new_array[0];
    for (let idx = 1; idx < new_array.length; idx++) {
      xor_result ^= Math.floor(new_array[idx]);
    }
    new_array.push(xor_result);

    // Split into two arrays (interleaved)
    const array3 = [];
    const array4 = [];
    for (let idx = 0; idx < new_array.length; idx += 2) {
      array3.push(Math.floor(new_array[idx]));
      if (idx + 1 < new_array.length) {
        array4.push(Math.floor(new_array[idx + 1]));
      }
    }

    const merged = [...array3, ...array4];

    // Encoding conversion + RC4 encryption
    const encConverted = this._encodingConversion(...merged);
    const rc4Key = [0xFF];
    const rc4Result = this._rc4Encrypt(rc4Key, [...encConverted].map(c => c.charCodeAt(0)));

    // Build garbled string: \x02 + \xFF + RC4 result
    const garbledChars = [2, 255, ...rc4Result];
    const garbled = garbledChars.map(b => String.fromCharCode(b)).join('');

    // Final X-Bogus string (4 chars per 3 input chars)
    let xb = "";
    for (let idx = 0; idx < garbled.length; idx += 3) {
      xb += this._calculation(
        garbled.charCodeAt(idx),
        garbled.charCodeAt(idx + 1),
        garbled.charCodeAt(idx + 2)
      );
    }

    return xb;
  }
}

function generateXbogus(queryString, userAgent) {
  const signer = new XBogus(userAgent);
  return signer.build(queryString);
}

module.exports = { generateXbogus, XBogus };
