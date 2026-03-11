import { describe, expect, it } from 'vitest';
import { sanitizeMarkdownContent, sanitizeReadableText } from '../MarkdownReport';

describe('sanitizeMarkdownContent', () => {
  it('normalizes markdown headings and preserves valid Chinese content', () => {
    const sanitized = sanitizeMarkdownContent('###基础报告\n\n结论正常。');

    expect(sanitized).toContain('### 基础报告');
    expect(sanitized).toContain('结论正常。');
  });

  it('filters mojibake lines from markdown content', () => {
    const sanitized = sanitizeMarkdownContent('### 基础报告\n鍩虹鎶ュ憡\n建议继续训练。');

    expect(sanitized).toContain('### 基础报告');
    expect(sanitized).toContain('建议继续训练。');
    expect(sanitized).not.toContain('鍩虹鎶ュ憡');
  });

  it('returns empty content when the whole payload is mojibake', () => {
    const sanitized = sanitizeMarkdownContent('鍩虹鎶ュ憡\n寮傚父鏁版嵁');

    expect(sanitized).toBe('');
  });

  it('normalizes front-side-back headings into readable Chinese labels', () => {
    const sanitized = sanitizeMarkdownContent('### front 瑷鳴ㄥ璟隍湥\n### 肩膀分析');

    expect(sanitized).toContain('### 正面评估');
    expect(sanitized).toContain('### 肩膀分析');
    expect(sanitized).not.toContain('瑷鳴');
  });

  it('filters lines containing bopomofo-like mojibake fragments', () => {
    const sanitized = sanitizeReadableText('正常摘要\n瑷鳴ㄥ璟隍湥\n继续观察。');

    expect(sanitized).toContain('正常摘要');
    expect(sanitized).toContain('继续观察。');
    expect(sanitized).not.toContain('瑷鳴ㄥ璟隍湥');
  });
});
