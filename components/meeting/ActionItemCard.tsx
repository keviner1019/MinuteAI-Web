'use client';

import React, { useState } from 'react';
import { ActionItem } from '@/types';
import { Trash2, Edit2, Calendar, Check, X } from 'lucide-react';
import { formatDeadline, isOverdue } from '@/utils/timeFormatter';
import Button from '@/components/ui/Button';

interface ActionItemCardProps {
  item: ActionItem;
  onToggleComplete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<ActionItem>) => void;
  onDelete: (id: string) => void;
}

const priorityConfig = {
  high: {
    label: 'High',
    color: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  medium: {
    label: 'Medium',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    dot: 'bg-yellow-500',
  },
  low: {
    label: 'Low',
    color: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-500',
  },
};

export default function ActionItemCard({
  item,
  onToggleComplete,
  onUpdate,
  onDelete,
}: ActionItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [editPriority, setEditPriority] = useState(item.priority || 'medium'); // Default to medium if missing
  const [editDeadline, setEditDeadline] = useState(item.deadline || '');

  // Safely access priority with fallback to 'medium'
  const priority = item.priority || 'medium';
  const config = priorityConfig[priority];
  const overdue = item.deadline && !item.completed && isOverdue(item.deadline);

  const handleSave = () => {
    if (!editText.trim()) return;

    onUpdate(item.id, {
      text: editText.trim(),
      priority: editPriority,
      deadline: editDeadline || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.text);
    setEditPriority(item.priority);
    setEditDeadline(item.deadline || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this action item?')) {
      onDelete(item.id);
    }
  };

  return (
    <div
      className={`
        group p-4 rounded-lg border transition-all
        ${item.completed ? 'bg-gray-50 opacity-75' : 'bg-white'}
        ${overdue ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}
        hover:shadow-sm
      `}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggleComplete(item.id)}
          className={`
            mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${
              item.completed
                ? 'bg-blue-600 border-blue-600'
                : 'border-gray-300 hover:border-blue-500'
            }
          `}
        >
          {item.completed && <Check className="h-3 w-3 text-white" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-3">
              {/* Text Input */}
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Enter action item text..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                autoFocus
              />

              {/* Priority and Deadline */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as 'high' | 'medium' | 'low')}
                  title="Select priority"
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>

                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  title="Set deadline"
                  placeholder="Set deadline"
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-3 w-3" />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="h-3 w-3" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              {/* Text */}
              <p
                className={`text-sm text-gray-900 mb-2 ${
                  item.completed ? 'line-through text-gray-500' : ''
                }`}
              >
                {item.text}
              </p>

              {/* Meta Info */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Priority Badge */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                  {config.label}
                </span>

                {/* Deadline */}
                {item.deadline && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs ${
                      overdue ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    {formatDeadline(item.deadline)}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title="Edit"
            >
              <Edit2 className="h-4 w-4 text-gray-600" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 hover:bg-red-50 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="h-4 w-4 text-red-600" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
