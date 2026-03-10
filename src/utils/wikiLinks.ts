/**
 * Wiki-style link utilities for markdown notes
 * Syntax: [[Note Title]]
 */

// Regex to detect wiki-style links
export const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Extract all wiki-style links from text
 * @param text - The text to search for wiki links
 * @returns Array of note titles that are referenced
 */
export function extractWikiLinks(text: string): string[] {
  const links = new Set<string>();
  let match;
  const regex = new RegExp(WIKI_LINK_REGEX);
  
  while ((match = regex.exec(text)) !== null) {
    links.add(match[1].trim());
  }
  
  return Array.from(links);
}

/**
 * Check if a note title is referenced in the given text
 * @param text - The text to search in
 * @param noteTitle - The note title to search for
 * @returns true if the note is referenced
 */
export function isNoteReferenced(text: string, noteTitle: string): boolean {
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    if (match[1].trim().toLowerCase() === noteTitle.toLowerCase()) {
      return true;
    }
  }
  
  return false;
}

/**
 * Split text into parts by wiki links
 * Returns an array where even indices are text, odd indices are link titles
 * Usage: const parts = splitWikiLinks(text);
 *        // render even parts as text, odd parts as links
 */
export function splitWikiLinks(text: string): string[] {
  return text.split(WIKI_LINK_REGEX);
}

/**
 * Find all notes that reference a given note
 * @param noteTitle - The title of the note to find backlinks for
 * @param allNotes - Array of all notes to search
 * @returns Array of note objects that reference the given note
 */
export function findBacklinks(
  noteTitle: string,
  allNotes: Array<{ id: string; title: string; description?: string }>
): Array<{ id: string; title: string }> {
  return allNotes
    .filter(note => 
      note.title.toLowerCase() !== noteTitle.toLowerCase() &&
      (isNoteReferenced(note.description || "", noteTitle))
    )
    .map(note => ({ id: note.id, title: note.title }));
}
