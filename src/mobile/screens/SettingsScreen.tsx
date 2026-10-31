import React, { useState } from 'react';
import {
  clearAiConfig,
  isAsrReady,
  isLlmReady,
  loadAiConfig,
  saveAiConfig,
  type AiConfig,
} from '../ai/config';
import { structureTranscript } from '../ai/structure';

interface SettingsScreenProps {
  onBack: () => void;
}

const inputClass = 'mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-[12.5px] outline-none focus:border-[#0f9b8e]';
const labelClass = 'mt-2 block text-[11px] text-slate-500';

/** 设置页：ASR（讯飞 / OpenAI 兼容）与 LLM 配置。key 只存本机，不进仓库。 */
export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig());
  const [message, setMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const updateAsr = (patch: Partial<AiConfig['asr']>) => setConfig((c) => ({ ...c, asr: { ...c.asr, ...patch } }));
  const updateIflytek = (patch: Partial<AiConfig['asr']['iflytek']>) =>
    setConfig((c) => ({ ...c, asr: { ...c.asr, iflytek: { ...c.asr.iflytek, ...patch } } }));
  const updateLlm = (patch: Partial<AiConfig['llm']>) => setConfig((c) => ({ ...c, llm: { ...c.llm, ...patch } }));

  const handleSave = () => {
    saveAiConfig(config);
    setMessage('已保存到本机（不会上传到任何服务器）');
  };

  const handleClear = () => {
    clearAiConfig();
    setConfig(loadAiConfig());
    setMessage('已清除本机配置');
  };

  const handleTestLlm = async () => {
    setTesting(true);
    setMessage(null);
    const result = await structureTranscript('患者腰痛两个月，走路加重，做过理疗，建议核心训练。', config);
    setTesting(false);
    setMessage(
      'data' in result
        ? `LLM 连通：${Object.values(result.data).filter(Boolean).length} 个字段已结构化`
        : `LLM 测试失败：${result.reason}`,
    );
  };

  const iflytek = config.asr.iflytek;

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-bold text-slate-900">语音转写（ASR）</span>
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isAsrReady(config) ? 'bg-[#0f9b8e]/10 text-[#0f9b8e]' : 'bg-slate-100 text-slate-500'}`}>
            {isAsrReady(config) ? '已配置' : '未配置'}
          </span>
        </div>

        <div className="mt-2 flex gap-2">
          {([['iflytek', '讯飞实时转写'], ['openai-compatible', 'OpenAI 兼容']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => updateAsr({ provider: value })}
              className={`flex-1 rounded-lg border py-1.5 text-[11.5px] ${config.asr.provider === value ? 'border-[#0f9b8e] font-semibold text-[#0f9b8e]' : 'border-slate-200 text-slate-600'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {config.asr.provider === 'iflytek' ? (
          <>
            <label className={labelClass}>APPID</label>
            <input className={inputClass} value={iflytek.appId} onChange={(e) => updateIflytek({ appId: e.target.value.trim() })} placeholder="例如 cb5e1215" />
            <label className={labelClass}>APIKey</label>
            <input className={inputClass} value={iflytek.apiKey} onChange={(e) => updateIflytek({ apiKey: e.target.value.trim() })} placeholder="32 位" />
            <label className={labelClass}>APISecret</label>
            <input className={inputClass} type="password" value={iflytek.apiSecret} onChange={(e) => updateIflytek({ apiSecret: e.target.value.trim() })} placeholder="32 位" />
            <label className={labelClass}>领域（pd）</label>
            <input className={inputClass} value={iflytek.domain} onChange={(e) => updateIflytek({ domain: e.target.value.trim() })} placeholder="medical" />
            <div className="mt-1 text-[10.5px] text-slate-400">使用「实时语音转写大模型」；建议领域填 medical</div>
          </>
        ) : (
          <>
            <label className={labelClass}>Base URL</label>
            <input className={inputClass} value={config.asr.baseUrl} onChange={(e) => updateAsr({ baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
            <label className={labelClass}>API Key</label>
            <input className={inputClass} type="password" value={config.asr.apiKey} onChange={(e) => updateAsr({ apiKey: e.target.value })} placeholder="sk-..." />
            <label className={labelClass}>模型</label>
            <input className={inputClass} value={config.asr.model} onChange={(e) => updateAsr({ model: e.target.value })} placeholder="whisper-1" />
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-bold text-slate-900">结构化（LLM）</span>
          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isLlmReady(config) ? 'bg-[#0f9b8e]/10 text-[#0f9b8e]' : 'bg-slate-100 text-slate-500'}`}>
            {isLlmReady(config) ? '已配置' : '未配置'}
          </span>
        </div>
        <label className={labelClass}>Base URL</label>
        <input className={inputClass} value={config.llm.baseUrl} onChange={(e) => updateLlm({ baseUrl: e.target.value })} placeholder="https://api.deepseek.com/v1" />
        <label className={labelClass}>API Key</label>
        <input className={inputClass} type="password" value={config.llm.apiKey} onChange={(e) => updateLlm({ apiKey: e.target.value })} placeholder="sk-..." />
        <label className={labelClass}>模型</label>
        <input className={inputClass} value={config.llm.model} onChange={(e) => updateLlm({ model: e.target.value })} placeholder="deepseek-chat" />
        <button onClick={handleTestLlm} disabled={testing} className="mt-2 h-9 w-full rounded-lg border border-[#0f9b8e] text-[11.5px] font-semibold text-[#0f9b8e] disabled:opacity-60">
          {testing ? '测试中…' : '测试结构化连通性'}
        </button>
      </section>

      {message ? <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11.5px] text-slate-700">{message}</div> : null}

      <div className="mt-auto space-y-2 pt-2">
        <button onClick={handleSave} className="h-12 w-full rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white">保存配置</button>
        <button onClick={handleClear} className="h-10 w-full rounded-xl border border-slate-200 text-[12.5px] font-semibold text-slate-600">清除本机配置</button>
        <button onClick={onBack} className="h-10 w-full rounded-xl border border-slate-200 text-[12.5px] font-semibold text-slate-600">返回</button>
      </div>
    </div>
  );
};
