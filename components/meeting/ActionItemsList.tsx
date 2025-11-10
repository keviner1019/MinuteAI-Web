'use client';

import React, { useState } from 'react';
import { ActionItem } from '@/types';
import { useActionItems } from '@/hooks/useActionItems';
import ActionItemCard from './ActionItemCard';
import Button from '@/components/ui/Button';
import { Plus, ListTodo, Filter, Loader2 } from 'lucide-react';

interface ActionItemsListProps {
  initialItems: ActionItem[];
  noteId: string;
  onUpdate: (items: ActionItem[]) => Promise<void>;
}

export default function ActionItemsList({ initialItems, noteId, onUpdate }: ActionItemsListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemPriority, setNewItemPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newItemDeadline, setNewItemDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    items,
    addItem,
    updateItem,
    deleteItem,
    toggleComplete,
    filteredItems,
    setFilter,
    filter,
    stats,
  } = useActionItems({
    initialItems,
    noteId,
    onUpdate,
  });

  const handleAddItem = async () => {
    if (!newItemText.trim()) return;

    setLoading(true);
    try {
      await addItem(newItemText.trim(), newItemPriority, newItemDeadline || undefined);
      setNewItemText('');
      setNewItemPriority('medium');
      setNewItemDeadline('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add action item:', error);
      alert('Failed to add action item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (id: string, updates: Partial<ActionItem>) => {
    setLoading(true);
    try {
      await updateItem(id, updates);
    } catch (error) {
      console.error('Failed to update action item:', error);
      alert('Failed to update action item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setLoading(true);
    try {
      await deleteItem(id);
    } catch (error) {
      console.error('Failed to delete action item:', error);
      alert('Failed to delete action item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (id: string) => {
    setLoading(true);
    try {
      await toggleComplete(id);
    } catch (error) {
      console.error('Failed to toggle action item:', error);
      alert('Failed to update action item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-blue-600" />
              Action Items
              <span className="text-sm font-normal text-gray-500">
                ({stats.completed}/{stats.total})
              </span>
            </h3>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === 'pending'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === 'completed'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Done
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progress</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${progressPercentage}%` } as React.CSSProperties}
              />
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <p className="text-2xl font-bold text-red-600">{stats.highPriority}</p>
            <p className="text-xs text-gray-600">High Priority</p>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded">
            <p className="text-2xl font-bold text-orange-600">{stats.overdue}</p>
            <p className="text-xs text-gray-600">Overdue</p>
          </div>
        </div>
      </div>

      {/* Add New Item Form */}
      {isAdding && (
        <div className="bg-white border border-blue-300 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Add New Action Item</h4>
          <div className="space-y-3">
            <textarea
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              autoFocus
            />

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={newItemPriority}
                onChange={(e) => setNewItemPriority(e.target.value as 'high' | 'medium' | 'low')}
                title="Select priority"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              <input
                type="date"
                value={newItemDeadline}
                onChange={(e) => setNewItemDeadline(e.target.value)}
                title="Set deadline"
                placeholder="Set deadline"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleAddItem} disabled={!newItemText.trim() || loading} size="sm">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Item
              </Button>
              <Button variant="ghost" onClick={() => setIsAdding(false)} size="sm">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Button */}
      {!isAdding && (
        <Button
          variant="secondary"
          onClick={() => setIsAdding(true)}
          className="w-full border-2 border-dashed"
        >
          <Plus className="h-4 w-4" />
          Add Action Item
        </Button>
      )}

      {/* Action Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            {filter === 'pending' && 'No pending action items'}
            {filter === 'completed' && 'No completed action items'}
            {filter === 'all' && 'No action items yet. Add one to get started!'}
          </div>
        ) : (
          filteredItems.map((item) => (
            <ActionItemCard
              key={item.id}
              item={item}
              onToggleComplete={handleToggleComplete}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
            />
          ))
        )}
      </div>
    </div>
  );
}
