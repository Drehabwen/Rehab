import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TreatmentPlanApi } from '../treatmentPlanApi';

// Mock fetch
global.fetch = vi.fn();

describe('TreatmentPlanApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateStream', () => {
    it('应该成功调用流式 API 并处理 chunks', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ value: new TextEncoder().encode('治疗'), done: false })
          .mockResolvedValueOnce({ value: new TextEncoder().encode('计划'), done: false })
          .mockResolvedValueOnce({ value: undefined, done: true }),
      };

      const mockResponse = {
        ok: true,
        body: {
          getReader: () => mockReader,
        },
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const chunks: string[] = [];
      const onChunk = (chunk: string) => chunks.push(chunk);

      await TreatmentPlanApi.generateStream('assessment_001', 'patient_001', onChunk);

      expect(chunks).toEqual(['治疗', '计划']);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8002/api/treatment-plan/generate/stream',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        })
      );
    });

    it('应该在 HTTP 错误时抛出异常', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await expect(
        TreatmentPlanApi.generateStream('assessment_001', 'patient_001', () => {})
      ).rejects.toThrow('HTTP error! status: 500');
    });

    it('应该在无响应体时抛出异常', async () => {
      const mockResponse = {
        ok: true,
        body: null,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await expect(
        TreatmentPlanApi.generateStream('assessment_001', 'patient_001', () => {})
      ).rejects.toThrow('No response body');
    });

    it('应该发送正确的请求体', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ value: undefined, done: true }),
      };

      const mockResponse = {
        ok: true,
        body: { getReader: () => mockReader },
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await TreatmentPlanApi.generateStream('assessment_001', 'patient_001', () => {});

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);

      expect(requestBody).toEqual({
        patientId: 'patient_001',
        assessmentId: 'assessment_001',
        createdBy: 'system',
      });
    });

    it('应该处理网络错误', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await expect(
        TreatmentPlanApi.generateStream('assessment_001', 'patient_001', () => {})
      ).rejects.toThrow('Network error');
    });

    it('应该处理空的 chunks', async () => {
      const mockReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ value: new TextEncoder().encode(''), done: false })
          .mockResolvedValueOnce({ value: undefined, done: true }),
      };

      const mockResponse = {
        ok: true,
        body: { getReader: () => mockReader },
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const chunks: string[] = [];
      await TreatmentPlanApi.generateStream('assessment_001', 'patient_001', (chunk) => {
        chunks.push(chunk);
      });

      // 空字符串也会被解码并传递
      expect(chunks).toContain('');
    });
  });

  describe('generate', () => {
    it('应该成功调用非流式 API', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 1,
          content: '治疗计划内容',
          patientId: 'patient_001',
        }),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await TreatmentPlanApi.generate('assessment_001', 'patient_001');

      expect(result).toEqual({
        id: 1,
        content: '治疗计划内容',
        patientId: 'patient_001',
      });
    });

    it('应该在 HTTP 错误时抛出异常', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await expect(
        TreatmentPlanApi.generate('assessment_001', 'patient_001')
      ).rejects.toThrow('HTTP error! status: 404');
    });

    it('应该发送正确的请求体', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await TreatmentPlanApi.generate('assessment_001', 'patient_001');

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1]?.body as string);

      expect(requestBody).toEqual({
        patientId: 'patient_001',
        assessmentId: 'assessment_001',
        createdBy: 'system',
      });
    });

    it('应该处理网络错误', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Connection failed'));

      await expect(
        TreatmentPlanApi.generate('assessment_001', 'patient_001')
      ).rejects.toThrow('Connection failed');
    });

    it('应该处理 JSON 解析错误', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await expect(
        TreatmentPlanApi.generate('assessment_001', 'patient_001')
      ).rejects.toThrow('Invalid JSON');
    });
  });

  describe('API 基础 URL', () => {
    it('应该使用正确的 API 基础 URL', async () => {
      const mockReader = {
        read: vi.fn().mockResolvedValue({ value: undefined, done: true }),
      };

      const mockResponse = {
        ok: true,
        body: { getReader: () => mockReader },
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await TreatmentPlanApi.generateStream('assessment_001', 'patient_001', () => {});

      const url = vi.mocked(fetch).mock.calls[0][0];
      expect(url).toContain('localhost:8002');
    });
  });
});
