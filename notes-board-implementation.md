# Notes Board Implementation

## Overview
This implementation adds support for "Notes" boards, which are distinct from traditional Kanban boards. When a board's `type` is set to `"notes"`, users get a split-view interface for creating and managing notes organized by categories.

## Changes Made

### 1. New Component: `NotesView.tsx`
**Location:** `src/components/board/NotesView.tsx`

A split-view component with two panels:

#### Left Panel - Notes List
- Displays all notes grouped by category using the existing `ExplorerTree` component
- Each group shows a collapsible header with an "+" button to create new notes in that category
- Clicking a note selects it and opens the editor
- Shows a prompt when no notes exist

#### Right Panel - Note Editor
- Uses the existing `TaskEditor` component for editing notes
- Displays title, description (with markdown support), tags, priority, attachments
- Supports create, edit, and delete operations

### 2. Updated: `BoardView.tsx`
**Location:** `src/components/board/BoardView.tsx`

- Added conditional rendering based on board type
- When `board.type === "notes"`, renders `NotesView` instead of the traditional Kanban board
- Note boards bypass view mode switching (always show NotesView)

### 3. Updated: `kanbanStore.ts`
**Location:** `src/state/kanbanStore.ts`

- Changed state structure to store full `Board` object instead of just the board ID
- Added `activeBoardId` field to track both the ID and the full board metadata
- Modified `loadBoard()` to also load the board's metadata from the boards list

### 4. Updated: `BoardPage.tsx`
**Location:** `src/pages/BoardPage.tsx`

- Loads all boards first to ensure board metadata is available
- Then loads the specific board content (columns and tasks)

### 5. Enhanced: `TaskEditor.tsx`
**Location:** `src/components/task/TaskEditor.tsx`

- Added category state for notes (`noteCategory`)
- Modified `getValues()` to include category in task data when type is "note"
- Updated `isDirty()` to track category changes
- Added UI selector for category (only visible when task type is "note")
  - Allows creating custom category names
  - Defaults to "Uncategorized"

## Data Structure

Notes are stored as tasks with specific properties:

```typescript
{
  id: string,
  columnId: string,
  title: string,           // Note title
  description?: string,    // Note content (supports Markdown)
  order: number,
  type: "note",            // Special task type for notes
  data: {
    category: string       // Category for grouping in NotesView
  },
  tags?: string[],         // Optional tags
  priority?: TaskPriority, // Optional priority
  attachments?: string[]   // Optional attachments
}
```

## User Flow

1. **Creating a Notes Board**
   - In the sidebar, click "+" to create a new board
   - Select "Notes" as the board type

2. **Creating Notes**
   - Click the "+" button next to any category group header
   - Enter a title for the note
   - The note opens immediately in the editor

3. **Editing Notes**
   - Click on any note in the left panel to open it
   - Edit title, description (markdown supported), tags, priority, and attachments
   - Category can be changed via the category input field (only visible for notes)

4. **Grouping by Category**
   - Notes are automatically grouped by their `data.category` field
   - Categories can be named freely (e.g., "Personal", "Work", "Ideas")
   - Notes without a category appear under "Uncategorized"

## Features Implemented

✅ Split-view layout with notes list and editor
✅ ExplorerTree for grouping notes by category
✅ Create notes in specific categories
✅ Edit note properties (title, description, tags, priority, attachments)
✅ Delete notes
✅ Category management via TaskEditor
✅ Markdown support in descriptions
✅ No wiki links (as requested - to be implemented later)

## Features Not Implemented (As Requested)

❌ Wiki links between notes
- This feature was explicitly deferred per the requirements

## Technical Notes

- **Storage:** Notes are stored using the same IndexedDB structure as tasks
- **Persistence:** All changes are persisted immediately via zustand middleware
- **Type Safety:** Full TypeScript support with proper type guards for "note" tasks
- **Reusability:** Leverages existing components (`TaskEditor`, `ExplorerTree`) for consistency

## Testing

To test the Notes board:

1. Create a new Notes board via the sidebar
2. Click on a category "+" button to create a note
3. The editor opens automatically with the note title and category fields
4. Add description, tags, priority, and attachments as needed
5. Switch between categories in the left panel to view different notes

The TypeScript compiler confirms no type errors:
```bash
npx tsc --noEmit  # Exit code: 0 (success)
```

## Future Enhancements

While not required for this implementation, potential future enhancements could include:
- Wiki link syntax (`[[Note Title]]`) with auto-completion
- Note-to-note linking and navigation
- Search within notes across categories
- Export/import notes as Markdown files
- Collaboration features (shared editing)