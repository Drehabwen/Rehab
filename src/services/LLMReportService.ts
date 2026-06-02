import { APP_CONFIG } from '../config/appConfig';

export class LLMReportService {
  private apiKey: string;
  private apiEndpoint: string;

  constructor() {
    this.apiKey = APP_CONFIG.LLM_API_KEY || '';
    this.apiEndpoint = APP_CONFIG.LLM_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
  }

  async generateReport(prompt: string, format: 'markdown' | 'html' | 'pdf'): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('LLM API密钥未配置');
      }

      const response = await this.callLLM(prompt);
      let content = this.extractContent(response);

      if (format === 'html') {
        content = this.convertToHtml(content);
      } else if (format === 'pdf') {
        content = this.convertToPdf(content);
      }

      return content;
    } catch (error) {
      console.error('LLM报告生成失败:', error);
      return this.generateFallbackReport(prompt, format);
    }
  }

  private async callLLM(prompt: string): Promise<any> {
    const requestBody = {
      model: APP_CONFIG.LLM_MODEL || 'deepseek-v4-flash',
      messages: [
        {
          role: 'system',
          content: '你是一位专业的康复医学专家，擅长分析评估数据并生成详细的康复报告。请根据提供的数据生成专业、准确、详细的报告。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.95
    };

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`LLM API请求失败: ${response.status}`);
    }

    return await response.json();
  }

  private extractContent(response: any): string {
    if (response && response.choices && response.choices.length > 0) {
      return response.choices[0].message?.content || '';
    }
    throw new Error('LLM响应格式错误');
  }

  private convertToHtml(markdown: string): string {
    // 简单的Markdown转HTML
    let html = markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/gim, '<br>');

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>康复报告</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
        h1, h2, h3 { color: #333; }
        ul { margin-left: 20px; }
        strong { font-weight: bold; }
        em { font-style: italic; }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
    `;
  }

  private convertToPdf(content: string): string {
    // 这里只是返回内容，实际PDF生成需要使用专门的库
    return content;
  }

  private generateFallbackReport(prompt: string, format: 'markdown' | 'html' | 'pdf'): string {
    const fallbackContent = `
# 报告生成失败

## 原因
- LLM API调用失败
- 可能是网络问题或API密钥配置错误

## 建议
1. 检查网络连接
2. 确认API密钥是否正确配置
3. 稍后重试

## 原始请求
${prompt.substring(0, 500)}...
`;

    if (format === 'html') {
      return this.convertToHtml(fallbackContent);
    }

    return fallbackContent;
  }

  async generateSummary(data: any): Promise<string> {
    try {
      const prompt = `
      请根据以下康复数据生成一份简要总结：

      ${JSON.stringify(data, null, 2)}

      总结要求：
      1. 控制在200字以内
      2. 突出重点发现和关键指标
      3. 使用专业但简洁的语言
      4. 包含主要问题和建议
      `;

      const response = await this.callLLM(prompt);
      return this.extractContent(response);
    } catch (error) {
      console.error('生成总结失败:', error);
      return '无法生成总结，请检查网络连接或API配置。';
    }
  }

  async generateRecommendations(data: any): Promise<string[]> {
    try {
      const prompt = `
      请根据以下康复数据生成具体的康复建议：

      ${JSON.stringify(data, null, 2)}

      建议要求：
      1. 每条建议独立成项
      2. 具体可行
      3. 针对发现的问题
      4. 按优先级排序
      `;

      const response = await this.callLLM(prompt);
      const content = this.extractContent(response);
      return content.split('\n').filter(line => line.trim() && line.startsWith('-')).map(line => line.trim());
    } catch (error) {
      console.error('生成建议失败:', error);
      return ['保持定期康复训练', '注意姿势纠正', '遵循医生建议'];
    }
  }

  async analyzeProgress(previousData: any, currentData: any): Promise<string> {
    try {
      const prompt = `
      请分析以下康复进度数据：

      之前的评估：
      ${JSON.stringify(previousData, null, 2)}

      当前的评估：
      ${JSON.stringify(currentData, null, 2)}

      分析要求：
      1. 对比两个评估的差异
      2. 评估康复进展情况
      3. 指出改善的方面和仍需注意的问题
      4. 提供下一步建议
      5. 使用专业但易于理解的语言
      `;

      const response = await this.callLLM(prompt);
      return this.extractContent(response);
    } catch (error) {
      console.error('分析进度失败:', error);
      return '无法分析进度，请检查数据或API配置。';
    }
  }
}
