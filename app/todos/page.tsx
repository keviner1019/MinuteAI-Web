'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Button from '@/components/ui/Button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  ArrowLeft,
  Loader2,
  ListTodo,
  Filter,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
} from 'lucide-react';
import { ActionItem } from '@/types';
import { formatDeadline, isOverdue } from '@/utils/timeFormatter';

interface ActionItemWithNote extends ActionItem {
  noteId: string;
  noteTitle: string;
  noteCreatedAt: Date;
}

export default function TodosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [todos, setTodos] = useState<ActionItemWithNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low' | ''>('');
  const [editDeadline, setEditDeadline] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ noteId: string; todoId: string } | null>(null);

  // Filters and sort
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'created' | 'note'>('priority');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      loadTodos();
    }
  }, [user]);

  const loadTodos = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { getAllActionItems } = await import('@/lib/supabase/database');
      const actionItems = await getAllActionItems(user.id);
      setTodos(actionItems || []);
      // Expand all notes by default
      const noteIds = new Set(actionItems.map(item => item.noteId));
      setExpandedNotes(noteIds);
    } catch (err: any) {
      console.error('Error loading todos:', err);
      setError(err.message || 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (noteId: string, actionItemId: string, completed: boolean) => {
    try {
      const { updateSingleActionItem } = await import('@/lib/supabase/database');
      await updateSingleActionItem(noteId, actionItemId, { completed: !completed });

      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === actionItemId && todo.noteId === noteId
            ? { ...todo, completed: !completed }
            : todo
        )
      );
    } catch (err: any) {
      console.error('Error updating todo:', err);
      alert('Failed to update todo. Please try again.');
    }
  };

  const handleStartEdit = (todo: ActionItemWithNote) => {
    setEditingTodo(todo.id);
    setEditText(todo.text);
    setEditPriority(todo.priority || '');
    setEditDeadline(todo.deadline || '');
  };

  const handleSaveEdit = async (noteId: string, actionItemId: string) => {
    if (!editText.trim()) return;

    try {
      const { updateSingleActionItem } = await import('@/lib/supabase/database');
      await updateSingleActionItem(noteId, actionItemId, {
        text: editText.trim(),
        priority: editPriority || undefined,
        deadline: editDeadline || undefined,
      });

      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === actionItemId && todo.noteId === noteId
            ? { ...todo, text: editText.trim(), priority: editPriority || undefined, deadline: editDeadline || undefined }
            : todo
        )
      );
      setEditingTodo(null);
    } catch (err: any) {
      console.error('Error updating todo:', err);
      alert('Failed to update todo. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingTodo(null);
    setEditText('');
    setEditPriority('');
    setEditDeadline('');
  };

  const handleDeleteTodo = async () => {
    if (!deleteConfirm) return;

    try {
      const { deleteSingleActionItem } = await import('@/lib/supabase/database');
      await deleteSingleActionItem(deleteConfirm.noteId, deleteConfirm.todoId);
      setTodos((prev) => prev.filter((todo) => !(todo.id === deleteConfirm.todoId && todo.noteId === deleteConfirm.noteId)));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error deleting todo:', err);
      alert('Failed to delete todo. Please try again.');
    }
  };

  const toggleNoteExpanded = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  // Filter and sort todos
  const filteredAndSortedTodos = useMemo(() => {
    let filtered = todos.filter((todo) => {
      if (statusFilter === 'pending' && todo.completed) return false;
      if (statusFilter === 'completed' && !todo.completed) return false;
      if (priorityFilter !== 'all' && todo.priority !== priorityFilter) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          todo.text.toLowerCase().includes(query) ||
          todo.noteTitle.toLowerCase().includes(query)
        );
      }

      return true;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return (
            (priorityOrder[a.priority || 'medium'] || 1) -
            (priorityOrder[b.priority || 'medium'] || 1)
          );
        case 'created':
          return (
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        case 'note':
          return a.noteTitle.localeCompare(b.noteTitle);
        default:
          return 0;
      }
    });

    return filtered;
  }, [todos, statusFilter, priorityFilter, sortBy, searchQuery]);

  // Group by note
  const todosByNote = useMemo(() => {
    const groups: { [noteTitle: string]: { noteId: string; todos: ActionItemWithNote[] } } = {};
    
    filteredAndSortedTodos.forEach((todo) => {
      if (!groups[todo.noteTitle]) {
        groups[todo.noteTitle] = { noteId: todo.noteId, todos: [] };
      }
      groups[todo.noteTitle].todos.push(todo);
    });

    return groups;
  }, [filteredAndSortedTodos]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: todos.length,
      completed: todos.filter((t) => t.completed).length,
      pending: todos.filter((t) => !t.completed).length,
      overdue: todos.filter((t) => !t.completed && t.deadline && isOverdue(t.deadline)).length,
      highPriority: todos.filter((t) => !t.completed && t.priority === 'high').length,
      noPriority: todos.filter((t) => !t.priority).length,
    };
  }, [todos]);

  const priorityConfig = {
    high: { label: 'High', color: 'bg-gradient-to-r from-red-500 to-pink-500 text-white', dot: 'bg-red-500', border: 'border-red-500' },
    medium: { label: 'Medium', color: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white', dot: 'bg-yellow-500', border: 'border-yellow-500' },
    low: { label: 'Low', color: 'bg-gradient-to-r from-green-400 to-emerald-400 text-white', dot: 'bg-green-500', border: 'border-green-500' },
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Modern Header */}
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-6 hover:scale-105 transition-transform group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back
            </Button>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl">
                      <Target className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 bg-clip-text text-transparent">
                      My Todos
                    </h1>
                    <p className="text-gray-600 mt-1">Manage all your action items in one place</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg p-5 border border-gray-100 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-100 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-bl-full opacity-50 group-hover:scale-150 transition-transform"></div>
              <div className="relative">
                <ListTodo className="h-6 w-6 text-gray-600 mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-600 font-medium">Total</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-5 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-150 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-bl-full opacity-10 group-hover:scale-150 transition-transform"></div>
              <div className="relative">
                <Clock className="h-6 w-6 text-white mb-2 group-hover:animate-spin" />
                <p className="text-3xl font-bold text-white">{stats.pending}</p>
                <p className="text-xs text-blue-100 font-medium">Pending</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-5 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-200 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-bl-full opacity-10 group-hover:scale-150 transition-transform"></div>
              <div className="relative">
                <CheckCircle2 className="h-6 w-6 text-white mb-2 group-hover:animate-bounce" />
                <p className="text-3xl font-bold text-white">{stats.completed}</p>
                <p className="text-xs text-green-100 font-medium">Done</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg p-5 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-300 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-bl-full opacity-10 group-hover:scale-150 transition-transform"></div>
              <div className="relative">
                <AlertCircle className="h-6 w-6 text-white mb-2 group-hover:animate-pulse" />
                <p className="text-3xl font-bold text-white">{stats.overdue}</p>
                <p className="text-xs text-red-100 font-medium">Overdue</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl shadow-lg p-5 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-[400ms] group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-bl-full opacity-10 group-hover:scale-150 transition-transform"></div>
              <div className="relative">
                <Zap className="h-6 w-6 text-white mb-2 group-hover:animate-bounce" />
                <p className="text-3xl font-bold text-white">{stats.highPriority}</p>
                <p className="text-xs text-orange-100 font-medium">High Priority</p>
              </div>
            </div>

            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-5 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 delay-500 group">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-bl-full opacity-10 group-hover:scale-150 transition-transform"></div>
              <div className="relative">
                <Sparkles className="h-6 w-6 text-white mb-2 group-hover:animate-pulse" />
                <p className="text-3xl font-bold text-white">{stats.noPriority}</p>
                <p className="text-xs text-purple-100 font-medium">No Priority</p>
              </div>
            </div>
          </div>

          {/* Modern Filters */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search todos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-500 font-medium focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all hover:border-purple-300"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Filters Row */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-bold text-gray-900">Filters:</span>
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 transition-all hover:border-purple-300 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="completed">✅ Completed</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as any)}
                  className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 transition-all hover:border-purple-300 cursor-pointer"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">🔴 High Priority</option>
                  <option value="medium">🟡 Medium Priority</option>
                  <option value="low">🟢 Low Priority</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-purple-500 transition-all hover:border-purple-300 cursor-pointer"
                >
                  <option value="priority">Sort by Priority</option>
                  <option value="deadline">Sort by Deadline</option>
                  <option value="created">Sort by Date</option>
                  <option value="note">Sort by Note</option>
                </select>

                <div className="ml-auto text-sm font-bold text-gray-900">
                  Showing {filteredAndSortedTodos.length} of {todos.length}
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Loading your todos...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-2xl text-sm font-medium">
              Error: {error}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && todos.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300 animate-in fade-in zoom-in duration-500">
              <div className="inline-block p-4 bg-gradient-to-br from-purple-100 to-blue-100 rounded-full mb-4">
                <Target className="h-16 w-16 text-purple-600 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No todos yet</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Action items from your notes will appear here. Start creating notes to get organized!
              </p>
              <Button variant="primary" onClick={() => router.push('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          )}

          {/* Todos List - Grouped by Note */}
          {!loading && !error && filteredAndSortedTodos.length > 0 && (
            <div className="space-y-6">
              {Object.entries(todosByNote).map(([noteTitle, { noteId, todos: noteTodos }], groupIndex) => (
                <div 
                  key={noteId}
                  className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${groupIndex * 50}ms` }}
                >
                  {/* Note Header - Collapsible */}
                  <button
                    onClick={() => toggleNoteExpanded(noteId)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-gray-900 text-lg group-hover:text-purple-600 transition-colors">
                          {noteTitle}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium">
                          {noteTodos.length} {noteTodos.length === 1 ? 'todo' : 'todos'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/notes/${noteId}`);
                        }}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-200 transition-all hover:scale-105"
                      >
                        Open Note
                      </button>
                      {expandedNotes.has(noteId) ? (
                        <ChevronUp className="h-5 w-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-600 group-hover:text-purple-600 transition-colors" />
                      )}
                    </div>
                  </button>

                  {/* Todos List */}
                  {expandedNotes.has(noteId) && (
                    <div className="p-6 pt-2 space-y-3">
                      {noteTodos.map((todo, index) => {
                        const config = priorityConfig[todo.priority || 'medium'];
                        const overdue = todo.deadline && !todo.completed && isOverdue(todo.deadline);
                        const isEditing = editingTodo === todo.id;

                        return (
                          <div
                            key={todo.id}
                            className={`
                              relative rounded-xl border-2 p-4 transition-all duration-300
                              ${todo.completed 
                                ? 'bg-gray-50 border-gray-200 opacity-75' 
                                : overdue
                                  ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300 shadow-lg shadow-red-100'
                                  : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-lg'
                              }
                            `}
                            style={{ animationDelay: `${index * 30}ms` }}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox */}
                              <button
                                onClick={() => handleToggleComplete(noteId, todo.id, todo.completed)}
                                className={`
                                  mt-1 flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 hover:scale-110
                                  ${todo.completed
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-500 shadow-lg shadow-green-200'
                                    : 'border-gray-300 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-100'
                                  }
                                `}
                              >
                                {todo.completed && (
                                  <Check className="h-4 w-4 text-white font-bold" />
                                )}
                              </button>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  /* Edit Mode */
                                  <div className="space-y-3">
                                    <textarea
                                      value={editText}
                                      onChange={(e) => setEditText(e.target.value)}
                                      placeholder="Todo text..."
                                      className="w-full px-3 py-2 border-2 border-purple-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-purple-500 resize-none"
                                      rows={2}
                                      autoFocus
                                    />

                                    <div className="flex items-center gap-2 flex-wrap">
                                      <select
                                        value={editPriority}
                                        onChange={(e) => setEditPriority(e.target.value as any)}
                                        className="px-3 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-purple-500"
                                      >
                                        <option value="">No Priority</option>
                                        <option value="high">🔴 High</option>
                                        <option value="medium">🟡 Medium</option>
                                        <option value="low">🟢 Low</option>
                                      </select>

                                      <input
                                        type="date"
                                        value={editDeadline}
                                        onChange={(e) => setEditDeadline(e.target.value)}
                                        className="px-3 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:ring-2 focus:ring-purple-500"
                                      />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Button size="sm" onClick={() => handleSaveEdit(noteId, todo.id)}>
                                        <Check className="h-3 w-3" />
                                        Save
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                                        <X className="h-3 w-3" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  /* View Mode */
                                  <>
                                    <p className={`text-sm font-medium mb-2 ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                      {todo.text}
                                    </p>

                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Priority Badge */}
                                      {todo.priority && (
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${config.color}`}>
                                          <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
                                          {config.label}
                                        </span>
                                      )}

                                      {/* Deadline */}
                                      {todo.deadline && (
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                          overdue 
                                            ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-200' 
                                            : 'bg-gray-100 text-gray-700'
                                        }`}>
                                          <Calendar className="h-3 w-3" />
                                          {formatDeadline(todo.deadline)}
                                        </span>
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Action Buttons */}
                              {!isEditing && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleStartEdit(todo)}
                                    className="p-2 hover:bg-purple-100 rounded-lg transition-all hover:scale-110 group"
                                    title="Edit"
                                  >
                                    <Edit2 className="h-4 w-4 text-purple-600 group-hover:rotate-12 transition-transform" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm({ noteId, todoId: todo.id })}
                                    className="p-2 hover:bg-red-100 rounded-lg transition-all hover:scale-110 group"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-600 group-hover:rotate-12 transition-transform" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No Results State */}
          {!loading && !error && todos.length > 0 && filteredAndSortedTodos.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-300 animate-in fade-in zoom-in duration-500">
              <div className="max-w-md mx-auto px-6">
                <Filter className="h-16 w-16 text-gray-400 mx-auto mb-4 animate-bounce" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No todos match your filters</h2>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search or filter criteria
                </p>
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setPriorityFilter('all');
                    }}
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteTodo}
          title="Delete Todo?"
          message="Are you sure you want to delete this todo? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      </div>
    </ProtectedRoute>
  );
}
