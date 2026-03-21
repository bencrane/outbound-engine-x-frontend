/**
 * Extract HTML content from an LLM response.
 * Checks for:
 * 1. Fenced code blocks (```html ... ``` or ``` ... ```)
 * 2. Raw <!DOCTYPE html> ... </html> blocks
 * Returns null if no HTML found.
 */
export function extractHtmlFromResponse(text: string): string | null {
  // Try fenced HTML code block first
  const fencedMatch = text.match(/```(?:html)?\s*\n([\s\S]*?)```/);
  if (fencedMatch) {
    const content = fencedMatch[1].trim();
    if (content.includes("<") && content.includes(">")) {
      return content;
    }
  }

  // Try raw DOCTYPE block
  const doctypeMatch = text.match(/(<!DOCTYPE html[\s\S]*?<\/html>)/i);
  if (doctypeMatch) {
    return doctypeMatch[1].trim();
  }

  // Try <html>...</html> without DOCTYPE
  const htmlMatch = text.match(/(<html[\s\S]*?<\/html>)/i);
  if (htmlMatch) {
    return htmlMatch[1].trim();
  }

  return null;
}
