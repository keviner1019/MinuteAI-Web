'use client';

import { useState } from 'react';
import { Copy, Check, Link as LinkIcon, Hash, X } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  meetingCode: string | null;
}

export function InviteModal({ isOpen, onClose, roomId, meetingCode }: InviteModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const meetingLink = `${
    typeof window !== 'undefined' ? window.location.origin : ''
  }/meeting/${roomId}`;
  const joinPageUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join`;

  const copyLink = () => {
    navigator.clipboard.writeText(meetingLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = () => {
    if (meetingCode) {
      navigator.clipboard.writeText(meetingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Invite Participants</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Meeting Code */}
            {meetingCode && (
              <div>
                <label className="text-sm text-gray-600 mb-2 block flex items-center gap-2 font-medium">
                  <Hash size={16} />
                  Meeting Code
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg px-4 py-3">
                    <div className="text-center text-gray-900 font-mono text-2xl tracking-widest font-bold">
                      {meetingCode}
                    </div>
                  </div>
                  <button
                    onClick={copyCode}
                    className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white shadow-lg hover:shadow-xl"
                    title="Copy code"
                  >
                    {copiedCode ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Share this code with participants to join at{' '}
                  <span className="font-mono font-medium">{joinPageUrl}</span>
                </p>
              </div>
            )}

            {/* Divider */}
            {meetingCode && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or share link</span>
                </div>
              </div>
            )}

            {/* Meeting Link */}
            <div>
              <label className="text-sm text-gray-600 mb-2 block flex items-center gap-2 font-medium">
                <LinkIcon size={16} />
                Direct Meeting Link
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 overflow-hidden">
                  <div className="text-sm text-gray-900 truncate font-mono">{meetingLink}</div>
                </div>
                <button
                  onClick={copyLink}
                  className="p-3 rounded-lg bg-gray-700 hover:bg-gray-800 transition text-white shadow-lg hover:shadow-xl"
                  title="Copy link"
                >
                  {copiedLink ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Anyone with this link can join the meeting directly
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">How to invite:</h3>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Copy the meeting code or link above</li>
                <li>Send it to your participants via email, chat, etc.</li>
                <li>
                  They can join using the code at{' '}
                  <span className="font-mono font-medium">/join</span> or click the direct link
                </li>
              </ol>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
