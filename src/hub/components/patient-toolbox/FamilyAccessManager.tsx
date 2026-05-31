import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, Check, Clock, Copy, RotateCw, ShieldCheck } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import type { Patient } from '@/types/patient';
import { IntegrationService, type FamilyAccessLink } from '@/services/integrationService';
import { getPatientDisplayName } from '@/lib/patient-utils';
import { cn } from '@/lib/utils';

interface FamilyAccessManagerProps {
  patient: Patient;
}

const getDefaultExpiryValue = () => {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return date.toISOString().slice(0, 16);
};

const toApiDateTime = (value: string) => {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 19);
};

const getStatusLabel = (link: FamilyAccessLink) => {
  if (link.status === 'revoked') return '已撤销';
  if (link.is_expired) return '已过期';
  if (link.status === 'active') return '有效';
  return link.status;
};

export const FamilyAccessManager: React.FC<FamilyAccessManagerProps> = ({ patient }) => {
  const [links, setLinks] = useState<FamilyAccessLink[]>([]);
  const [familyCode, setFamilyCode] = useState('');
  const [expiresAt, setExpiresAt] = useState(getDefaultExpiryValue);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeLink = useMemo(
    () => links.find((link) => link.status === 'active' && !link.is_expired),
    [links]
  );

  const loadLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await IntegrationService.listFamilyAccess(patient.id);
      setLinks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '家庭码状态读取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, [patient.id]);

  const handleRotate = async () => {
    setActionLoading('rotate');
    setError(null);
    setIssuedCode(null);
    try {
      const result = await IntegrationService.rotateFamilyAccess(patient.id, {
        family_code: familyCode.trim() || null,
        expires_at: toApiDateTime(expiresAt),
        linked_to: getPatientDisplayName(patient),
      });
      setIssuedCode(result.family_code);
      setFamilyCode('');
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : '家庭码轮换失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (linkId: number) => {
    setActionLoading(`revoke-${linkId}`);
    setError(null);
    try {
      await IntegrationService.revokeFamilyAccess(linkId);
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : '家庭码撤销失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleExtend = async (linkId: number) => {
    setActionLoading(`extend-${linkId}`);
    setError(null);
    try {
      await IntegrationService.extendFamilyAccess(linkId, toApiDateTime(expiresAt) || '');
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : '家庭码延期失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopy = async () => {
    if (!issuedCode) return;
    await navigator.clipboard.writeText(issuedCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">家庭码安全管理</h3>
              <p className="text-xs text-slate-500">家庭码只明文显示一次；服务端仅保存不可逆哈希。</p>
            </div>
          </div>
          {activeLink ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <Check size={13} />
              当前存在有效家庭码
            </div>
          ) : (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              <AlertTriangle size={13} />
              当前无有效家庭码
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 xl:max-w-[520px]">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input
              value={familyCode}
              onChange={(event) => setFamilyCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="留空自动生成"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold tracking-widest text-slate-900 outline-none transition focus:border-emerald-500"
            />
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500"
            />
            <Button
              variant="primary"
              size="md"
              icon={<RotateCw size={16} />}
              loading={actionLoading === 'rotate'}
              onClick={handleRotate}
            >
              轮换
            </Button>
          </div>

          {issuedCode && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-sm text-emerald-900">
                新家庭码 <span className="font-mono text-base font-bold tracking-[0.18em]">{issuedCode}</span>
              </div>
              <Button variant="secondary" size="sm" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={handleCopy}>
                {copied ? '已复制' : '复制'}
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
          )}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[88px_1fr_1fr_160px] bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
            <span>状态</span>
            <span>绑定对象</span>
            <span>有效期</span>
            <span className="text-right">操作</span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
              <RotateCw className="animate-spin" size={15} />
              正在读取家庭码状态
            </div>
          ) : links.length === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500">暂无家庭码记录</div>
          ) : (
            links.map((link) => {
              const label = getStatusLabel(link);
              const canRevoke = link.status === 'active' && !link.is_expired;
              return (
                <div key={link.id} className="grid grid-cols-[88px_1fr_1fr_160px] items-center border-t border-slate-100 px-3 py-2 text-sm">
                  <span
                    className={cn(
                      'w-fit rounded-full px-2 py-0.5 text-xs font-semibold',
                      label === '有效' && 'bg-emerald-50 text-emerald-700',
                      label === '已过期' && 'bg-amber-50 text-amber-700',
                      label === '已撤销' && 'bg-slate-100 text-slate-500'
                    )}
                  >
                    {label}
                  </span>
                  <span className="truncate text-slate-700">{link.linked_to || getPatientDisplayName(patient)}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={13} />
                    {link.expires_at ? new Date(link.expires_at).toLocaleString() : '长期有效'}
                  </span>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Clock size={14} />}
                      loading={actionLoading === `extend-${link.id}`}
                      disabled={link.status === 'revoked'}
                      onClick={() => handleExtend(link.id)}
                    >
                      延期
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Ban size={14} />}
                      loading={actionLoading === `revoke-${link.id}`}
                      disabled={!canRevoke}
                      onClick={() => handleRevoke(link.id)}
                    >
                      撤销
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
};
