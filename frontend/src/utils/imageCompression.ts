/**
 * Nén ảnh phía client bằng Canvas API.
 * - Không cần thư viện ngoài.
 * - Nếu nén lỗi hoặc ảnh đã nhỏ hơn ngưỡng, trả về file gốc.
 * - KHÔNG gọi hàm này cho ảnh 360/panorama.
 */

interface CompressOptions {
  maxWidth?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxWidth: 1600,
  quality: 0.8,
};

// Các MIME type hỗ trợ nén
const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Nén một file ảnh. Trả về File đã nén hoặc file gốc nếu không nén được.
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<File> {
  const { maxWidth, quality } = { ...DEFAULT_OPTIONS, ...options };

  // Bỏ qua nếu không phải ảnh nén được
  if (!COMPRESSIBLE_TYPES.includes(file.type)) {
    return file;
  }

  try {
    // Load ảnh vào Image element
    const img = await loadImage(file);

    // Nếu ảnh đã nhỏ hơn maxWidth, không cần resize
    if (img.width <= maxWidth) {
      // Vẫn nén quality nếu file > 500KB
      if (file.size <= 500 * 1024) {
        return file;
      }
    }

    // Tính toán kích thước mới giữ tỷ lệ
    let newWidth = img.width;
    let newHeight = img.height;
    if (newWidth > maxWidth) {
      const ratio = maxWidth / newWidth;
      newWidth = maxWidth;
      newHeight = Math.round(img.height * ratio);
    }

    // Vẽ lên canvas
    const canvas = document.createElement('canvas');
    canvas.width = newWidth;
    canvas.height = newHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[compressImage] Canvas context unavailable, returning original');
      return file;
    }

    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    // Xuất blob — dùng JPEG cho JPG/JPEG, giữ nguyên cho WebP, ép JPEG cho PNG (vì nhẹ hơn nhiều)
    const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const blob = await canvasToBlob(canvas, outputType, quality);

    // Nếu kết quả nén lớn hơn hoặc bằng file gốc, trả về file gốc
    if (blob.size >= file.size) {
      return file;
    }

    // Đổi extension nếu cần
    const ext = outputType === 'image/webp' ? '.webp' : '.jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '');
    const compressedFile = new File([blob], `${baseName}${ext}`, {
      type: outputType,
      lastModified: Date.now(),
    });

    console.info(
      `[compressImage] ${file.name}: ${formatSize(file.size)} → ${formatSize(compressedFile.size)} (${Math.round((1 - compressedFile.size / file.size) * 100)}% giảm)`
    );

    return compressedFile;
  } catch (error) {
    console.warn('[compressImage] Compression failed, using original file:', error);
    return file;
  }
}

/** Load file thành HTMLImageElement */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(img.src);
      reject(err);
    };
    img.src = URL.createObjectURL(file);
  });
}

/** Canvas.toBlob nhưng trả về Promise */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob returned null'));
      },
      type,
      quality
    );
  });
}

/** Format kích thước file cho log */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}
