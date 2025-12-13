'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Link, Copy, Check } from 'lucide-react';
import Button from './Button';

interface MeetingLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingUrl?: string;
  meetingCode?: string;
  roomId?: string;
}

export default function MeetingLinkModal({
  isOpen,
  onClose,
  meetingUrl,
  meetingCode,
  roomId,
}: MeetingLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleJoinMeeting = () => {
    if (roomId) {
      router.push(`/meeting/${roomId}`);
    } else if (meetingUrl) {
      // Extract roomId from URL
      const urlParts = meetingUrl.split('/meeting/');
      if (urlParts.length > 1) {
        router.push(`/meeting/${urlParts[1]}`);
      }
    }
    onClose();
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in zoom-in slide-in-from-bottom-4 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-all hover:rotate-90 duration-300 group"
        >
          <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Link className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Meeting Link
              </h3>
              <p className="text-sm text-gray-600">
                Share this link with others to join
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Meeting URL */}
          {meetingUrl && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Meeting URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={meetingUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => handleCopy(meetingUrl)}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Meeting Code */}
          {meetingCode && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Meeting Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={meetingCode}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-xl text-2xl font-bold text-center text-purple-900 tracking-wider focus:ring-2 focus:ring-purple-500"
                  onClick={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={() => handleCopy(meetingCode)}
                  className="px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                  <Copy className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Others can use this code to join from the &quot;Join Meeting&quot; page
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">💡 Tip:</span> The meeting link is unique and can be shared via email, chat, or calendar invite.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Share Later
          </Button>
          <Button
            variant="primary"
            onClick={handleJoinMeeting}
            className="flex-1"
          >
            Join Meeting
          </Button>
        </div>
      </div>
    </div>
  );
}

