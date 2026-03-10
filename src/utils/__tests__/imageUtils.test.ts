import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  compressImage,
  fileToBase64,
  validateImageSize,
  getImageDimensions,
  cropImageToBase64,
  createThumbnail,
} from '../imageUtils';

const VALID_SVG_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0icmVkIi8+PC9zdmc+';
const JPEG_OUTPUT = 'data:image/jpeg;base64,mocked-output';

const originalCreateElement = document.createElement.bind(document);

const parseSvgDimensions = (value: string) => {
  if (!value.startsWith('data:image/')) {
    return null;
  }

  const encoded = value.split(',')[1];
  if (!encoded) {
    return { width: 100, height: 100 };
  }

  const decoded = atob(encoded);
  const widthMatch = decoded.match(/width="(\d+)"/);
  const heightMatch = decoded.match(/height="(\d+)"/);

  return {
    width: widthMatch ? Number(widthMatch[1]) : 100,
    height: heightMatch ? Number(heightMatch[1]) : 100,
  };
};

class MockImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  width = 0;
  height = 0;
  private _src = '';

  set src(value: string) {
    this._src = value;

    setTimeout(() => {
      const dimensions = parseSvgDimensions(value);
      if (!dimensions) {
        this.onerror?.();
        return;
      }

      this.width = dimensions.width;
      this.height = dimensions.height;
      this.onload?.();
    }, 0);
  }

  get src() {
    return this._src;
  }
}

describe('imageUtils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('Image', MockImage as unknown as typeof Image);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: vi.fn(() => ({
            drawImage: vi.fn(),
          })),
          toDataURL: vi.fn(() => JPEG_OUTPUT),
        } as unknown as HTMLCanvasElement;
      }

      return originalCreateElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('validateImageSize', () => {
    it('应该验证小图像', () => {
      const smallBase64 = 'data:image/jpeg;base64,' + 'a'.repeat(100);
      expect(validateImageSize(smallBase64, 500)).toBe(true);
    });

    it('应该拒绝大图像', () => {
      const largeBase64 = 'data:image/jpeg;base64,' + 'a'.repeat(600000);
      expect(validateImageSize(largeBase64, 500)).toBe(false);
    });

    it('应该使用默认大小限制', () => {
      const smallBase64 = 'data:image/jpeg;base64,' + 'a'.repeat(100);
      expect(validateImageSize(smallBase64)).toBe(true);
    });
  });

  describe('fileToBase64', () => {
    it('应该将文件转换为Base64', async () => {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

      const base64 = await fileToBase64(file);
      expect(base64).toContain('data:text/plain;base64,');
    });

    it('应该处理空文件', async () => {
      const file = new File([''], 'empty.txt', { type: 'text/plain' });

      const base64 = await fileToBase64(file);
      expect(base64).toContain('data:text/plain;base64,');
    });
  });

  describe('getImageDimensions', () => {
    it('应该获取图像尺寸', async () => {
      const dimensions = await getImageDimensions(VALID_SVG_BASE64);
      expect(dimensions.width).toBe(100);
      expect(dimensions.height).toBe(200);
    });

    it('应该处理无效图像', async () => {
      await expect(getImageDimensions('invalid')).rejects.toThrow();
    });
  });

  describe('cropImageToBase64', () => {
    it('应该裁剪图像', async () => {
      const cropped = await cropImageToBase64(VALID_SVG_BASE64, 0, 0, 50, 50);
      expect(cropped).toContain('data:image/jpeg');
    });

    it('应该处理无效参数', async () => {
      await expect(cropImageToBase64('invalid', 0, 0, 50, 50)).rejects.toThrow();
    });
  });

  describe('createThumbnail', () => {
    it('应该创建缩略图', async () => {
      const thumbnail = await createThumbnail(VALID_SVG_BASE64, 50);
      expect(thumbnail).toContain('data:image/jpeg');
    });

    it('应该使用默认大小', async () => {
      const thumbnail = await createThumbnail(VALID_SVG_BASE64);
      expect(thumbnail).toContain('data:image/jpeg');
    });

    it('应该处理无效图像', async () => {
      await expect(createThumbnail('invalid')).rejects.toThrow();
    });
  });

  describe('compressImage', () => {
    it('应该压缩图像', async () => {
      const svgData = new Blob(
        ['<svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="1000" fill="red"/></svg>'],
        { type: 'image/svg+xml' }
      );
      const file = new File([svgData], 'test.svg', { type: 'image/svg+xml' });

      const compressed = await compressImage(file, 500);
      expect(compressed).toContain('data:image/jpeg');
    });

    it('应该使用默认最大宽度', async () => {
      const svgData = new Blob(
        ['<svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="1000" fill="red"/></svg>'],
        { type: 'image/svg+xml' }
      );
      const file = new File([svgData], 'test.svg', { type: 'image/svg+xml' });

      const compressed = await compressImage(file);
      expect(compressed).toContain('data:image/jpeg');
    });

    it('应该处理无效文件', async () => {
      const file = new File(['invalid'], 'test.txt', { type: 'text/plain' });

      await expect(compressImage(file)).rejects.toThrow();
    });
  });
});
