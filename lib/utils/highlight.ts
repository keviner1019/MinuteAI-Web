import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export type HighlightType = 'todo' | 'friend' | 'note' | 'meeting' | 'calendar' | 'todo-added' | 'todo-deadline';

/**
 * Highlight an element by ID with a blinking animation
 * @param elementId - The ID of the element to highlight
 * @param highlightClass - Optional custom highlight class (defaults to 'highlight-item')
 * @returns true if element was found and highlighted, false otherwise
 */
export function highlightElement(elementId: string, highlightClass?: string): boolean {
  const element = document.getElementById(elementId);
  if (element) {
    // Scroll to element
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Determine which highlight class to use
    const className = highlightClass || 'highlight-item';

    // Add highlight class
    element.classList.add(className);

    // Remove highlight after animation completes
    setTimeout(() => {
      element.classList.remove(className);
    }, 3200);

    return true;
  }
  return false;
}

/**
 * Highlight an element with retry - keeps trying until element is found or timeout
 * @param elementId - The ID of the element to highlight
 * @param type - The type of element for styling
 * @param maxAttempts - Maximum number of retry attempts (default 20 = 2 seconds)
 * @param intervalMs - Interval between retries in ms (default 100)
 * @returns Promise that resolves to true if element was found, false if timed out
 */
export function highlightElementWithRetry(
  elementId: string,
  type?: HighlightType,
  maxAttempts: number = 20,
  intervalMs: number = 100
): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;

    const tryHighlight = () => {
      attempts++;
      const highlightClass = type ? getHighlightClass(type) : undefined;

      if (highlightElement(elementId, highlightClass)) {
        resolve(true);
        return;
      }

      if (attempts < maxAttempts) {
        setTimeout(tryHighlight, intervalMs);
      } else {
        console.warn(`[highlight] Element ${elementId} not found after ${maxAttempts} attempts`);
        resolve(false);
      }
    };

    tryHighlight();
  });
}

/**
 * Navigate to a path and highlight a specific element
 * @param router - Next.js app router instance
 * @param path - The path to navigate to
 * @param elementId - The element ID to highlight after navigation
 */
export function navigateWithHighlight(
  router: AppRouterInstance,
  path: string,
  elementId: string
) {
  router.push(`${path}?highlight=${elementId}`);
}

/**
 * Get the appropriate highlight class based on element type
 * @param type - The type of element being highlighted
 */
export function getHighlightClass(type: HighlightType): string {
  switch (type) {
    case 'todo':
      return 'todo-highlight';
    case 'todo-added':
      return 'todo-added-highlight';
    case 'todo-deadline':
      return 'todo-deadline-highlight';
    case 'friend':
      return 'friend-card-highlight';
    case 'note':
      return 'note-highlight';
    case 'meeting':
      return 'meeting-highlight';
    case 'calendar':
      return 'calendar-highlight';
    default:
      return 'highlight-item';
  }
}

/**
 * Highlight an element after a delay (useful after navigation)
 * @param elementId - The ID of the element to highlight
 * @param delay - Delay in ms before highlighting (default 500ms)
 * @param type - Optional element type for specific highlight styles
 */
export function highlightElementAfterDelay(
  elementId: string,
  delay: number = 500,
  type?: HighlightType
) {
  setTimeout(() => {
    const highlightClass = type ? getHighlightClass(type) : undefined;
    highlightElement(elementId, highlightClass);
  }, delay);
}
