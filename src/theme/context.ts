import { createContext } from "react"
import { themes, defaultTheme, type Theme } from "./theme"

export interface ThemeCtx { theme: Theme; setTheme: (id: string) => void; themes: Theme[] }
export const Ctx = createContext<ThemeCtx>({ theme: defaultTheme, setTheme: () => {}, themes })