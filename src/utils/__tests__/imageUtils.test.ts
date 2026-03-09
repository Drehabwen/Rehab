import { describe, it, expect, beforeEach } from 'vitest';
import {
  compressImage,
  fileToBase64,
  validateImageSize,
  getImageDimensions,
  cropImageToBase64,
  createThumbnail,
} from '../imageUtils';

describe('imageUtils', () => {
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
      const base64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48L3N2Zz4=';
      
      const dimensions = await getImageDimensions(base64);
      expect(dimensions.width).toBe(100);
      expect(dimensions.height).toBe(200);
    }, 10000);

    it('应该处理无效图像', async () => {
      await expect(getImageDimensions('invalid')).rejects.toThrow();
    }, 10000);
  });

  describe('cropImageToBase64', () => {
    it('应该裁剪图像', async () => {
      const base64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0icmVkIi8+PC9zdmc+';
      
      const cropped = await cropImageToBase64(base64, 0, 0, 50, 50);
      expect(cropped).toContain('data:image/jpeg');
    }, 10000);

    it('应该处理无效参数', async () => {
      await expect(cropImageToBase64('invalid', 0, 0, 50, 50)).rejects.toThrow();
    }, 10000);
  });

  describe('createThumbnail', () => {
    it('应该创建缩略图', async () => {
      const base64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0icmVkIi8+PC9zdmc+';
      
      const thumbnail = await createThumbnail(base64, 50);
      expect(thumbnail).toContain('data:image/jpeg');
    }, 10000);

    it('应该使用默认大小', async () => {
      const base64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0icmVkIi8+PC9zdmc+';
      
      const thumbnail = await createThumbnail(base64);
      expect(thumbnail).toContain('data:image/jpeg');
    }, 10000);

    it('应该处理无效图像', async () => {
      await expect(createThumbnail('invalid')).rejects.toThrow();
    }, 10000);
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
    }, 10000);

    it('应该使用默认最大宽度', async () => {
      const svgData = new Blob(
        ['<svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="1000" fill="red"/></svg>'],
        { type: 'image/svg+xml' }
      );
      const file = new File([svgData], 'test.svg', { type: 'image/svg+xml' });
      
      const compressed = await compressImage(file);
      expect(compressed).toContain('data:image/jpeg');
    }, 10000);

    it('应该处理无效文件', async () => {
      const file = new File(['invalid'], 'test.txt', { type: 'text/plain' });
      
      await expect(compressImage(file)).rejects.toThrow();
    }, 10000);
  });
});
