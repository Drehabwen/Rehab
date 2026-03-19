import { describe, expect, it } from 'vitest';
import { sanitizeMarkdownContent, sanitizeReadableText } from '../MarkdownReport';

describe('sanitizeMarkdownContent', () => {
  it('normalizes markdown headings and preserves readable Chinese content', () => {
    const sanitized = sanitizeMarkdownContent('###基础报告\n\n结论正常。');

    expect(sanitized).toContain('### 基础报告');
    expect(sanitized).toContain('结论正常。');
  });

  it('filters mojibake lines from markdown content', () => {
    const sanitized = sanitizeMarkdownContent(`### 基础报告
\u95c0\u7102\u95b2\u95b8\u7f51\u60d5
建议继续训练。`);

    expect(sanitized).toContain('### 基础报告');
    expect(sanitized).toContain('建议继续训练。');
    expect(sanitized).not.toContain('\u95c0\u7102\u95b2\u95b8\u7f51\u60d5');
  });

  it('returns empty content when the whole payload is mojibake', () => {
    const sanitized = sanitizeMarkdownContent('\u95c0\u7102\u95b2\u95b8\u7f51\u60d5\n\u9422\u3126\u509c\u5a34\u5d87\u76d3');

    expect(sanitized).toBe('');
  });

  it('normalizes front side back headings into readable Chinese labels', () => {
    const sanitized = sanitizeMarkdownContent('### front posture analysis\n### 肩髋分析');

    expect(sanitized).toContain('### 正面评估');
    expect(sanitized).toContain('### 肩髋分析');
    expect(sanitized).not.toContain('front posture analysis');
  });

  it('filters lines containing bopomofo-like mojibake fragments', () => {
    const sanitized = sanitizeReadableText(`正常摘要
\u3113\u311a\u3127\u7092\u928a
继续观察。`);

    expect(sanitized).toContain('正常摘要');
    expect(sanitized).toContain('继续观察。');
    expect(sanitized).not.toContain('\u3113\u311a\u3127\u7092\u928a');
  });
});
