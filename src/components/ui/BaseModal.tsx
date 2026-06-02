/**
 * BaseModal — shared modal shell eliminating isOpen/backdrop/shell duplication.
 *
 * 5 modal components currently repeat the same 20-line structure.
 * Usage:
 *   <BaseModal isOpen={show} onClose={close} title="标题">
 *     <YourContent />
 *   </BaseModal>
 */

import React from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const BaseModal: React.FC<Props> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="dialog-backdrop" onClick={onClose} />
      <div className="dialog-shell">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          {title ? <h3 className="text-sm font-bold text-slate-800">{title}</h3> : <span />}
          <button onClick={onClose} className="btn-icon" title="关闭">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </>
  );
};
