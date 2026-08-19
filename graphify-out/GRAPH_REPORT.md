# Graph Report - KanBan  (2026-08-19)

## Corpus Check
- 141 files · ~107,698 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 856 nodes · 1584 edges · 88 communities (49 shown, 39 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tauri Backend API
- ESLint Config
- Tauri Window Config
- MCP Server
- Drag and Drop System
- AI API Integration
- Icon References
- Tauri Core Plugins
- DOM References
- Markdown Preview
- Build Config
- Card Grid View
- Notes View
- Sidebar Layout
- Topbar Layout
- Task Editor
- App Core
- Column Component
- Export/Import Utilities
- List View
- Sortable Task Card
- Settings and Theme
- Android Icons
- Board View
- Auto Backup
- Alert Dialog
- MCP Server Config
- SQLite Storage
- File Preview and Comments
- Toast Notifications
- Board Models
- MCP Server Index
- DND Kit Dependencies
- Backlinks
- Windows Square Icons
- Archive View
- Board Templates
- Tauri App Entry
- App Icon Assets
- Markdown Editor
- 128x Icons
- iOS 20pt Icons
- iOS 29pt Icons
- iOS 40pt Icons
- Drag Overlay Column
- TSConfig
- Dexie Dependency
- DND Sortable
- DND Utilities
- DND FormKit
- Hello Pangea DND
- Lucide React Icons
- KaTeX Dependency
- Mermaid Dependency
- React Dependency
- React DOM
- React Markdown
- React Router
- Rehype Raw
- Rehype Sanitize
- Rehype Slug
- Remark Breaks
- Remark Frontmatter
- Remark GFM
- Remark Math
- Shiki Dependency
- TailwindCSS
- TailwindCSS Vite
- Tauri API
- Tauri Dialog Plugin
- Tauri FS Plugin
- Tauri Shell Plugin
- Tauri SQL Plugin
- MD Editor Dependency
- Zustand State
- iOS Large Icons
- iOS 60pt Icons
- iOS 76pt Icons
- HTML Entry
- Package App
- Store Logo

## God Nodes (most connected - your core abstractions)
1. `useKanbanStore` - 38 edges
2. `Task` - 36 edges
3. `permissions` - 27 edges
4. `AppState` - 26 edges
5. `ApiError` - 22 edges
6. `crud_roundtrip()` - 20 edges
7. `Column` - 20 edges
8. `compilerOptions` - 20 edges
9. `Board` - 19 edges
10. `Store` - 19 edges

## Surprising Connections (you probably didn't know these)
- `skills/taskflow/SKILL.md - TaskFlow API Skill` --semantically_similar_to--> `mcp-server/README.md - TaskFlow MCP Documentation`  [INFERRED] [semantically similar]
  skills/taskflow/SKILL.md → mcp-server/README.md
- `TaskFlow API - Localhost HTTP API` --semantically_similar_to--> `kanbanStore - Zustand State Store`  [INFERRED] [semantically similar]
  skills/taskflow/SKILL.md → notes-board-implementation.md
- `Notes Board Type - Distinct Board Type` --semantically_similar_to--> `BoardType - Enum: kanban | notes | tools`  [INFERRED] [semantically similar]
  notes-board-implementation.md → QWEN.md
- `TaskType - Enum: task | note | checklist | bug | feature` --semantically_similar_to--> `Notes Board Type - Distinct Board Type`  [INFERRED] [semantically similar]
  QWEN.md → notes-board-implementation.md
- `TaskFlow API - Localhost HTTP API` --semantically_similar_to--> `TaskFlow MCP Server - AI Integration Layer`  [INFERRED] [semantically similar]
  skills/taskflow/SKILL.md → mcp-server/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Notes Board Architecture** — boardview, notesview, taskeditor, explorertree, kanbanstore, notes_board_type [INFERRED 0.90]
- **Wiki Link System** — extractwikilinks, isnotereferenced, findbacklinks, wiki_link_syntax, markdowneditor, backlinksection, notesview [INFERRED 0.85]
- **TaskFlow AI Integration** — mcp_server, mcp_tools, taskflow_api, skills_taskflow_skill, ai_api_json [INFERRED 0.90]
- **Linux/Freedesktop Icon Assets** — src_tauri_icons_128x128, src_tauri_icons_128x128_2x, src_tauri_icons_32x32, src_tauri_icons_64x64 [EXTRACTED 1.00]
- **Windows App Logo Assets (UWP)** — src_tauri_icons_square_30, src_tauri_icons_square_44, src_tauri_icons_square_71, src_tauri_icons_square_89, src_tauri_icons_square_107, src_tauri_icons_square_142, src_tauri_icons_square_150, src_tauri_icons_square_284, src_tauri_icons_square_310, src_tauri_icons_store_logo [EXTRACTED 1.00]
- **macOS Icon Asset** — src_tauri_icons_icon_icns [EXTRACTED 1.00]
- **Windows ICO Icon Asset** — src_tauri_icons_icon_ico [EXTRACTED 1.00]
- **Android HDPI Icon Set** — src_tauri_icons_android_mipmap_hdpi_ic_launcher, src_tauri_icons_android_mipmap_hdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_hdpi_ic_launcher_round [EXTRACTED 1.00]
- **Android MDPI Icon Set** — src_tauri_icons_android_mipmap_mdpi_ic_launcher, src_tauri_icons_android_mipmap_mdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_mdpi_ic_launcher_round [EXTRACTED 1.00]
- **Android XHDPI Icon Set** — src_tauri_icons_android_mipmap_xhdpi_ic_launcher, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_round [EXTRACTED 1.00]
- **Android XXHDPI Icon Set** — src_tauri_icons_android_mipmap_xxhdpi_ic_launcher, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_round [EXTRACTED 1.00]
- **Android XXXHDPI Icon Set** — src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_round [EXTRACTED 1.00]
- **Android Adaptive Icon Configuration** — src_tauri_icons_android_mipmap_anydpi_v26_ic_launcher_xml, src_tauri_icons_android_values_ic_launcher_background_xml [EXTRACTED 1.00]
- **Android Icon Assets (All Densities)** — src_tauri_icons_android_mipmap_hdpi_ic_launcher, src_tauri_icons_android_mipmap_hdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_hdpi_ic_launcher_round, src_tauri_icons_android_mipmap_mdpi_ic_launcher, src_tauri_icons_android_mipmap_mdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_mdpi_ic_launcher_round, src_tauri_icons_android_mipmap_xhdpi_ic_launcher, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_round, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_round, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_round, src_tauri_icons_android_mipmap_anydpi_v26_ic_launcher_xml, src_tauri_icons_android_values_ic_launcher_background_xml [EXTRACTED 1.00]
- **iOS Notification Center Icons (20pt)** — src_tauri_icons_ios_appicon_20x20_1x, src_tauri_icons_ios_appicon_20x20_2x, src_tauri_icons_ios_appicon_20x20_2x_1, src_tauri_icons_ios_appicon_20x20_3x [EXTRACTED 1.00]
- **iOS Settings Icons (29pt)** — src_tauri_icons_ios_appicon_29x29_1x, src_tauri_icons_ios_appicon_29x29_2x, src_tauri_icons_ios_appicon_29x29_2x_1, src_tauri_icons_ios_appicon_29x29_3x [EXTRACTED 1.00]
- **iOS Spotlight/Search Icons (40pt)** — src_tauri_icons_ios_appicon_40x40_1x, src_tauri_icons_ios_appicon_40x40_2x, src_tauri_icons_ios_appicon_40x40_2x_1, src_tauri_icons_ios_appicon_40x40_3x [EXTRACTED 1.00]
- **iOS iPhone App Icons (60pt)** — src_tauri_icons_ios_appicon_60x60_2x, src_tauri_icons_ios_appicon_60x60_3x [EXTRACTED 1.00]
- **iOS iPad App Icons (76pt, 83.5pt)** — src_tauri_icons_ios_appicon_76x76_1x, src_tauri_icons_ios_appicon_76x76_2x, src_tauri_icons_ios_appicon_83.5x83.5_2x [EXTRACTED 1.00]
- **iOS App Store Icon (1024pt)** — src_tauri_icons_ios_appicon_512_2x [EXTRACTED 1.00]
- **iOS Icon Assets (All Sizes)** — src_tauri_icons_ios_appicon_20x20_1x, src_tauri_icons_ios_appicon_20x20_2x, src_tauri_icons_ios_appicon_20x20_2x_1, src_tauri_icons_ios_appicon_20x20_3x, src_tauri_icons_ios_appicon_29x29_1x, src_tauri_icons_ios_appicon_29x29_2x, src_tauri_icons_ios_appicon_29x29_2x_1, src_tauri_icons_ios_appicon_29x29_3x, src_tauri_icons_ios_appicon_40x40_1x, src_tauri_icons_ios_appicon_40x40_2x, src_tauri_icons_ios_appicon_40x40_2x_1, src_tauri_icons_ios_appicon_40x40_3x, src_tauri_icons_ios_appicon_512_2x, src_tauri_icons_ios_appicon_60x60_2x, src_tauri_icons_ios_appicon_60x60_3x, src_tauri_icons_ios_appicon_76x76_1x, src_tauri_icons_ios_appicon_76x76_2x, src_tauri_icons_ios_appicon_83.5x83.5_2x [EXTRACTED 1.00]
- **Tauri App Icon Assets (Cross-Platform)** — src_tauri_icons_icon, src_tauri_icons_icon_icns, src_tauri_icons_icon_ico, src_tauri_icons_128x128, src_tauri_icons_128x128_2x, src_tauri_icons_32x32, src_tauri_icons_64x64 [EXTRACTED 1.00]
- **Kanban App Icon Assets (All Platforms)** — src_tauri_icons_icon, src_tauri_icons_icon_icns, src_tauri_icons_icon_ico, src_tauri_icons_128x128, src_tauri_icons_128x128_2x, src_tauri_icons_32x32, src_tauri_icons_64x64, src_tauri_icons_square_30, src_tauri_icons_square_44, src_tauri_icons_square_71, src_tauri_icons_square_89, src_tauri_icons_square_107, src_tauri_icons_square_142, src_tauri_icons_square_150, src_tauri_icons_square_284, src_tauri_icons_square_310, src_tauri_icons_store_logo, public_icon [INFERRED 0.95]
- **Kanban App iOS Icon Assets** — src_tauri_icons_ios_appicon_20x20_1x, src_tauri_icons_ios_appicon_20x20_2x, src_tauri_icons_ios_appicon_20x20_2x_1, src_tauri_icons_ios_appicon_20x20_3x, src_tauri_icons_ios_appicon_29x29_1x, src_tauri_icons_ios_appicon_29x29_2x, src_tauri_icons_ios_appicon_29x29_2x_1, src_tauri_icons_ios_appicon_29x29_3x, src_tauri_icons_ios_appicon_40x40_1x, src_tauri_icons_ios_appicon_40x40_2x, src_tauri_icons_ios_appicon_40x40_2x_1, src_tauri_icons_ios_appicon_40x40_3x, src_tauri_icons_ios_appicon_512_2x, src_tauri_icons_ios_appicon_60x60_2x, src_tauri_icons_ios_appicon_60x60_3x, src_tauri_icons_ios_appicon_76x76_1x, src_tauri_icons_ios_appicon_76x76_2x, src_tauri_icons_ios_appicon_83.5x83.5_2x [INFERRED 0.95]
- **Kanban App Android Icon Assets** — src_tauri_icons_android_mipmap_hdpi_ic_launcher, src_tauri_icons_android_mipmap_hdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_hdpi_ic_launcher_round, src_tauri_icons_android_mipmap_mdpi_ic_launcher, src_tauri_icons_android_mipmap_mdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_mdpi_ic_launcher_round, src_tauri_icons_android_mipmap_xhdpi_ic_launcher, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_round, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_round, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_round, src_tauri_icons_android_mipmap_anydpi_v26_ic_launcher_xml, src_tauri_icons_android_values_ic_launcher_background_xml [INFERRED 0.95]
- **Kanban App Windows Icon Assets** — src_tauri_icons_square_30, src_tauri_icons_square_44, src_tauri_icons_square_71, src_tauri_icons_square_89, src_tauri_icons_square_107, src_tauri_icons_square_142, src_tauri_icons_square_150, src_tauri_icons_square_284, src_tauri_icons_square_310, src_tauri_icons_store_logo, src_tauri_icons_icon_ico [INFERRED 0.95]

## Communities (88 total, 39 thin omitted)

### Community 0 - "Tauri Backend API"
Cohesion: 0.11
Nodes (67): AppHandle, Arc, AxumRequest, Connection, Error, F, From, HashMap (+59 more)

### Community 1 - "ESLint Config"
Cohesion: 0.05
Nodes (36): eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, devDependencies, eslint, @eslint/js (+28 more)

### Community 2 - "Tauri Window Config"
Cohesion: 0.06
Nodes (32): core:default, core:window:allow-close, core:window:allow-destroy, dialog:allow-message, dialog:allow-open, dialog:allow-save, dialog:default, fs:allow-app-read-recursive (+24 more)

### Community 3 - "MCP Server"
Cohesion: 0.06
Nodes (30): cors, express, bin, taskflow-mcp, dependencies, cors, express, @modelcontextprotocol/sdk (+22 more)

### Community 4 - "Drag and Drop System"
Cohesion: 0.11
Nodes (13): Props, priorityAccent, Props, Board, Column, Comment, Task, BoardTemplate (+5 more)

### Community 5 - "AI API Integration"
Cohesion: 0.17
Nodes (30): ai-api.json - API Discovery Config, BacklinksSection - Backlink Display Component, Board - Data Model Interface, BoardType - Enum: kanban | notes | tools, BoardView - Board Type Router Component, ExplorerTree - Category Grouping Component, extractWikiLinks - Utility Function, findBacklinks - Utility Function (+22 more)

### Community 6 - "Icon References"
Cohesion: 0.07
Nodes (29): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app, security, windows (+21 more)

### Community 7 - "Tauri Core Plugins"
Cohesion: 0.09
Nodes (13): ApiTab(), BackupsTab(), handleRestoreFromCloud(), CardsTab(), FeaturesTab(), Props, SettingsPanel(), Tab (+5 more)

### Community 8 - "DOM References"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2022, vite/client, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+18 more)

### Community 9 - "Markdown Preview"
Cohesion: 0.10
Nodes (20): BUILTINS, CodeBlock(), FallbackCode(), getShiki(), KW, MarkdownPreview(), MarkdownPreviewProps, openExternal() (+12 more)

### Community 10 - "Build Config"
Cohesion: 0.09
Nodes (22): ES2023, node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module (+14 more)

### Community 11 - "Card Grid View"
Cohesion: 0.15
Nodes (12): getTypeIcon(), MoveToDropdown(), PRIORITY_STYLES, PRIORITY_WEIGHT, SortDir, SortKey, TaskGridCard(), FilterPanel() (+4 more)

### Community 12 - "Notes View"
Cohesion: 0.14
Nodes (13): NotesView(), PREDEFINED_TAGS, wordCount(), CreateNoteDialog(), DropdownMenu(), MenuItem, Props, ThemedMDEditor (+5 more)

### Community 13 - "Sidebar Layout"
Cohesion: 0.13
Nodes (15): COLOR_OPTIONS, ICON_OPTIONS, SidebarProps, ConfirmDialog(), ConfirmDialogProps, COLOR_OPTIONS, EditBoardDialog(), EditBoardDialogProps (+7 more)

### Community 14 - "Topbar Layout"
Cohesion: 0.10
Nodes (3): SearchBar, TopBarProps, VIEW_MODES

### Community 15 - "Task Editor"
Cohesion: 0.13
Nodes (17): CommentSection(), AttachmentMeta, formatBytes(), handleSmartEnter(), parseAttachment(), predefinedTags, priorityOptions, Props (+9 more)

### Community 16 - "App Core"
Cohesion: 0.21
Nodes (10): App(), Action, CommandPalette(), CommandPaletteProps, HelpWindow(), useAutoBackup(), useFileOpenHandler(), useGlobalShortcuts() (+2 more)

### Community 17 - "Column Component"
Cohesion: 0.15
Nodes (15): COLOR_OPTIONS, Column(), defaultIconMap, FilterP, FilterT, getDefaultIcon(), ICON_MAP, ICON_OPTIONS (+7 more)

### Community 18 - "Export/Import Utilities"
Cohesion: 0.21
Nodes (16): TopBar(), createFileINPUT(), downloadBoardJSON(), downloadDatabaseBackup(), exportBoardAsJSON(), exportDatabaseBackup(), exportMdFolderTauri(), fallbackDownload() (+8 more)

### Community 19 - "List View"
Cohesion: 0.12
Nodes (9): DropdownProps, getTypeIcon(), ListView(), MoveToDropdown(), PRIORITY_STYLES, PRIORITY_WEIGHT, SortDir, SortKey (+1 more)

### Community 20 - "Sortable Task Card"
Cohesion: 0.15
Nodes (12): Props, AttachmentMeta, AttachmentThumb(), isImage(), parseAttachment(), parseSubtasks(), priorityMeta, Props (+4 more)

### Community 21 - "Settings and Theme"
Cohesion: 0.24
Nodes (11): AppearanceTab(), Ctx, ThemeCtx, defaultTheme, Theme, themes, ThemePicker(), applyTheme() (+3 more)

### Community 22 - "Android Icons"
Cohesion: 0.20
Nodes (17): src-tauri/icons/android/mipmap-anydpi-v26/ic_launcher.xml - Android Adaptive Icon Config, src-tauri/icons/android/mipmap-hdpi/ic_launcher.png - Android HDPI Icon, src-tauri/icons/android/mipmap-hdpi/ic_launcher_foreground.png - Android HDPI Foreground, src-tauri/icons/android/mipmap-hdpi/ic_launcher_round.png - Android HDPI Round Icon, src-tauri/icons/android/mipmap-mdpi/ic_launcher.png - Android MDPI Icon, src-tauri/icons/android/mipmap-mdpi/ic_launcher_foreground.png - Android MDPI Foreground, src-tauri/icons/android/mipmap-mdpi/ic_launcher_round.png - Android MDPI Round Icon, src-tauri/icons/android/mipmap-xhdpi/ic_launcher.png - Android XHDPI Icon (+9 more)

### Community 23 - "Board View"
Cohesion: 0.21
Nodes (12): BoardView(), Props, CardGridView(), MainLayout(), Props, Sidebar(), createBoard(), BoardPage() (+4 more)

### Community 24 - "Auto Backup"
Cohesion: 0.23
Nodes (9): checkpointAndClose(), copyDbToBackup(), copyDbToCloudBackup(), getBackupSettings(), initWithAutoRestore(), restoreFromBackup(), restoreFromCloudBackup(), register() (+1 more)

### Community 25 - "Alert Dialog"
Cohesion: 0.21
Nodes (7): AlertDialogProps, CategoryEditDialog(), CategoryEditDialogProps, CreateNoteDialogProps, Modal(), ModalProps, TextInputDialogProps

### Community 26 - "MCP Server Config"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule, skipLibCheck (+4 more)

### Community 27 - "SQLite Storage"
Cohesion: 0.17
Nodes (4): getDb(), migrate(), sqliteStore, resolveStore()

### Community 28 - "File Preview and Comments"
Cohesion: 0.29
Nodes (8): Props, extractTitle(), FilePreviewDialog(), getFileName(), parseFrontmatter(), Props, store, createId()

### Community 29 - "Toast Notifications"
Cohesion: 0.23
Nodes (7): ToastCtx, ToastProvider(), TYPE_CONFIG, ToastContext, ToastCtx, ToastItem, ToastType

### Community 30 - "Board Models"
Cohesion: 0.36
Nodes (4): BoardType, db, indexedDbStore, store

### Community 31 - "MCP Server Index"
Cohesion: 0.42
Nodes (9): api, appConfigDirs(), call(), createMcpServer(), getApi(), loadApiInfo(), main(), startHttpServer() (+1 more)

### Community 32 - "DND Kit Dependencies"
Cohesion: 0.22
Nodes (9): @dnd-kit/core, dependencies, @dnd-kit/core, rehype-katex, remark-emoji, remark-footnotes, rehype-katex, remark-emoji (+1 more)

### Community 33 - "Backlinks"
Cohesion: 0.31
Nodes (5): BacklinksSection(), BacklinksSectionProps, findBacklinks(), isNoteReferenced(), WIKI_LINK_REGEX

### Community 34 - "Windows Square Icons"
Cohesion: 0.22
Nodes (9): src-tauri/icons/Square107x107Logo.png - Windows App Logo, src-tauri/icons/Square142x142Logo.png - Windows App Logo, src-tauri/icons/Square150x150Logo.png - Windows App Logo (medium tile), src-tauri/icons/Square284x284Logo.png - Windows App Logo (large tile), src-tauri/icons/Square30x30Logo.png - Windows App Logo, src-tauri/icons/Square310x310Logo.png - Windows App Logo (wide tile), src-tauri/icons/Square44x44Logo.png - Windows App Logo (small tile), src-tauri/icons/Square71x71Logo.png - Windows App Logo (+1 more)

### Community 36 - "Board Templates"
Cohesion: 0.29
Nodes (6): BOARD_TEMPLATES, TemplateColumn, COLOR_OPTIONS, EmptyState(), ICON_OPTIONS, Props

### Community 37 - "Tauri App Entry"
Cohesion: 0.33
Nodes (6): App, read_md_file(), Result, String, run(), setup_window_events()

### Community 38 - "App Icon Assets"
Cohesion: 0.50
Nodes (4): public/icon.png - App Icon (web/general), src-tauri/icons/icon.png - Tauri App Icon, src-tauri/icons/icon.icns - macOS Icon Set, src-tauri/icons/icon.ico - Windows Icon

### Community 40 - "128x Icons"
Cohesion: 0.67
Nodes (4): src-tauri/icons/128x128.png - Linux/Freedesktop Icon, src-tauri/icons/128x128@2x.png - Retina Linux/Freedesktop Icon, src-tauri/icons/32x32.png - Linux/Freedesktop Icon, src-tauri/icons/64x64.png - Linux/Freedesktop Icon

### Community 41 - "iOS 20pt Icons"
Cohesion: 0.50
Nodes (4): src-tauri/icons/iOS/AppIcon-20x20@1x.png - iOS Notification 20pt 1x, src-tauri/icons/iOS/AppIcon-20x20@2x.png - iOS Notification 20pt 2x, src-tauri/icons/iOS/AppIcon-20x20@2x-1.png - iOS Notification 20pt 2x (alternate), src-tauri/icons/iOS/AppIcon-20x20@3x.png - iOS Notification 20pt 3x

### Community 42 - "iOS 29pt Icons"
Cohesion: 0.50
Nodes (4): src-tauri/icons/iOS/AppIcon-29x29@1x.png - iOS Settings 29pt 1x, src-tauri/icons/iOS/AppIcon-29x29@2x.png - iOS Settings 29pt 2x, src-tauri/icons/iOS/AppIcon-29x29@2x-1.png - iOS Settings 29pt 2x (alternate), src-tauri/icons/iOS/AppIcon-29x29@3x.png - iOS Settings 29pt 3x

### Community 43 - "iOS 40pt Icons"
Cohesion: 0.50
Nodes (4): src-tauri/icons/iOS/AppIcon-40x40@1x.png - iOS Spotlight 40pt 1x, src-tauri/icons/iOS/AppIcon-40x40@2x.png - iOS Spotlight 40pt 2x, src-tauri/icons/iOS/AppIcon-40x40@2x-1.png - iOS Spotlight 40pt 2x (alternate), src-tauri/icons/iOS/AppIcon-40x40@3x.png - iOS Spotlight 40pt 3x

## Knowledge Gaps
- **300 isolated node(s):** `name`, `version`, `private`, `description`, `type` (+295 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **39 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useKanbanStore` connect `Board View` to `Archive View`, `Board Templates`, `Card Grid View`, `Notes View`, `Sidebar Layout`, `Topbar Layout`, `Task Editor`, `App Core`, `Column Component`, `Export/Import Utilities`, `List View`, `Sortable Task Card`, `File Preview and Comments`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `Task` connect `Drag and Drop System` to `Backlinks`, `Archive View`, `Card Grid View`, `Notes View`, `Topbar Layout`, `Task Editor`, `Column Component`, `Export/Import Utilities`, `List View`, `Sortable Task Card`, `Board View`, `SQLite Storage`, `File Preview and Comments`, `Board Models`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `dependencies` connect `DND Kit Dependencies` to `ESLint Config`, `Dexie Dependency`, `DND Sortable`, `DND Utilities`, `DND FormKit`, `Hello Pangea DND`, `Lucide React Icons`, `KaTeX Dependency`, `Mermaid Dependency`, `React Dependency`, `React DOM`, `React Markdown`, `React Router`, `Rehype Raw`, `Rehype Sanitize`, `Rehype Slug`, `Remark Breaks`, `Remark Frontmatter`, `Remark GFM`, `Remark Math`, `Shiki Dependency`, `TailwindCSS`, `TailwindCSS Vite`, `Tauri API`, `Tauri Dialog Plugin`, `Tauri FS Plugin`, `Tauri Shell Plugin`, `Tauri SQL Plugin`, `MD Editor Dependency`, `Zustand State`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _300 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tauri Backend API` be split into smaller, more focused modules?**
  _Cohesion score 0.1134575569358178 - nodes in this community are weakly interconnected._
- **Should `ESLint Config` be split into smaller, more focused modules?**
  _Cohesion score 0.05405405405405406 - nodes in this community are weakly interconnected._
- **Should `Tauri Window Config` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._