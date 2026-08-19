export interface TemplateColumn {
  name: string
  icon?: string
  color?: string
  tasks?: { title: string; description?: string }[]
}

export interface BoardTemplate {
  id: string
  name: string
  type: "kanban" | "notes"
  icon?: string
  color?: string
  description: string
  columns: TemplateColumn[]
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "sprint",
    name: "Software Sprint",
    type: "kanban",
    icon: "rocket",
    color: "#38bdf8",
    description: "Classic sprint board with Backlog → Done",
    columns: [
      { name: "Backlog", icon: "inbox", color: "#64748b" },
      {
        name: "To Do",
        icon: "circle",
        color: "#38bdf8",
        tasks: [
          { title: "Draft sprint goals", description: "Define the objectives for this sprint." },
          { title: "Break down the epic into tasks" },
        ],
      },
      { name: "In Progress", icon: "zap", color: "#fbbf24" },
      { name: "Review", icon: "eye", color: "#a78bfa" },
      { name: "Done", icon: "check", color: "#34d399" },
    ],
  },
  {
    id: "project",
    name: "Project Plan",
    type: "kanban",
    icon: "target",
    color: "#a78bfa",
    description: "Idea → Planning → Execution → Shipped",
    columns: [
      { name: "Ideas", icon: "lightbulb", color: "#fbbf24" },
      { name: "Planning", icon: "clipboard", color: "#64748b" },
      { name: "In Progress", icon: "zap", color: "#38bdf8" },
      { name: "Blocked", icon: "shield", color: "#fb7185" },
      { name: "Shipped", icon: "check", color: "#34d399" },
    ],
  },
  {
    id: "personal",
    name: "Personal Tasks",
    type: "kanban",
    icon: "coffee",
    color: "#34d399",
    description: "Simple To-Do / Doing / Done for everyday life",
    columns: [
      { name: "To Do", icon: "circle", color: "#38bdf8", tasks: [
          { title: "Pick up groceries" },
          { title: "Call the dentist" },
        ] },
      { name: "Doing", icon: "zap", color: "#fbbf24" },
      { name: "Done", icon: "check", color: "#34d399" },
    ],
  },
  {
    id: "job",
    name: "Job Search",
    type: "kanban",
    icon: "briefcase",
    color: "#fbbf24",
    description: "Track applications from leads to offer",
    columns: [
      { name: "Leads", icon: "inbox", color: "#64748b" },
      { name: "Applied", icon: "circle", color: "#38bdf8" },
      { name: "Interviewing", icon: "clock", color: "#fbbf24" },
      { name: "Offer", icon: "star", color: "#34d399" },
      { name: "Rejected", icon: "flame", color: "#fb7185" },
    ],
  },
  {
    id: "content",
    name: "Content Calendar",
    type: "kanban",
    icon: "file",
    color: "#fb7185",
    description: "Plan content from idea to published",
    columns: [
      { name: "Ideas", icon: "lightbulb", color: "#fbbf24" },
      { name: "Drafting", icon: "pencil", color: "#64748b" },
      { name: "Review", icon: "eye", color: "#a78bfa" },
      { name: "Published", icon: "check", color: "#34d399" },
    ],
  },
  {
    id: "notes",
    name: "Study Notes",
    type: "notes",
    icon: "book",
    color: "#60a5fa",
    description: "Notes board grouped by subject",
    columns: [
      { name: "Math", icon: "book", color: "#38bdf8" },
      { name: "Physics", icon: "flask", color: "#a78bfa" },
      { name: "Literature", icon: "file", color: "#34d399" },
    ],
  },
]