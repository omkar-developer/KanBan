# Markdown Notes Feature Documentation

This document describes the wiki-style markdown notes system for the Kanban application.

## Overview

The notes system provides a rich markdown editing experience with support for:
1. **Markdown Toolbar Editor** - Easy formatting with visual buttons
2. **Wiki-Style Links** - Reference notes using `[[Note Title]]` syntax
3. **Backlinks** - See which notes reference the current note

## Components

### MarkdownEditor (`src/components/notes/MarkdownEditor.tsx`)

A reusable markdown text editor with formatting toolbar.

#### Props
- `value: string` - The markdown content
- `onChange: (value: string) => void` - Called when content changes
- `onWikiLinkClick?: (noteTitle: string) => void` - Called when user clicks a wiki link
- `placeholder?: string` - Input placeholder text
- `readOnly?: boolean` - Make editor read-only

#### Toolbar Buttons
| Button | Inserts | Wraps Selection |
|--------|---------|-----------------|
| `# ` | Heading | No |
| `**B**` | `****` (bold) | Yes |
| `*I*` | `**` (italic) | Yes |
| `` `c` `` | `` `` (code) | Yes |
| `[Link]()` | Link syntax | No |
| `- [ ]` | Checkbox list | No |
| `- ` | Bullet list | No |

#### Features
- Smart line-based insertion (checks if on new line)
- Selection wrapping for markdown pairs
- Cursor positioning after insertion
- Edit/Preview toggle
- Markdown preview with GFM support
- Wiki link rendering as blue clickable buttons

### BacklinksSection (`src/components/notes/BacklinksSection.tsx`)

Displays incoming references to a note.

#### Props
- `currentNote: Task` - The note being viewed
- `allNotes: Task[]` - All available notes to scan
- `onNoteClick?: (noteId: string) => void` - Called when user clicks a backlink

#### Display
- Shows only if backlinks exist
- Lists notes that reference the current note
- Displays count badge
- Click to navigate to referencing note

## Wiki-Style Links

### Syntax
```markdown
[[Note Title]]
```

### Examples
```markdown
This is a reference to [[React]] in my notes.

See also [[State Management]] for related concepts.

Learn more in [[Hooks Best Practices]].
```

### Behavior

1. **Writing**: Type `[[Note Title]]` in your note
2. **Preview**: Links appear as blue, underlined `[[Note Title]]` buttons
3. **Clicking**: Navigate to the referenced note if it exists
4. **Non-existent**: If no note with that title exists, it's just plain text

### Case Sensitivity
- Link matching is **case-insensitive**
- `[[React]]` and `[[react]]` both link to a note titled "React"

## Utilities (`src/utils/wikiLinks.ts`)

Utility functions for wiki-link processing:

### `extractWikiLinks(text: string): string[]`
Extracts all unique wiki-link references from text.
```typescript
const links = extractWikiLinks("See [[React]] and [[React]]");
// returns: ["React"]
```

### `isNoteReferenced(text: string, noteTitle: string): boolean`
Checks if a note is referenced in the given text.
```typescript
const hasRef = isNoteReferenced("This uses [[React]]", "React");
// returns: true
```

### `findBacklinks(noteTitle: string, allNotes: Array): object[]`
Finds all notes that reference the given note.
```typescript
const backlinks = findBacklinks("React", allNotes);
// returns: [{ id: "note2", title: "State Management" }, ...]
```

## Integration in NotesView

The `NotesView` component integrates all three features:

1. **Explorer Tree** (left panel)
   - Lists all notes grouped by category
   - Click to select a note

2. **Note Header** (sticky top)
   - Shows note title and category
   - Save and Delete buttons

3. **MarkdownEditor** (main content)
   - Edit note content
   - Toolbar buttons for formatting
   - Wiki-link click handler navigates to linked note

4. **BacklinksSection** (below editor)
   - Shows incoming references
   - Click to navigate to referencing note

## Example Workflow

### Step 1: Create Notes
- Create note: "React Fundamentals"
- Create note: "Hooks"
- Create note: "State Management"

### Step 2: Add Wiki Links
In "React Fundamentals" note, write:
```markdown
# React Fundamentals

React is a JavaScript library for building user interfaces.

Learn about:
- [[Hooks]]
- [[State Management]]
```

### Step 3: View Backlinks
When viewing "Hooks" note, the Backlinks section shows:
```
Backlinks (1)
← React Fundamentals
```

Click it to jump back to the "React Fundamentals" note.

## Styling

All components use the existing Dark theme from the application:
- CSS Variables: `--text-primary`, `--text-secondary`, `--text-muted`, `--bg-input`
- Tailwind Classes: Dark backgrounds, light text, blue accents
- Markdown Preview: Uses prose classes with dark inversion

## Performance Notes

- **Backlinks**: Computed on every render of the note
- **Wiki-links**: Regex scanning on demand
- **Large note sets**: Consider memoization if > 1000 notes

For large deployments, consider:
1. Memoizing `findBacklinks` results
2. Debouncing wiki-link extraction
3. Indexing note titles for faster lookup
