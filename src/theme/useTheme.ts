import { useContext } from "react"
import { Ctx, type ThemeCtx } from "./context"

export function useTheme(): ThemeCtx { 
  return useContext(Ctx) 
}