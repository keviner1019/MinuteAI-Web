import { useState, useCallback } from 'react';
import { ActionItem } from '@/types';

export type ActionItemChangeType = 'added' | 'completed' | 'uncompleted' | 'updated' | 'deleted';

export interface ActionItemChange {
  type: ActionItemChangeType;
  item: ActionItem;
}

interface UseActionItemsProps {
  initialItems: ActionItem[];
  noteId: string;
  onUpdate?: (items: ActionItem[], change?: ActionItemChange) => Promise<void>;
}

interface UseActionItemsReturn {
  items: ActionItem[];
  addItem: (text: string, priority?: 'high' | 'medium' | 'low', deadline?: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<ActionItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  reorderItems: (startIndex: number, endIndex: number) => void;
  filteredItems: ActionItem[];
  setFilter: (filter: 'all' | 'pending' | 'completed') => void;
  filter: 'all' | 'pending' | 'completed';
  stats: {
    total: number;
    completed: number;
    pending: number;
    highPriority: number;
    overdue: number;
  };
}

/**
 * Hook for managing action items with CRUD operations
 */
export function useActionItems({
  initialItems,
  noteId,
  onUpdate,
}: UseActionItemsProps): UseActionItemsReturn {
  const [items, setItems] = useState<ActionItem[]>(initialItems);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Add new action item
  const addItem = useCallback(
    async (text: string, priority?: 'high' | 'medium' | 'low', deadline?: string) => {
      const newItem: ActionItem = {
        id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        text,
        priority, // Only set if explicitly provided
        completed: false,
        deadline,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updatedItems = [...items, newItem];
      setItems(updatedItems);

      if (onUpdate) {
        try {
          await onUpdate(updatedItems, { type: 'added', item: newItem });
        } catch (error) {
          // Rollback on error
          setItems(items);
          throw error;
        }
      }
    },
    [items, onUpdate]
  );

  // Update action item
  const updateItem = useCallback(
    async (id: string, updates: Partial<ActionItem>, changeType: 'completed' | 'uncompleted' | 'updated' = 'updated') => {
      const updatedItem = items.find((item) => item.id === id);
      if (!updatedItem) return;

      const newItem = { ...updatedItem, ...updates, updatedAt: new Date().toISOString() };
      const updatedItems = items.map((item) =>
        item.id === id ? newItem : item
      );

      setItems(updatedItems);

      if (onUpdate) {
        try {
          await onUpdate(updatedItems, { type: changeType, item: newItem });
        } catch (error) {
          // Rollback on error
          setItems(items);
          throw error;
        }
      }
    },
    [items, onUpdate]
  );

  // Delete action item
  const deleteItem = useCallback(
    async (id: string) => {
      const deletedItem = items.find((item) => item.id === id);
      if (!deletedItem) return;

      const updatedItems = items.filter((item) => item.id !== id);
      setItems(updatedItems);

      if (onUpdate) {
        try {
          await onUpdate(updatedItems, { type: 'deleted', item: deletedItem });
        } catch (error) {
          // Rollback on error
          setItems(items);
          throw error;
        }
      }
    },
    [items, onUpdate]
  );

  // Toggle completion status
  const toggleComplete = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      // Use appropriate change type based on current state
      const changeType = item.completed ? 'uncompleted' : 'completed';
      await updateItem(id, { completed: !item.completed }, changeType);
    },
    [items, updateItem]
  );

  // Reorder items (for drag-and-drop in future)
  const reorderItems = useCallback((startIndex: number, endIndex: number) => {
    setItems((prevItems) => {
      const result = Array.from(prevItems);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  // Filter items based on status
  const filteredItems = items.filter((item) => {
    if (filter === 'pending') return !item.completed;
    if (filter === 'completed') return item.completed;
    return true;
  });

  // Calculate statistics
  const stats = {
    total: items.length,
    completed: items.filter((item) => item.completed).length,
    pending: items.filter((item) => !item.completed).length,
    highPriority: items.filter((item) => item.priority === 'high' && !item.completed).length,
    overdue: items.filter(
      (item) => !item.completed && item.deadline && new Date(item.deadline) < new Date()
    ).length,
  };

  return {
    items,
    addItem,
    updateItem,
    deleteItem,
    toggleComplete,
    reorderItems,
    filteredItems,
    setFilter,
    filter,
    stats,
  };
}
