'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { X, UserPlus, UserCheck, Bell, FileText, CheckSquare, Video, Calendar, ArrowRight } from 'lucide-react';
import { highlightElementAfterDelay, HighlightType } from '@/lib/utils/highlight';

export type ToastType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'friend_request'
  | 'friend_accepted'
  | 'collaborator_added'
  | 'action_item_update'
  | 'meeting_invite'
  | 'meeting_started'
  | 'meeting_ended'
  | 'participant_joined'
  | 'participant_left'
  | 'todo_assigned'
  | 'todo_completed'
  | 'note_shared'
  | 'note_updated'
  | 'meeting_reminder'
  | 'deadline_reminder';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  avatar?: string | null;
  action?: ToastAction;
  navigateTo?: string;
  highlightId?: string;
  highlightType?: HighlightType;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  showFriendRequestToast: (senderName: string, avatar?: string | null, friendshipId?: string) => void;
  showFriendAcceptedToast: (friendName: string, avatar?: string | null, friendId?: string) => void;
  showCollaboratorAddedToast: (
    ownerName: string,
    noteTitle: string,
    avatar?: string | null,
    noteId?: string
  ) => void;
  showActionItemUpdateToast: (
    userName: string,
    action: 'completed' | 'updated' | 'deleted',
    itemText: string,
    avatar?: string | null,
    todoId?: string
  ) => void;
  showMeetingInviteToast: (
    inviterName: string,
    meetingTitle: string,
    roomId: string,
    avatar?: string | null
  ) => void;
  showMeetingStartedToast: (meetingTitle: string, roomId: string) => void;
  showMeetingEndedToast: (meetingTitle: string) => void;
  showParticipantJoinedToast: (participantName: string, avatar?: string | null) => void;
  showParticipantLeftToast: (participantName: string) => void;
  showNoteSharedToast: (ownerName: string, noteTitle: string, noteId: string, avatar?: string | null) => void;
  showMeetingReminderToast: (meetingTitle: string, minutesUntil: number, roomId?: string) => void;
  showDeadlineReminderToast: (todoText: string, dueDate: string, todoId?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// Generate unique ID
function generateId() {
  return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Toast item component
function ToastItem({ toast, onDismiss, onAction }: { toast: Toast; onDismiss: () => void; onAction?: () => void }) {
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [toast.duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  };

  const handleAction = () => {
    if (toast.action?.onClick) {
      toast.action.onClick();
    } else if (onAction) {
      onAction();
    }
    handleDismiss();
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-indigo-500" />;
      case 'friend_accepted':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case 'collaborator_added':
      case 'note_shared':
      case 'note_updated':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'action_item_update':
      case 'todo_assigned':
      case 'todo_completed':
        return <CheckSquare className="w-5 h-5 text-purple-500" />;
      case 'meeting_invite':
      case 'meeting_started':
      case 'meeting_ended':
      case 'participant_joined':
      case 'participant_left':
        return <Video className="w-5 h-5 text-purple-500" />;
      case 'meeting_reminder':
      case 'deadline_reminder':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      case 'success':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <Bell className="w-5 h-5 text-amber-500" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'friend_request':
        return 'border-l-indigo-500';
      case 'friend_accepted':
        return 'border-l-emerald-500';
      case 'collaborator_added':
      case 'note_shared':
      case 'note_updated':
        return 'border-l-blue-500';
      case 'action_item_update':
      case 'todo_assigned':
      case 'todo_completed':
        return 'border-l-purple-500';
      case 'meeting_invite':
      case 'meeting_started':
      case 'meeting_ended':
      case 'participant_joined':
      case 'participant_left':
        return 'border-l-purple-500';
      case 'meeting_reminder':
      case 'deadline_reminder':
        return 'border-l-orange-500';
      case 'success':
        return 'border-l-emerald-500';
      case 'warning':
        return 'border-l-amber-500';
      case 'error':
        return 'border-l-red-500';
      default:
        return 'border-l-blue-500';
    }
  };

  const hasAction = toast.action || toast.navigateTo;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const toastContent = (
    <>
      {/* Avatar or Icon */}
      {toast.avatar !== undefined ? (
        toast.avatar ? (
          <img
            src={toast.avatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {getInitials(toast.title)}
          </div>
        )
      ) : (
        <div className="p-2 bg-slate-100 rounded-lg flex-shrink-0">{getIcon()}</div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 text-sm truncate">{toast.title}</p>
        {toast.message && <p className="text-slate-500 text-xs mt-0.5">{toast.message}</p>}
        {/* Action indicator */}
        {hasAction && (
          <span className="inline-flex items-center gap-1 text-sm text-purple-600 font-medium mt-2">
            {toast.action?.label || 'View'}
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </>
  );

  return (
    <div
      className={`
        relative flex items-start gap-3 p-4 bg-white rounded-xl shadow-lg border border-slate-200
        border-l-4 ${getBorderColor()} min-w-[300px] max-w-[400px]
        transform transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        ${hasAction ? 'cursor-pointer hover:bg-slate-50' : ''}
      `}
      onClick={hasAction ? handleAction : undefined}
      role={hasAction ? 'button' : undefined}
      tabIndex={hasAction ? 0 : undefined}
      onKeyDown={hasAction ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleAction(); } : undefined}
    >
      {toastContent}

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="p-1 hover:bg-slate-100 rounded-md transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}

// Toast container component
function ToastContainer({
  toasts,
  onDismiss,
  onNavigate,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onNavigate: (toast: Toast) => void;
}) {
  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem
            toast={toast}
            onDismiss={() => onDismiss(toast.id)}
            onAction={toast.navigateTo ? () => onNavigate(toast) : undefined}
          />
        </div>
      ))}
    </div>
  );
}

// Toast provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle navigation when toast action is clicked
  const handleNavigate = useCallback(
    (toast: Toast) => {
      if (toast.navigateTo) {
        router.push(toast.navigateTo);
        // Highlight element after navigation
        if (toast.highlightId) {
          highlightElementAfterDelay(toast.highlightId, 500, toast.highlightType);
        }
      }
    },
    [router]
  );

  const showFriendRequestToast = useCallback(
    (senderName: string, avatar?: string | null, friendshipId?: string) => {
      showToast({
        type: 'friend_request',
        title: senderName,
        message: 'sent you a friend request',
        avatar,
        duration: 6000,
        navigateTo: '/friends?tab=requests',
        highlightId: friendshipId ? `request-${friendshipId}` : undefined,
        highlightType: 'friend',
      });
    },
    [showToast]
  );

  const showFriendAcceptedToast = useCallback(
    (friendName: string, avatar?: string | null, friendId?: string) => {
      showToast({
        type: 'friend_accepted',
        title: friendName,
        message: 'accepted your friend request',
        avatar,
        duration: 6000,
        navigateTo: '/friends',
        highlightId: friendId ? `friend-${friendId}` : undefined,
        highlightType: 'friend',
      });
    },
    [showToast]
  );

  const showCollaboratorAddedToast = useCallback(
    (ownerName: string, noteTitle: string, avatar?: string | null, noteId?: string) => {
      showToast({
        type: 'collaborator_added',
        title: ownerName,
        message: `shared "${noteTitle}" with you`,
        avatar,
        duration: 6000,
        navigateTo: noteId ? `/notes/${noteId}` : '/dashboard',
        highlightId: noteId ? `note-${noteId}` : undefined,
        highlightType: 'note',
      });
    },
    [showToast]
  );

  const showActionItemUpdateToast = useCallback(
    (
      userName: string,
      action: 'completed' | 'updated' | 'deleted',
      itemText: string,
      avatar?: string | null,
      todoId?: string
    ) => {
      const actionText =
        action === 'completed' ? 'completed' : action === 'deleted' ? 'deleted' : 'updated';
      const truncatedText = itemText.length > 30 ? itemText.substring(0, 30) + '...' : itemText;
      showToast({
        type: 'action_item_update',
        title: userName,
        message: `${actionText} task: "${truncatedText}"`,
        avatar,
        duration: 5000,
        navigateTo: '/todos',
        highlightId: todoId ? `todo-${todoId}` : undefined,
        highlightType: 'todo',
      });
    },
    [showToast]
  );

  const showMeetingInviteToast = useCallback(
    (inviterName: string, meetingTitle: string, roomId: string, avatar?: string | null) => {
      showToast({
        type: 'meeting_invite',
        title: 'Meeting Invitation',
        message: `${inviterName} invited you to "${meetingTitle}"`,
        avatar,
        duration: 8000,
        navigateTo: `/meeting/${roomId}`,
        action: {
          label: 'Join',
          onClick: () => router.push(`/meeting/${roomId}`),
        },
      });
    },
    [showToast, router]
  );

  const showMeetingStartedToast = useCallback(
    (meetingTitle: string, roomId: string) => {
      showToast({
        type: 'meeting_started',
        title: 'Meeting Started',
        message: `"${meetingTitle}" is starting now`,
        duration: 6000,
        navigateTo: `/meeting/${roomId}`,
        action: {
          label: 'Join',
          onClick: () => router.push(`/meeting/${roomId}`),
        },
      });
    },
    [showToast, router]
  );

  const showMeetingEndedToast = useCallback(
    (meetingTitle: string) => {
      showToast({
        type: 'meeting_ended',
        title: 'Meeting Ended',
        message: `"${meetingTitle}" has ended`,
        duration: 5000,
        navigateTo: '/dashboard',
      });
    },
    [showToast]
  );

  const showParticipantJoinedToast = useCallback(
    (participantName: string, avatar?: string | null) => {
      showToast({
        type: 'participant_joined',
        title: participantName,
        message: 'joined the meeting',
        avatar,
        duration: 4000,
      });
    },
    [showToast]
  );

  const showParticipantLeftToast = useCallback(
    (participantName: string) => {
      showToast({
        type: 'participant_left',
        title: participantName,
        message: 'left the meeting',
        duration: 4000,
      });
    },
    [showToast]
  );

  const showNoteSharedToast = useCallback(
    (ownerName: string, noteTitle: string, noteId: string, avatar?: string | null) => {
      showToast({
        type: 'note_shared',
        title: ownerName,
        message: `shared "${noteTitle}" with you`,
        avatar,
        duration: 6000,
        navigateTo: `/notes/${noteId}`,
        highlightId: `note-${noteId}`,
        highlightType: 'note',
      });
    },
    [showToast]
  );

  const showMeetingReminderToast = useCallback(
    (meetingTitle: string, minutesUntil: number, roomId?: string) => {
      showToast({
        type: 'meeting_reminder',
        title: 'Upcoming Meeting',
        message: `"${meetingTitle}" starts in ${minutesUntil} minutes`,
        duration: 8000,
        navigateTo: roomId ? `/meeting/${roomId}` : '/calendar',
        action: roomId
          ? {
              label: 'Join',
              onClick: () => router.push(`/meeting/${roomId}`),
            }
          : undefined,
      });
    },
    [showToast, router]
  );

  const showDeadlineReminderToast = useCallback(
    (todoText: string, dueDate: string, todoId?: string) => {
      const truncatedText = todoText.length > 30 ? todoText.substring(0, 30) + '...' : todoText;
      showToast({
        type: 'deadline_reminder',
        title: 'Deadline Approaching',
        message: `"${truncatedText}" due ${dueDate}`,
        duration: 6000,
        navigateTo: '/todos',
        highlightId: todoId ? `todo-${todoId}` : undefined,
        highlightType: 'todo',
      });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        showFriendRequestToast,
        showFriendAcceptedToast,
        showCollaboratorAddedToast,
        showActionItemUpdateToast,
        showMeetingInviteToast,
        showMeetingStartedToast,
        showMeetingEndedToast,
        showParticipantJoinedToast,
        showParticipantLeftToast,
        showNoteSharedToast,
        showMeetingReminderToast,
        showDeadlineReminderToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} onNavigate={handleNavigate} />
    </ToastContext.Provider>
  );
}
