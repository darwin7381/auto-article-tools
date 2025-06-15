/**
 * TinyPNG 圖片壓縮服務
 * 
 * 提供圖片壓縮功能，用於在上傳到 WordPress 前壓縮過大的圖片
 */

/**
 * 單次壓縮圖片使用 TinyPNG API
 * @param imageBuffer 原始圖片 Buffer
 * @param apiKey TinyPNG API Key
 * @returns 壓縮後的圖片 Buffer
 */
async function singleCompressWithTinyPng(
  imageBuffer: Buffer,
  apiKey: string
): Promise<Buffer> {
  // 第一步：上傳圖片到 TinyPNG
  const uploadResponse = await fetch('https://api.tinify.com/shrink', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  });
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('TinyPNG 上傳失敗:', uploadResponse.status, errorText);
    throw new Error(`TinyPNG 上傳失敗: ${uploadResponse.status} ${uploadResponse.statusText}`);
  }
  
  const uploadResult = await uploadResponse.json();
  
  if (!uploadResult.output || !uploadResult.output.url) {
    throw new Error('TinyPNG 響應格式不正確，缺少下載URL');
  }
  
  // 第二步：下載壓縮後的圖片
  const downloadResponse = await fetch(uploadResult.output.url, {
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
    },
  });
  
  if (!downloadResponse.ok) {
    throw new Error(`下載壓縮圖片失敗: ${downloadResponse.status} ${downloadResponse.statusText}`);
  }
  
  const compressedBuffer = Buffer.from(await downloadResponse.arrayBuffer());
  
  console.log(`壓縮比例: ${uploadResult.output.ratio}，新大小: ${(compressedBuffer.length / 1024).toFixed(2)} KB`);
  
  return compressedBuffer;
}

/**
 * 多次壓縮圖片使用 TinyPNG API（最多3次）
 * @param imageBuffer 原始圖片 Buffer
 * @param apiKey TinyPNG API Key
 * @param targetSizeKB 目標大小（KB），默認250KB
 * @returns 壓縮後的圖片 Buffer
 */
export async function compressImageWithTinyPng(
  imageBuffer: Buffer,
  apiKey: string,
  targetSizeKB: number = 250
): Promise<Buffer> {
  try {
    const originalSizeKB = imageBuffer.length / 1024;
    console.log(`開始使用 TinyPNG 多次壓縮圖片，原始大小: ${originalSizeKB.toFixed(2)} KB，目標大小: ${targetSizeKB} KB`);
    
    let currentBuffer = imageBuffer;
    let currentSizeKB = originalSizeKB;
    let compressionCount = 0;
    const maxCompressions = 3;
    
    while (compressionCount < maxCompressions && currentSizeKB > targetSizeKB) {
      compressionCount++;
      console.log(`第 ${compressionCount} 次壓縮，當前大小: ${currentSizeKB.toFixed(2)} KB`);
      
      try {
        const compressedBuffer = await singleCompressWithTinyPng(currentBuffer, apiKey);
        const newSizeKB = compressedBuffer.length / 1024;
        
        // 檢查壓縮效果，如果幾乎沒有變化就停止
        const compressionRatio = (currentSizeKB - newSizeKB) / currentSizeKB;
        
        if (compressionRatio < 0.05) { // 如果壓縮效果小於5%就停止
          console.log(`第 ${compressionCount} 次壓縮效果微小 (${(compressionRatio * 100).toFixed(1)}%)，停止進一步壓縮`);
          break;
        }
        
        currentBuffer = compressedBuffer;
        currentSizeKB = newSizeKB;
        
        console.log(`第 ${compressionCount} 次壓縮完成，大小: ${currentSizeKB.toFixed(2)} KB，減少: ${(compressionRatio * 100).toFixed(1)}%`);
        
        // 如果已達到目標大小，提前停止
        if (currentSizeKB <= targetSizeKB) {
          console.log(`已達到目標大小，停止壓縮`);
          break;
        }
        
      } catch (error) {
        console.error(`第 ${compressionCount} 次壓縮失敗:`, error);
        
        // 如果不是第一次壓縮，使用上一次的結果
        if (compressionCount > 1) {
          console.log('使用上一次壓縮結果');
          break;
        } else {
          throw error; // 第一次壓縮失敗，拋出錯誤
        }
      }
    }
    
    const finalSizeKB = currentBuffer.length / 1024;
    const totalCompressionRatio = (originalSizeKB - finalSizeKB) / originalSizeKB;
    
    console.log(`圖片壓縮完成！經過 ${compressionCount} 次壓縮`);
    console.log(`最終結果: ${originalSizeKB.toFixed(2)} KB -> ${finalSizeKB.toFixed(2)} KB`);
    console.log(`總壓縮率: ${(totalCompressionRatio * 100).toFixed(1)}%`);
    
    if (finalSizeKB > targetSizeKB) {
      console.warn(`⚠️  最終大小 (${finalSizeKB.toFixed(2)} KB) 仍超過目標 (${targetSizeKB} KB)，但已達到最佳壓縮效果`);
    } else {
      console.log(`✅ 成功達到目標大小！`);
    }
    
    return currentBuffer;
  } catch (error) {
    console.error('TinyPNG 多次壓縮失敗:', error);
    throw new Error(`圖片壓縮失敗: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 檢查圖片是否需要壓縮
 * @param imageSize 圖片大小（字節）
 * @param thresholdKB 閾值（KB），默認 250KB
 * @returns 是否需要壓縮
 */
export function shouldCompressImage(imageSize: number, thresholdKB: number = 250): boolean {
  const sizeKB = imageSize / 1024;
  return sizeKB > thresholdKB;
}

/**
 * 壓縮圖片 Blob
 * @param imageBlob 原始圖片 Blob
 * @param apiKey TinyPNG API Key
 * @param targetSizeKB 目標大小（KB），默認250KB
 * @returns 壓縮後的 Blob
 */
export async function compressBlobWithTinyPng(
  imageBlob: Blob,
  apiKey: string,
  targetSizeKB: number = 250
): Promise<Blob> {
  // 將 Blob 轉換為 Buffer
  const arrayBuffer = await imageBlob.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuffer);
  
  // 壓縮圖片
  const compressedBuffer = await compressImageWithTinyPng(imageBuffer, apiKey, targetSizeKB);
  
  // 轉換回 Blob
  return new Blob([compressedBuffer], { type: imageBlob.type });
} 