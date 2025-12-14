'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, UserPlus, UserCheck, Bell, FileText, CheckSquare } from 'lucide-react';

export type ToastType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'friend_request'
  | 'friend_accepted'
  | 'collaborator_added'
  | 'action_item_update';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  avatar?: string | null;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  showFriendRequestToast: (senderName: string, avatar?: string | null) => void;
  showFriendAcceptedToast: (friendName: string, avatar?: string | null) => void;
  showCollaboratorAddedToast: (
    ownerName: string,
    noteTitle: string,
    avatar?: string | null
  ) => void;
  showActionItemUpdateToast: (
    userName: string,
    action: 'completed' | 'updated' | 'deleted',
    itemText: string,
    avatar?: string | null
  ) => void;
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
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
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

  const getIcon = () => {
    switch (toast.type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-indigo-500" />;
      case 'friend_accepted':
        return <UserCheck className="w-5 h-5 text-emerald-500" />;
      case 'collaborator_added':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'action_item_update':
        return <CheckSquare className="w-5 h-5 text-purple-500" />;
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
        return 'border-l-blue-500';
      case 'action_item_update':
        return 'border-l-purple-500';
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 bg-white rounded-xl shadow-lg border border-slate-200
        border-l-4 ${getBorderColor()} min-w-[300px] max-w-[400px]
        transform transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
    >
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
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
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
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={() => onDismiss(toast.id)} />
        </div>
      ))}
    </div>
  );
}

// Toast provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = generateId();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showFriendRequestToast = useCallback(
    (senderName: string, avatar?: string | null) => {
      showToast({
        type: 'friend_request',
        title: senderName,
        message: 'sent you a friend request',
        avatar,
        duration: 6000,
      });
    },
    [showToast]
  );

  const showFriendAcceptedToast = useCallback(
    (friendName: string, avatar?: string | null) => {
      showToast({
        type: 'friend_accepted',
        title: friendName,
        message: 'accepted your friend request',
        avatar,
        duration: 6000,
      });
    },
    [showToast]
  );

  const showCollaboratorAddedToast = useCallback(
    (ownerName: string, noteTitle: string, avatar?: string | null) => {
      showToast({
        type: 'collaborator_added',
        title: ownerName,
        message: `shared "${noteTitle}" with you`,
        avatar,
        duration: 6000,
      });
    },
    [showToast]
  );

  const showActionItemUpdateToast = useCallback(
    (
      userName: string,
      action: 'completed' | 'updated' | 'deleted',
      itemText: string,
      avatar?: string | null
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
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}
