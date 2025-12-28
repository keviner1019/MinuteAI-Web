'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

type HighlightType = 'todo' | 'friend' | 'note' | 'meeting' | 'calendar' | 'default';

/**
 * Get the appropriate highlight class based on element ID prefix
 */
function getHighlightClassFromId(elementId: string): string {
  if (elementId.startsWith('todo-')) return 'todo-highlight';
  if (elementId.startsWith('friend-') || elementId.startsWith('request-')) return 'friend-card-highlight';
  if (elementId.startsWith('note-')) return 'note-highlight';
  if (elementId.startsWith('meeting-')) return 'meeting-highlight';
  if (elementId.startsWith('calendar-')) return 'calendar-highlight';
  return 'highlight-item';
}

/**
 * Highlight a single element by ID
 */
function highlightSingleElement(elementId: string, delay: number = 100): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        // Scroll to element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Get appropriate highlight class based on element ID
        const highlightClass = getHighlightClassFromId(elementId);

        // Add highlight class
        element.classList.add(highlightClass);

        // Remove highlight after animation completes
        setTimeout(() => {
          element.classList.remove(highlightClass);
          resolve();
        }, 3200); // Extended for 4 cycles
      } else {
        resolve();
      }
    }, delay);
  });
}

/**
 * Hook for handling URL-based element highlighting
 * Reads 'highlight' param from URL and applies highlight animation to matching element
 * Also supports:
 * - 'highlight2' for secondary element highlighting
 * - 'calendarDate' for showing a calendar link/indicator
 */
export function useHighlight() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [secondaryHighlightId, setSecondaryHighlightId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);
  const [showCalendarLink, setShowCalendarLink] = useState(false);

  useEffect(() => {
    const highlight = searchParams.get('highlight');
    const highlight2 = searchParams.get('highlight2');
    const calendarDateParam = searchParams.get('calendarDate');

    if (highlight) {
      setHighlightedId(highlight);

      // Handle calendar date for potential navigation
      if (calendarDateParam) {
        setCalendarDate(calendarDateParam);
        setShowCalendarLink(true);
      }

      // Highlight the primary element
      highlightSingleElement(highlight, 100).then(() => {
        setHighlightedId(null);
      });

      // If there's a secondary highlight (e.g., calendar day on calendar page)
      if (highlight2) {
        setSecondaryHighlightId(highlight2);
        // Highlight secondary element after a short delay
        setTimeout(() => {
          highlightSingleElement(highlight2, 0).then(() => {
            setSecondaryHighlightId(null);
          });
        }, 500);
      }
    }
  }, [searchParams]);

  // Check if a specific element should be highlighted
  const isHighlighted = useCallback(
    (elementId: string) => {
      return highlightedId === elementId || secondaryHighlightId === elementId;
    },
    [highlightedId, secondaryHighlightId]
  );

  // Navigate to calendar with the associated date
  const navigateToCalendar = useCallback(() => {
    if (calendarDate) {
      const date = new Date(calendarDate);
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      router.push(`/calendar?year=${year}&month=${month}&day=${day}&highlight=calendar-day-${day}`);
    }
  }, [calendarDate, router]);

  return {
    highlightedId,
    secondaryHighlightId,
    isHighlighted,
    calendarDate,
    showCalendarLink,
    navigateToCalendar
  };
}

/**
 * Hook variant that accepts an element ID directly (not from URL)
 * Useful for programmatic highlighting
 */
export function useElementHighlight(elementId: string | null) {
  useEffect(() => {
    if (!elementId) return;

    const timeoutId = setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight-item');

        setTimeout(() => {
          element.classList.remove('highlight-item');
        }, 3000);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [elementId]);
}
