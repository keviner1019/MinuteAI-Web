'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Video,
  Calendar,
  Clock,
  Users,
  Mail,
  Plus,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useFriends } from '@/hooks/useFriends';
import { useFriendsPresence } from '@/hooks/usePresence';
import { Friend, PresenceStatus } from '@/types';
import { createClient } from '@/lib/supabase/client';

async function getAuthHeaders() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMeetingCreated?: (meeting: {
    id: string;
    roomId: string;
    meetingCode: string;
    meetingUrl: string;
  }) => void;
}

interface CreateMeetingInput {
  title: string;
  scheduledAt: Date | null;
  description: string;
  invitedFriendIds: string[];
  invitedEmails: string[];
}

export default function CreateMeetingModal({
  isOpen,
  onClose,
  onMeetingCreated,
}: CreateMeetingModalProps) {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [showFriends, setShowFriends] = useState(true);

  // Loading and error state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Friends data
  const { friends, loading: loadingFriends } = useFriends();
  const { friends: friendsWithPresence } = useFriendsPresence();

  // Merge presence data with friends and sort by online status
  const friendsWithStatus = friends
    .map((friend) => {
      const presence = friendsWithPresence.find((f) => f.friendId === friend.friendId);
      return {
        ...friend,
        status: presence?.status || friend.status,
      };
    })
    .sort((a, b) => {
      // Sort order: online > away > busy > offline
      const statusOrder: Record<PresenceStatus, number> = {
        online: 0,
        away: 1,
        busy: 2,
        offline: 3,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setIsScheduled(false);
      setScheduledDate('');
      setScheduledTime('');
      setDescription('');
      setSelectedFriends([]);
      setInviteEmails([]);
      setEmailInput('');
      setShowFriends(true);
      setError(null);
    }
  }, [isOpen]);

  // Set default date/time when scheduling is enabled
  useEffect(() => {
    if (isScheduled && !scheduledDate) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split('T')[0]);
      setScheduledTime('09:00');
    }
  }, [isScheduled, scheduledDate]);

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (inviteEmails.includes(email)) {
      setError('This email has already been added');
      return;
    }

    setInviteEmails((prev) => [...prev, email]);
    setEmailInput('');
    setError(null);
  };

  const handleRemoveEmail = (email: string) => {
    setInviteEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const validateForm = (): boolean => {
    // Title validation (max 100 chars)
    if (title.length > 100) {
      setError('Meeting name must be 100 characters or less');
      return false;
    }

    // Description validation (max 500 chars)
    if (description.length > 500) {
      setError('Description must be 500 characters or less');
      return false;
    }

    // Scheduled date/time validation
    if (isScheduled) {
      if (!scheduledDate || !scheduledTime) {
        setError('Please select a date and time for the scheduled meeting');
        return false;
      }

      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        setError('Scheduled time must be in the future');
        return false;
      }
    }

    return true;
  };

  const handleCreateMeeting = async () => {
    if (!validateForm()) return;

    setIsCreating(true);
    setError(null);

    try {
      const scheduledAt = isScheduled
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const headers = await getAuthHeaders();
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim() || 'Quick Meeting',
          scheduled_at: scheduledAt,
          description: description.trim() || null,
          max_participants: 10,
          invited_friend_ids: selectedFriends,
          invited_emails: inviteEmails,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create meeting');
      }

      const meetingUrl = `${window.location.origin}/meeting/${data.room_id}`;

      if (onMeetingCreated) {
        onMeetingCreated({
          id: data.id,
          roomId: data.room_id,
          meetingCode: data.meeting_code,
          meetingUrl,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: PresenceStatus) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-orange-500';
      default:
        return 'bg-red-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-in zoom-in slide-in-from-bottom-4 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isCreating}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 transition-all hover:rotate-90 duration-300 group disabled:opacity-50"
        >
          <X className="h-5 w-5 text-gray-500 group-hover:text-gray-700" />
        </button>

        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Create New Meeting
              </h3>
              <p className="text-sm text-gray-600">
                Start now or schedule for later
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Meeting Name Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Meeting Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Weekly Team Sync, Product Review..."
              maxLength={100}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for &quot;Quick Meeting&quot;
            </p>
          </div>

          {/* Schedule Toggle Section */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Schedule for later</p>
                  <p className="text-xs text-gray-600">Set a specific date and time</p>
                </div>
              </div>
              <button
                onClick={() => setIsScheduled(!isScheduled)}
                className={`relative w-12 h-6 rounded-full transition-colors duration-300 flex-shrink-0 ${
                  isScheduled ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
                    isScheduled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Date/Time Pickers */}
            {isScheduled && (
              <div className="mt-4 pt-4 border-t border-orange-200 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 bg-white border-2 border-orange-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-2 border-orange-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add meeting details, agenda, or notes..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {description.length}/500
            </p>
          </div>

          {/* Invite Participants Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                <span className="font-semibold text-gray-900">Invite Participants</span>
                <span className="text-sm text-gray-400">(optional)</span>
              </div>
              {friends.length > 0 && (
                <button
                  onClick={() => setShowFriends(!showFriends)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                >
                  {showFriends ? (
                    <>
                      Hide friends <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show friends <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Friends List */}
            {showFriends && friends.length > 0 && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-4 animate-in slide-in-from-top-2">
                <p className="text-xs text-gray-600 mb-3 font-medium">
                  Click to add friends as invitees:
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {loadingFriends ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                    </div>
                  ) : (
                    friendsWithStatus.map((friend) => (
                      <button
                        key={friend.friendId}
                        onClick={() => handleToggleFriend(friend.friendId)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                          selectedFriends.includes(friend.friendId)
                            ? 'bg-purple-200 border-2 border-purple-400'
                            : 'bg-white hover:bg-purple-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {friend.avatarUrl ? (
                              <img
                                src={friend.avatarUrl}
                                alt={friend.displayName || 'Friend'}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                                {(friend.displayName || friend.email || '?')[0].toUpperCase()}
                              </div>
                            )}
                            <span className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center">
                              {friend.status === 'online' && (
                                <>
                                  <span className="absolute w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75" />
                                  <span className="absolute w-3.5 h-3.5 bg-green-400 rounded-full animate-pulse opacity-50" />
                                </>
                              )}
                              <span
                                className={`relative w-3 h-3 rounded-full border-2 border-white ${getStatusColor(
                                  friend.status
                                )}`}
                              />
                            </span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {friend.displayName || friend.email}
                          </span>
                        </div>
                        {selectedFriends.includes(friend.friendId) && (
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                            <Check className="h-3 w-3" /> Added
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {friends.length === 0 && !loadingFriends && (
              <p className="text-sm text-gray-500 mb-4">
                No friends yet. You can invite people by email below.
              </p>
            )}

            {/* Email Invitation */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleAddEmail}
                className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {/* Added Emails */}
            {inviteEmails.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {inviteEmails.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {email}
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isCreating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateMeeting}
            disabled={isCreating}
            isLoading={isCreating}
            className="flex-1"
          >
            {isScheduled ? (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Meeting
              </>
            ) : (
              <>
                <Video className="h-4 w-4 mr-2" />
                Create Meeting
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
