# KanBan Project Context

## Project Overview

A **React + TypeScript + Vite** Kanban board application with support for multiple board types:
- **Kanban boards** - Traditional drag-and-drop task management with columns
- **Notes boards** - Split-view markdown notes editor with wiki-style linking and backlinks
- **Tools boards** - (Extensible architecture for future tool types)

### Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 19.2 with TypeScript |
| **Build Tool** | Vite 7.3 with SWC |
| **Styling** | Tailwind CSS 4.2 |
| **State Management** | Zustand 5.0 |
| **Database** | IndexedDB (via Dexie 4.3) |
| **Routing** | React Router DOM 7.13 |
| **Drag & Drop** | @dnd-kit (core, sortable, utilities) + @hello-pangea/dnd |
| **Markdown** | react-markdown + remark-gfm |
| **Icons** | Lucide React |

## Project Structure

```
E:\TestProjects\KanBan\
├── src/
│   ├── components/          # React components
│   │   ├── board/           # Board views (BoardView, NotesView, ListView, CardGridView, ArchiveView)
│   │   ├── layout/          # Layout components (MainLayout, Sidebar, etc.)
│   │   ├── notes/           # Notes-specific (MarkdownEditor, BacklinksSection)
│   │   ├── task/            # Task components (TaskCard, TaskEditor, etc.)
│   │   └── ui/              # Reusable UI components
│   ├── models/              # TypeScript interfaces (Board, Column, Task, Comment)
│   ├── pages/               # Page components (BoardPage, BoardsPage)
│   ├── router/              # React Router configuration
│   ├── services/            # Business logic services
│   ├── state/               # Zustand stores (kanbanStore.ts)
│   ├── storage/             # IndexedDB persistence layer
│   ├── theme/               # Theme provider and styling
│   └── utils/               # Utility functions (id.ts, wikiLinks.ts)
├── public/                  # Static assets
├── index.html               # Entry HTML with DM Sans font
└── package.json             # Dependencies and scripts
```

## Building and Running

### Development
```bash
npm run dev          # Start Vite dev server
```

### Production
```bash
npm run build        # Build for production (TypeScript + Vite)
npm run preview      # Preview production build
```

### Code Quality
```bash
npm run lint         # Run ESLint
npx tsc --noEmit     # Type check only
```

## Key Architecture Patterns

### State Management (Zustand)
- **Single store**: `useKanbanStore` in `src/state/kanbanStore.ts`
- **Optimistic updates**: Drag-and-drop updates state immediately, persists to DB after
- **Active board tracking**: Stores full `Board` object + `activeBoardId`

### Data Persistence
- **IndexedDB** via Dexie for offline-first storage
- **Cascade deletes**: Deleting boards/columns removes associated tasks and comments
- **Soft deletes**: Archive functionality via `data.archived` flag on tasks

### Board Types
```typescript
type BoardType = "kanban" | "notes" | "tools"
type TaskType = "task" | "note" | "checklist" | "bug" | "feature"
```

### Drag and Drop
- Uses `@dnd-kit` for sortable tasks and columns
- `reorderTasksOptimistic()` updates state; `persistTaskOrder()` writes to DB
- Custom `DragOverlayCard` and `DragOverlayColumn` for drag previews

## Key Features

### Kanban Board
- Multiple columns with reorderable tasks
- Drag-and-drop task movement between columns
- Task editor with markdown description, tags, priority, due dates, attachments
- List/Grid/Archive view modes
- Task archiving and restoration

### Notes Board
- Split-view: Notes list (left) + Editor (right)
- Category-based grouping via `ExplorerTree`
- Markdown editor with toolbar (bold, italic, code, lists, checkboxes)
- Wiki-style links: `[[Note Title]]` syntax with click navigation
- Backlinks section showing incoming references
- Uses same `TaskEditor` component with `type: "note"`

## Development Conventions

### TypeScript
- Strict mode enabled via `tsconfig.app.json`
- Project references: `tsconfig.app.json` (source) + `tsconfig.node.json` (tooling)

### ESLint
- Config in `eslint.config.js`
- Uses: `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`
- Relaxed rule: `@typescript-eslint/no-unused-vars` is off

### Code Style
- React 19 with functional components and hooks
- Zustand for state (no Redux/Context)
- Tailwind CSS for styling (v4 syntax)
- DM Sans font (Google Fonts)
- Dark theme with CSS variables

## Data Models

### Board
```typescript
interface Board {
  id: string;
  name: string;
  type: BoardType;
  category?: string;
  createdAt: number;
  updatedAt?: number;
  description?: string;
  color?: string;
  archived?: boolean;
}
```

### Task
```typescript
interface Task {
  id: string;
  columnId: string;
  title: string;
  description?: string;
  order: number;
  createdAt: number;
  updatedAt?: number;
  type?: TaskType;
  data?: Record<string, unknown>;  // Extended fields (category, archived, etc.)
  priority?: TaskPriority;
  tags?: string[];
  dueDate?: number;
  attachments?: string[];
}
```

## Utility Functions

| File | Purpose |
|------|---------|
| `src/utils/id.ts` | `createId()` - Generate unique IDs |
| `src/utils/wikiLinks.ts` | Wiki-link extraction, backlink finding |

## Documentation Files

- `notes-board-implementation.md` - Notes board feature implementation details
- `notes-feature-documentation.md` - Markdown editor and wiki-links documentation
