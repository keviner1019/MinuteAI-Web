'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Hook for handling URL-based element highlighting
 * Reads 'highlight' param from URL and applies highlight animation to matching element
 */
export function useHighlight() {
  const searchParams = useSearchParams();
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const highlight = searchParams.get('highlight');
    if (highlight) {
      setHighlightedId(highlight);

      // Small delay to ensure element is rendered
      const timeoutId = setTimeout(() => {
        const element = document.getElementById(highlight);
        if (element) {
          // Scroll to element
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Add highlight class
          element.classList.add('highlight-item');

          // Remove highlight after animation completes (3 cycles × 0.8s = 2.4s)
          setTimeout(() => {
            element.classList.remove('highlight-item');
            setHighlightedId(null);
          }, 3000);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [searchParams]);

  // Check if a specific element should be highlighted
  const isHighlighted = useCallback(
    (elementId: string) => {
      return highlightedId === elementId;
    },
    [highlightedId]
  );

  return { highlightedId, isHighlighted };
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
