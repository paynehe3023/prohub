/**
 * 统一的文件保存工具：
 * - 移动端（粗指针设备）：优先调起系统分享面板（iOS「存储到相册」、Android「保存图片」）
 * - 桌面端：a[download] 直接下载
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches;
}

export async function saveBlob(blob: Blob, fileName: string): Promise<void> {
  if (!blob) return;
  // 移动端优先系统分享面板；用户取消（AbortError）视为已完成，不再回退下载
  if (isMobileDevice() && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: fileName });
        return;
      }
    } catch (err) {
      if (err && (err as DOMException).name === 'AbortError') return;
      // 其他异常（分享不可用等）→ 回退 a[download]
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
