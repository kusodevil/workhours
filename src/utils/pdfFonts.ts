import jsPDF from 'jspdf';

// Noto Sans TC 繁體中文字體支援
// 從本地 public/fonts 目錄加載（無網絡依賴，最可靠）

let fontLoaded = false;
let fontBase64Cache: string | null = null;

export async function loadChineseFont(doc: jsPDF): Promise<void> {
  if (fontLoaded && fontBase64Cache) {
    // 使用快取的字體
    doc.addFileToVFS('NotoSansTC-Regular.ttf', fontBase64Cache);
    doc.addFont('NotoSansTC-Regular.ttf', 'NotoSansTC', 'normal');
    doc.setFont('NotoSansTC');
    return;
  }

  try {
    console.log('開始載入中文字體...');

    // 從本地 public 目錄加載字體（最可靠，無網絡依賴）
    const fontUrl = '/fonts/noto-sans-tc-v39-chinese-traditional-regular.ttf';

    const response = await fetch(fontUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const fontBuffer = await response.arrayBuffer();
    console.log('字體下載完成，大小:', fontBuffer.byteLength, 'bytes');

    const fontBase64 = arrayBufferToBase64(fontBuffer);
    fontBase64Cache = fontBase64;

    // 將字體添加到 jsPDF
    doc.addFileToVFS('NotoSansTC-Regular.ttf', fontBase64);
    doc.addFont('NotoSansTC-Regular.ttf', 'NotoSansTC', 'normal');
    doc.setFont('NotoSansTC');

    fontLoaded = true;
    console.log('中文字體載入成功');
  } catch (error) {
    console.error('載入中文字體失敗:', error);
    console.warn('將使用預設字體，中文可能無法正常顯示');
    // 不拋出錯誤，讓 PDF 生成繼續進行，使用預設字體
  }
}

// 將 ArrayBuffer 轉換為 Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  let binary = '';

  // 分批處理以避免 stack overflow
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }

  return btoa(binary);
}
