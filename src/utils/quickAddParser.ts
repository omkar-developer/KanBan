/**
 * Quick Add Parser - Parses metadata from input strings
 * 
 * Supports:
 * - Priority: !low, !medium, !high, !critical
 * - Tags: #tag1 #tag2
 * - Due dates: @today, @tomorrow, @3d (3 days), @2026-03-15
 */

export interface ParsedQuickAdd {
  title: string;
  priority?: "low" | "medium" | "high" | "critical";
  tags: string[];
  dueDate?: number;
}

// Priority patterns
const PRIORITY_PATTERN = /(!low|!medium|!high|!critical)\b/gi;
// Tag patterns  
const TAG_PATTERN = /#([a-zA-Z0-9_-]+)/g;
// Due date patterns
const TODAY_PATTERN = /@today\b/i;
const TOMORROW_PATTERN = /@tomorrow\b/i;
const DAYS_PATTERN = /@(\d+)d\b/i; // @3d, @7d, etc.
const DATE_PATTERN = /@(\d{4}-\d{2}-\d{2})\b/i; // @2026-03-15

function getNextDays(days: number): number {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.setHours(0, 0, 0, 0);
}

export function parseQuickAdd(input: string): ParsedQuickAdd {
  let title = input;
  const tags: string[] = [];
  let priority: "low" | "medium" | "high" | "critical" | undefined;
  let dueDate: number | undefined;

  // Extract priority
  const priorityMatches = title.match(PRIORITY_PATTERN);
  if (priorityMatches && priorityMatches.length > 0) {
    const priorityStr = priorityMatches[0].replace("!", "").toLowerCase();
    priority = priorityStr as "low" | "medium" | "high" | "critical";
    title = title.replace(PRIORITY_PATTERN, "").trim();
  }

  // Extract tags
  const tagMatches = title.match(TAG_PATTERN);
  if (tagMatches) {
    const extractedTags = tagMatches.map(tag => tag.substring(1));
    for (const tag of extractedTags) {
      tags.push(tag);
      title = title.replace(`#${tag}`, "").trim();
    }
  }

  // Extract due date
  if (TODAY_PATTERN.test(title)) {
    dueDate = getNextDays(0);
    title = title.replace(TODAY_PATTERN, "").trim();
  } else if (TOMORROW_PATTERN.test(title)) {
    dueDate = getNextDays(1);
    title = title.replace(TOMORROW_PATTERN, "").trim();
  } else if (DAYS_PATTERN.test(title)) {
    const match = title.match(DAYS_PATTERN);
    if (match) {
      const days = parseInt(match[1], 10);
      dueDate = getNextDays(days);
      title = title.replace(DAYS_PATTERN, "").trim();
    }
  } else if (DATE_PATTERN.test(title)) {
    const match = title.match(DATE_PATTERN);
    if (match) {
      try {
        const date = new Date(match[1]);
        dueDate = date.setHours(0, 0, 0, 0);
        title = title.replace(DATE_PATTERN, "").trim();
      } catch {
        // Invalid date format, ignore
      }
    }
  }

  // Clean up multiple spaces and trim
  title = title.replace(/\s+/g, " ").trim();

  return {
    title,
    priority,
    tags,
    dueDate,
  };
}

/**
 * Check if input contains any quick-add syntax
 */
export function hasQuickAddSyntax(input: string): boolean {
  const lowerInput = input.toLowerCase();
  
  // Check for priority markers
  if (PRIORITY_PATTERN.test(input)) return true;
  
  // Check for tags
  if (/#[a-zA-Z0-9_-]+/.test(input)) return true;
  
  // Check for due date markers
  if (TODAY_PATTERN.test(lowerInput)) return true;
  if (TOMORROW_PATTERN.test(lowerInput)) return true;
  if (DAYS_PATTERN.test(lowerInput)) return true;
  if (DATE_PATTERN.test(input)) return true;
  
  return false;
}