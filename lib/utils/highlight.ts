import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export type HighlightType = 'todo' | 'friend' | 'note' | 'meeting' | 'calendar';

/**
 * Highlight an element by ID with a blinking animation
 * @param elementId - The ID of the element to highlight
 * @param highlightClass - Optional custom highlight class (defaults to 'highlight-item')
 */
export function highlightElement(elementId: string, highlightClass?: string) {
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
    }, 3000);
  }
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
