/**
 * Returns true if the keyboard event target is an editable element
 * (input, textarea, select, or contentEditable).
 * Use as an early-return guard in global keyboard shortcut handlers.
 */
export function isEditableTarget(e: KeyboardEvent): boolean {
  const target = e.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true;
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    return true;
  }
  return false;
}
