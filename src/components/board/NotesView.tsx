import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// ─────────────────────────────────────────────────────────────────────────────
// Syntax highlighter — zero deps, covers JS/TS/Python/CSS/HTML/JSON/SQL/Bash
// ─────────────────────────────────────────────────────────────────────────────

type TT = "kw"|"str"|"cmt"|"num"|"op"|"fn"|"ty"|"tag"|"attr"|"pct"|"bi"|"pl"
const TC: Record<TT, string> = {
  kw:"#c792ea", str:"#c3e88d", cmt:"#546e7a", num:"#f78c6c",
  op:"#89ddff",  fn:"#82aaff", ty:"#ffcb6b", tag:"#f07178",
  attr:"#c792ea",pct:"#89ddff",bi:"#80cbc4", pl:"#e4e4e7",
}
const KW: Record<string,string[]> = {
  js:  ["const","let","var","function","return","if","else","for","while","do","class","new","import","export","default","from","async","await","try","catch","finally","throw","typeof","instanceof","in","of","this","null","undefined","true","false","void","delete","switch","case","break","continue","extends","super","static","get","set","yield"],
  ts:  ["const","let","var","function","return","if","else","for","while","do","class","new","import","export","default","from","async","await","try","catch","finally","throw","typeof","instanceof","in","of","this","null","undefined","true","false","void","delete","switch","case","break","continue","extends","super","static","get","set","yield","type","interface","enum","implements","readonly","namespace","declare","abstract","as","keyof","infer","never","any","unknown","string","number","boolean","object"],
  py:  ["def","class","return","if","elif","else","for","while","import","from","as","try","except","finally","raise","with","in","not","and","or","is","lambda","yield","pass","break","continue","global","nonlocal","True","False","None","async","await","print","len","range","type","str","int","float","bool","list","dict","set","tuple"],
  go:  ["func","var","const","type","struct","interface","import","package","return","if","else","for","range","switch","case","default","break","continue","go","chan","select","defer","map","make","new","len","cap","append","copy","delete","panic","recover","true","false","nil","string","int","float64","bool","error","any"],
  rust:["fn","let","mut","const","struct","enum","impl","trait","pub","use","mod","crate","super","self","if","else","for","while","loop","match","return","true","false","None","Some","Ok","Err","String","Vec","Box","Option","Result","async","await","move","ref","where","type","dyn","unsafe","extern"],
  sql: ["SELECT","FROM","WHERE","JOIN","LEFT","RIGHT","INNER","OUTER","ON","GROUP","BY","ORDER","HAVING","INSERT","INTO","UPDATE","SET","DELETE","CREATE","TABLE","DROP","ALTER","INDEX","PRIMARY","KEY","FOREIGN","REFERENCES","NOT","NULL","DISTINCT","AS","AND","OR","IN","LIKE","BETWEEN","LIMIT","OFFSET","UNION","ALL","VALUES","WITH","CASE","WHEN","THEN","END"],
  bash:["if","then","else","elif","fi","for","while","do","done","case","esac","in","function","return","echo","exit","source","export","local","readonly","declare","cd","ls","mkdir","rm","cp","mv","cat","grep","sed","awk","find","chmod","sudo","apt","npm","git","curl","wget","set","unset","true","false"],
  json:["true","false","null"],
}
const BUILTINS = new Set(["console","Math","Object","Array","String","Number","Boolean","Promise","JSON","Error","Date","RegExp","Map","Set","Symbol","parseInt","parseFloat","isNaN","setTimeout","setInterval","fetch","document","window","process","require","module","exports","print","len","range","super","self"])

function tokenize(code: string, lang: string): Array<{t:TT, v:string}> {
  const l = lang.toLowerCase()
  const langKey = l==="typescript"||l==="tsx"?"ts":l==="javascript"||l==="jsx"?"js":l==="python"?"py":l==="shell"||l==="sh"?"bash":l
  const kws = new Set(KW[langKey]||[])

  // HTML/XML
  if (l==="html"||l==="xml") {
    const toks: Array<{t:TT,v:string}> = []
    const re = /(<\/?[a-zA-Z][^>]*\/?>|<!--[\s\S]*?-->|"[^"]*"|'[^']*')/g
    let last = 0, m
    while ((m = re.exec(code))) {
      if (m.index > last) toks.push({t:"pl",v:code.slice(last,m.index)})
      const s = m[0]
      if (s.startsWith("<!--")) toks.push({t:"cmt",v:s})
      else if (s.startsWith("<")) {
        // split tag into tag-name, attrs, brackets
        toks.push({t:"tag",v:s})
      } else toks.push({t:"str",v:s})
      last = m.index + s.length
    }
    if (last < code.length) toks.push({t:"pl",v:code.slice(last)})
    return toks
  }

  // CSS
  if (l==="css"||l==="scss"||l==="less") {
    const toks: Array<{t:TT,v:string}> = []
    const re = /(\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|#[0-9a-fA-F]{3,8}\b|\b\d+\.?\d*(?:px|em|rem|vh|vw|%|s|ms|deg)?\b|[a-zA-Z-]+(?=\s*:)|[:;{}(),])/g
    let last=0, m
    while ((m=re.exec(code))) {
      if (m.index>last) toks.push({t:"pl",v:code.slice(last,m.index)})
      const s=m[0]
      if (s.startsWith("/*")) toks.push({t:"cmt",v:s})
      else if (s.startsWith('"')||s.startsWith("'")) toks.push({t:"str",v:s})
      else if (s.startsWith("#")) toks.push({t:"num",v:s})
      else if (/^\d/.test(s)) toks.push({t:"num",v:s})
      else if (/^[a-zA-Z-]+$/.test(s)) toks.push({t:"attr",v:s})
      else toks.push({t:"pct",v:s})
      last=m.index+s.length
    }
    if (last<code.length) toks.push({t:"pl",v:code.slice(last)})
    return toks
  }

  // JSON
  if (l==="json") {
    const toks: Array<{t:TT,v:string}> = []
    const re = /("(?:[^"\\]|\\.)*"\s*(?=:))|("(?:[^"\\]|\\.)*")|(true|false|null)|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|([{}\[\]:,])/g
    let last=0, m
    while ((m=re.exec(code))) {
      if (m.index>last) toks.push({t:"pl",v:code.slice(last,m.index)})
      if (m[1]) toks.push({t:"attr",v:m[1]})
      else if (m[2]) toks.push({t:"str",v:m[2]})
      else if (m[3]) toks.push({t:"kw",v:m[3]})
      else if (m[4]) toks.push({t:"num",v:m[4]})
      else toks.push({t:"pct",v:m[0]})
      last=m.index+m[0].length
    }
    if (last<code.length) toks.push({t:"pl",v:code.slice(last)})
    return toks
  }

  // General: JS/TS/Python/Go/Rust/SQL/Bash
  const toks: Array<{t:TT,v:string}> = []
  const patterns: Array<[TT, RegExp]> = [
    ["cmt", /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*(?:(?!bash))|--[^\n]*)/],
    ["str", /^("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/],
    ["num", /^-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/],
  ]
  let pos=0
  while (pos<code.length) {
    // whitespace
    if (/[ \t\n\r]/.test(code[pos])) {
      let j=pos; while(j<code.length&&/[ \t\n\r]/.test(code[j]))j++
      toks.push({t:"pl",v:code.slice(pos,j)}); pos=j; continue
    }
    // comment/string/number
    let hit=false
    for (const [type,re] of patterns) {
      const m=code.slice(pos).match(re)
      if (m) { toks.push({t:type,v:m[0]}); pos+=m[0].length; hit=true; break }
    }
    if (hit) continue
    // identifier
    const idm = code.slice(pos).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
    if (idm) {
      const w=idm[0]
      const isCall = code.slice(pos+w.length).match(/^\s*\(/)
      const isType = /^[A-Z]/.test(w)
      if (kws.has(w)) toks.push({t:"kw",v:w})
      else if (BUILTINS.has(w)) toks.push({t:"bi",v:w})
      else if (isCall) toks.push({t:"fn",v:w})
      else if (isType) toks.push({t:"ty",v:w})
      else toks.push({t:"pl",v:w})
      pos+=w.length; continue
    }
    // operator / punct
    const opm = code.slice(pos).match(/^(=>|\.\.\.|\?\?|[+\-*/%=!<>&|^~?]+)/)
    if (opm) { toks.push({t:"op",v:opm[0]}); pos+=opm[0].length; continue }
    const pctm = code.slice(pos).match(/^[{}[\]();,.:@]/)
    if (pctm) { toks.push({t:"pct",v:pctm[0]}); pos+=pctm[0].length; continue }
    toks.push({t:"pl",v:code[pos]}); pos++
  }
  return toks
}

function SyntaxCode({ code, lang }: { code: string; lang: string }) {
  const tokens = useMemo(()=>tokenize(code,lang),[code,lang])
  return (
    <code style={{color:TC.pl,background:"none",border:"none",padding:0,fontSize:"inherit",fontFamily:"inherit"}}>
      {tokens.map((tok,i)=><span key={i} style={{color:TC[tok.t]}}>{tok.v}</span>)}
    </code>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mermaid renderer — dynamic import, graceful fallback
// ─────────────────────────────────────────────────────────────────────────────

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string|null>(null)
  const [err, setErr] = useState<string|null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Will work if user has `mermaid` in their project's node_modules
        const mermaid = (await import("mermaid" as any)).default
        mermaid.initialize({ startOnLoad:false, theme:"dark", darkMode:true,
          themeVariables:{ background:"transparent", primaryColor:"#3b82f6",
            primaryTextColor:"#e4e4e7", lineColor:"#52525b", edgeLabelBackground:"#1c1c1c" }})
        const id = "mmd-"+Math.random().toString(36).slice(2)
        const { svg: rendered } = await mermaid.render(id, code)
        if (!cancelled) setSvg(rendered)
      } catch(e:any) {
        if (!cancelled) setErr(e?.message||"Mermaid not available. Run: npm install mermaid")
      }
    })()
    return () => { cancelled=true }
  }, [code])

  if (err) return (
    <div style={{border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,backgroundColor:"rgba(239,68,68,0.06)",padding:"10px 14px",marginBottom:14}}>
      <p style={{fontSize:11,color:"#ef4444",fontWeight:600,marginBottom:4}}>Mermaid error</p>
      <pre style={{fontSize:12,color:"#a1a1aa",margin:0,whiteSpace:"pre-wrap"}}>{err}</pre>
      <pre style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginTop:8,padding:"8px 10px",backgroundColor:"rgba(0,0,0,0.3)",borderRadius:6}}>{code}</pre>
    </div>
  )
  if (!svg) return (
    <div style={{backgroundColor:"rgba(0,0,0,0.25)",borderRadius:8,padding:"20px 16px",marginBottom:14,textAlign:"center",border:"1px solid var(--border)"}}>
      <span style={{fontSize:12,color:"var(--text-muted)"}}>Rendering diagram…</span>
    </div>
  )
  return <div style={{marginBottom:14,display:"flex",justifyContent:"center",overflowX:"auto"}} dangerouslySetInnerHTML={{__html:svg}} />
}
import type { Task } from "../../models/Task"
import { useKanbanStore } from "../../state/kanbanStore"
import { tagColorClasses } from "../../utils/tagColors"
import ExplorerTree from "../ui/ExplorerTree"
import TextInputDialog from "../ui/TextInputDialog"
import ConfirmDialog from "../ui/ConfirmDialog"
import CreateNoteDialog from "../ui/CreateNoteDialog"
import CategoryEditDialog from "../ui/CategoryEditDialog"
import BacklinksSection from "../notes/BacklinksSection"

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY = 1200 // ms

const PREDEFINED_TAGS = ["api", "ui", "backend", "frontend", "bug", "feature", "documentation", "security", "performance"]

// Toolbar button definitions
const TOOLBAR: Array<{
  label: string; title: string
  action: (ta: HTMLTextAreaElement, val: string) => { value: string; cursor: number } | null
  wrap?: boolean
}> = [
  {
    label: "**B**", title: "Bold",
    action: (ta, val) => wrapSelection(ta, val, "**", "**", "bold text"),
  },
  {
    label: "*I*", title: "Italic",
    action: (ta, val) => wrapSelection(ta, val, "*", "*", "italic text"),
  },
  {
    label: "~~S~~", title: "Strikethrough",
    action: (ta, val) => wrapSelection(ta, val, "~~", "~~", "strikethrough"),
  },
  {
    label: "`c`", title: "Inline code",
    action: (ta, val) => wrapSelection(ta, val, "`", "`", "code"),
  },
  {
    label: "```", title: "Code block",
    action: (ta, val) => insertBlock(ta, val, "```\n", "\n```", "code here"),
  },
  { label: "—", title: "sep", action: () => null },
  {
    label: "H1", title: "Heading 1",
    action: (ta, val) => insertLinePrefix(ta, val, "# "),
  },
  {
    label: "H2", title: "Heading 2",
    action: (ta, val) => insertLinePrefix(ta, val, "## "),
  },
  {
    label: "H3", title: "Heading 3",
    action: (ta, val) => insertLinePrefix(ta, val, "### "),
  },
  { label: "—", title: "sep", action: () => null },
  {
    label: "—", title: "Horizontal rule",
    action: (ta, val) => insertAtCursor(ta, val, "\n\n---\n\n"),
  },
  {
    label: "• List", title: "Bullet list",
    action: (ta, val) => insertLinePrefix(ta, val, "- "),
  },
  {
    label: "1. List", title: "Numbered list",
    action: (ta, val) => insertLinePrefix(ta, val, "1. "),
  },
  {
    label: "☑ Task", title: "Task list item",
    action: (ta, val) => insertLinePrefix(ta, val, "- [ ] "),
  },
  { label: "—", title: "sep", action: () => null },
  {
    label: "> Quote", title: "Blockquote",
    action: (ta, val) => insertLinePrefix(ta, val, "> "),
  },
  {
    label: "🔗 Link", title: "Insert link",
    action: (ta, val) => {
      const sel = val.slice(ta.selectionStart, ta.selectionEnd) || "link text"
      const ins = `[${sel}](url)`
      const newVal = val.slice(0, ta.selectionStart) + ins + val.slice(ta.selectionEnd)
      return { value: newVal, cursor: ta.selectionStart + ins.length }
    },
  },
  {
    label: "[[Wiki]]", title: "Wiki link to another note",
    action: (ta, val) => {
      const sel = val.slice(ta.selectionStart, ta.selectionEnd) || "Note Title"
      const ins = `[[${sel}]]`
      const newVal = val.slice(0, ta.selectionStart) + ins + val.slice(ta.selectionEnd)
      return { value: newVal, cursor: ta.selectionStart + ins.length }
    },
  },
  {
    label: "📋 Table", title: "Insert table",
    action: (ta, val) => insertAtCursor(ta, val,
      "\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n"
    ),
  },
]

function wrapSelection(
  ta: HTMLTextAreaElement, val: string,
  before: string, after: string, placeholder: string
): { value: string; cursor: number } {
  const start = ta.selectionStart
  const end   = ta.selectionEnd
  const sel   = val.slice(start, end) || placeholder
  const newVal = val.slice(0, start) + before + sel + after + val.slice(end)
  return { value: newVal, cursor: start + before.length + sel.length + after.length }
}

function insertBlock(
  ta: HTMLTextAreaElement, val: string,
  before: string, after: string, placeholder: string
): { value: string; cursor: number } {
  const start = ta.selectionStart
  const sel   = val.slice(start, ta.selectionEnd) || placeholder
  const newVal = val.slice(0, start) + before + sel + after + val.slice(ta.selectionEnd)
  return { value: newVal, cursor: start + before.length + sel.length + after.length }
}

function insertLinePrefix(
  ta: HTMLTextAreaElement, val: string, prefix: string
): { value: string; cursor: number } {
  const start     = ta.selectionStart
  const lineStart = val.lastIndexOf("\n", start - 1) + 1
  const newVal    = val.slice(0, lineStart) + prefix + val.slice(lineStart)
  return { value: newVal, cursor: start + prefix.length }
}

function insertAtCursor(
  ta: HTMLTextAreaElement, val: string, text: string
): { value: string; cursor: number } {
  const pos    = ta.selectionStart
  const newVal = val.slice(0, pos) + text + val.slice(pos)
  return { value: newVal, cursor: pos + text.length }
}

// Smart Enter: auto-continue lists / task items
function smartEnter(value: string, selStart: number): { newValue: string; newCursor: number } | null {
  const lines  = value.slice(0, selStart).split("\n")
  const line   = lines[lines.length - 1]
  const cbMatch = line.match(/^(\s*- \[[ x]\] )(.*)$/)
  const ulMatch = line.match(/^(\s*[-*+] )(.*)$/)
  const olMatch = line.match(/^(\s*(\d+)\. )(.*)$/)
  if (cbMatch) {
    if (!cbMatch[2]) {
      const before = value.slice(0, selStart - line.length)
      return { newValue: before + value.slice(selStart), newCursor: before.length }
    }
    const prefix   = cbMatch[1].replace(/\[x\]/i, "[ ]")
    const newValue = value.slice(0, selStart) + "\n" + prefix + value.slice(selStart)
    return { newValue, newCursor: selStart + 1 + prefix.length }
  }
  if (ulMatch) {
    if (!ulMatch[2]) {
      const before = value.slice(0, selStart - line.length)
      return { newValue: before + value.slice(selStart), newCursor: before.length }
    }
    const newValue = value.slice(0, selStart) + "\n" + ulMatch[1] + value.slice(selStart)
    return { newValue, newCursor: selStart + 1 + ulMatch[1].length }
  }
  if (olMatch) {
    if (!olMatch[3]) {
      const before = value.slice(0, selStart - line.length)
      return { newValue: before + value.slice(selStart), newCursor: before.length }
    }
    const next     = parseInt(olMatch[2]) + 1
    const prefix   = olMatch[1].replace(/\d+/, String(next))
    const newValue = value.slice(0, selStart) + "\n" + prefix + value.slice(selStart)
    return { newValue, newCursor: selStart + 1 + prefix.length }
  }
  return null
}

// Replace [[wiki links]] in markdown text before rendering
function processWikiLinks(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_match, title) =>
    `[${title}](wiki:${encodeURIComponent(title)})`
  )
}

// Word count helper
function wordCount(text: string) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length
  const lines = text.split("\n").length
  return { words, chars, lines }
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown renderer with full GFM + syntax highlight + wiki links
// ─────────────────────────────────────────────────────────────────────────────

function MarkdownPreview({
  content,
  onWikiLinkClick,
}: {
  content: string
  onWikiLinkClick: (title: string) => void
}) {
  const processed = useMemo(() => processWikiLinks(content), [content])

  return (
    <div
      className="prose-notes"
      style={{
        color: "var(--text-primary)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 15,
        lineHeight: 1.75,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 style={{
              fontSize: 26, fontWeight: 700, marginTop: 28, marginBottom: 12,
              color: "var(--text-primary)", borderBottom: "1px solid var(--border)",
              paddingBottom: 8, letterSpacing: "-0.02em",
            }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{
              fontSize: 20, fontWeight: 650, marginTop: 24, marginBottom: 10,
              color: "var(--text-primary)", letterSpacing: "-0.015em",
            }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{
              fontSize: 16, fontWeight: 650, marginTop: 20, marginBottom: 8,
              color: "var(--text-primary)",
            }}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 style={{
              fontSize: 14, fontWeight: 600, marginTop: 16, marginBottom: 6,
              color: "var(--text-secondary)",
            }}>{children}</h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p style={{ marginTop: 0, marginBottom: 14, color: "var(--text-primary)" }}>{children}</p>
          ),
          // Links — handle wiki: scheme
          a: ({ href, children }) => {
            if (href?.startsWith("wiki:")) {
              const title = decodeURIComponent(href.slice(5))
              return (
                <button
                  onClick={() => onWikiLinkClick(title)}
                  style={{
                    color: "var(--accent, #60a5fa)",
                    textDecoration: "underline",
                    textDecorationStyle: "dotted",
                    background: "none", border: "none", cursor: "pointer",
                    padding: 0, font: "inherit",
                  }}
                >
                  {children}
                </button>
              )
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer"
                style={{ color: "var(--accent, #60a5fa)", textDecoration: "underline" }}>
                {children}
              </a>
            )
          },
          // Lists
          ul: ({ children }) => (
            <ul style={{ paddingLeft: 20, marginBottom: 14, listStyleType: "disc" }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: 20, marginBottom: 14, listStyleType: "decimal" }}>{children}</ol>
          ),
          li: ({ children, ...props }) => {
            // Task list items
            const isTask = (props as any).className === "task-list-item"
            return (
              <li style={{
                marginBottom: 4,
                color: "var(--text-primary)",
                listStyleType: isTask ? "none" : undefined,
                marginLeft: isTask ? -4 : undefined,
              }}>
                {children}
              </li>
            )
          },
          // Checkbox input in task lists
          input: ({ type, checked }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  style={{
                    marginRight: 6,
                    accentColor: "var(--accent, #60a5fa)",
                    cursor: "default",
                  }}
                />
              )
            }
            return null
          },
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: "3px solid var(--accent, #60a5fa)",
              paddingLeft: 16, marginLeft: 0, marginBottom: 14,
              color: "var(--text-secondary)",
              backgroundColor: "rgba(96,165,250,0.05)",
              borderRadius: "0 6px 6px 0",
              padding: "8px 16px",
            }}>
              {children}
            </blockquote>
          ),
          // Inline code
          code: ({ inline, children, className }: any) => {
            if (inline) {
              return (
                <code style={{
                  backgroundColor: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 4, padding: "1px 6px",
                  fontSize: "0.87em",
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  color: "#e2b06a",
                }}>
                  {children}
                </code>
              )
            }
            const lang = (className || "").replace("language-", "").toLowerCase()
            const code = String(children).replace(/\n$/, "")
            // Mermaid — render as diagram
            if (lang === "mermaid") return <MermaidDiagram code={code} />
            return (
              <div style={{ position: "relative", marginBottom: 16 }}>
                {lang && (
                  <div style={{
                    position: "absolute", top: 10, right: 12,
                    fontSize: 10, fontWeight: 600, letterSpacing: "0.07em",
                    color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
                    fontFamily: "'DM Sans', sans-serif", userSelect: "none", pointerEvents: "none",
                  }}>
                    {lang}
                  </div>
                )}
                <pre style={{
                  backgroundColor: "rgba(0,0,0,0.45)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10,
                  padding: "14px 18px",
                  overflowX: "auto",
                  fontSize: 13,
                  lineHeight: 1.7,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  margin: 0,
                }}>
                  <SyntaxCode code={code} lang={lang || "plain"} />
                </pre>
              </div>
            )
          },
          // Table
          table: ({ children }) => (
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{
                width: "100%", borderCollapse: "collapse",
                fontSize: 14,
              }}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>{children}</thead>
          ),
          th: ({ children }) => (
            <th style={{
              padding: "8px 12px", textAlign: "left",
              color: "var(--text-secondary)", fontWeight: 600, fontSize: 12,
              textTransform: "uppercase", letterSpacing: "0.05em",
              borderBottom: "1px solid var(--border)",
            }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{
              padding: "8px 12px",
              color: "var(--text-primary)",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}>
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr style={{ transition: "background-color 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {children}
            </tr>
          ),
          // HR — use div so it always renders (border-only hr can collapse)
          hr: () => (
            <div style={{
              display: "block",
              height: 1,
              backgroundColor: "rgba(255,255,255,0.12)",
              border: "none",
              margin: "28px 0",
            }} />
          ),
          // Strong / Em
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: "var(--text-primary)" }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>{children}</em>
          ),
          // Images
          img: ({ src, alt }) => (
            <img src={src} alt={alt}
              style={{
                maxWidth: "100%", borderRadius: 8,
                border: "1px solid var(--border)",
                margin: "8px 0",
              }} />
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main NotesView
// ─────────────────────────────────────────────────────────────────────────────

export default function NotesView() {
  const tasks       = useKanbanStore(s => s.tasks)
  const columns     = useKanbanStore(s => s.columns)
  const activeBoard = useKanbanStore(s => s.activeBoard)
  const searchQuery = useKanbanStore(s => s.searchQuery)
  const activeTags  = useKanbanStore(s => s.activeTags)

  const [sidebarCollapsed,       setSidebarCollapsed]       = useState(false)
  const [selectedNoteId,         setSelectedNoteId]         = useState<string | undefined>()
  const [noteContent,            setNoteContent]            = useState("")
  const [noteTags,               setNoteTags]               = useState<string[]>([])
  const [tagInput,               setTagInput]               = useState("")
  const [viewMode,               setViewMode]               = useState<"edit" | "preview" | "split">("preview")
  const [docWidthMode,           setDocWidthMode]           = useState(false)
  const [isSaving,               setIsSaving]               = useState(false)
  const [isDirty,                setIsDirty]                = useState(false)
  const [wordCountInfo,          setWordCountInfo]          = useState({ words: 0, chars: 0, lines: 0 })
  const [showCreateDialog,       setShowCreateDialog]       = useState(false)
  const [showDeleteDialog,       setShowDeleteDialog]       = useState(false)
  const [showEditTitleDialog,    setShowEditTitleDialog]    = useState(false)
  const [pendingCategory,        setPendingCategory]        = useState("")
  const [editingCategory,        setEditingCategory]        = useState<string | null>(null)
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false)
  const [deletingCategory,       setDeletingCategory]       = useState<string | null>(null)
  const [sidebarSearch,          setSidebarSearch]          = useState("")
  const [focusMode,              setFocusMode]              = useState(false)

  const textareaRef   = useRef<HTMLTextAreaElement>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived data ───────────────────────────────────────────────────────────
  const allNoteTasks = useMemo(() => tasks.filter(t => t.type === "note"), [tasks])

  const noteTasks = useMemo(() => {
    let result = allNoteTasks
    const q = (searchQuery || sidebarSearch).trim().toLowerCase()
    if (q) result = result.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.tags?.some(tag => tag.toLowerCase().includes(q))
    )
    if (activeTags.length > 0) result = result.filter(t => t.tags?.some(tag => activeTags.includes(tag)))
    return result
  }, [allNoteTasks, searchQuery, sidebarSearch, activeTags])

  const categories = useMemo(() => {
    const set = new Set<string>()
    noteTasks.forEach(t => {
      const cat = t.data?.category as string
      if (cat?.trim()) set.add(cat)
    })
    if (noteTasks.some(t => !t.data?.category)) set.add("Uncategorized")
    return Array.from(set).sort()
  }, [noteTasks])

  const groupedNotes = useMemo(() =>
    categories.map(cat => ({
      key: cat, label: cat,
      items: noteTasks.filter(t => {
        const tc = t.data?.category as string
        return cat === "Uncategorized" ? !tc : tc === cat
      }),
    })),
    [noteTasks, categories]
  )

  const selectedNote = useMemo(() => noteTasks.find(t => t.id === selectedNoteId), [noteTasks, selectedNoteId])

  // ── Sync content when note changes ────────────────────────────────────────
  useEffect(() => {
    if (selectedNote) {
      setNoteContent(selectedNote.description || "")
      setNoteTags(selectedNote.tags || [])
      setIsDirty(false)
    } else {
      setNoteContent(""); setNoteTags([])
    }
  }, [selectedNote?.id]) // eslint-disable-line

  // ── Word count update ──────────────────────────────────────────────────────
  useEffect(() => { setWordCountInfo(wordCount(noteContent)) }, [noteContent])

  // ── Auto-save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty || !selectedNoteId) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      setIsSaving(true)
      await useKanbanStore.getState().updateTask(selectedNoteId, {
        description: noteContent.trim() || undefined,
        tags: noteTags.length > 0 ? noteTags : undefined,
      })
      setIsSaving(false)
      setIsDirty(false)
    }, AUTOSAVE_DELAY)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [noteContent, noteTags, isDirty, selectedNoteId])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSaveNow()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault()
        setViewMode(v => v === "edit" ? "preview" : v === "preview" ? "split" : "edit")
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault()
        setDocWidthMode(v => !v)
      }
      if (e.key === "Escape" && focusMode) setFocusMode(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [focusMode, noteContent, noteTags, selectedNoteId]) // eslint-disable-line

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleContentChange = (val: string) => {
    setNoteContent(val)
    setIsDirty(true)
  }

  const handleSaveNow = useCallback(async () => {
    if (!selectedNoteId) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setIsSaving(true)
    await useKanbanStore.getState().updateTask(selectedNoteId, {
      description: noteContent.trim() || undefined,
      tags: noteTags.length > 0 ? noteTags : undefined,
    })
    setIsSaving(false)
    setIsDirty(false)
  }, [selectedNoteId, noteContent, noteTags])

  const handleWikiLinkClick = useCallback((title: string) => {
    const found = noteTasks.find(t => t.title.toLowerCase() === title.toLowerCase())
    if (found) setSelectedNoteId(found.id)
  }, [noteTasks])

  const handleDeleteNote = async () => { setShowDeleteDialog(true) }

  const confirmDeleteNote = async () => {
    if (!selectedNoteId) return
    await useKanbanStore.getState().deleteTask(selectedNoteId)
    setSelectedNoteId(undefined); setNoteContent("")
    setShowDeleteDialog(false)
  }

  const confirmEditTitle = async (newTitle: string) => {
    if (!selectedNoteId || !newTitle.trim()) return
    await useKanbanStore.getState().updateTask(selectedNoteId, { title: newTitle.trim() })
    setShowEditTitleDialog(false)
  }

  const handleCreateNote = (cat: string) => { setPendingCategory(cat); setShowCreateDialog(true) }

  const handleConfirmCreate = async (title: string, category: string) => {
    if (!title.trim()) return
    let colId = columns[0]?.id
    if (!colId && activeBoard) {
      await useKanbanStore.getState().createColumn(activeBoard.id, "Notes")
      const newCols = useKanbanStore.getState().columns
      colId = newCols.find(c => c.boardId === activeBoard.id)?.id
    }
    if (!colId) return
    await useKanbanStore.getState().createTask(colId, title.trim(), {
      type: "note", data: { category },
    })
    setShowCreateDialog(false)
    // Auto-select the just-created note
    const newNote = useKanbanStore.getState().tasks.find(t => t.title === title.trim() && t.type === "note")
    if (newNote) setSelectedNoteId(newNote.id)
  }

  const handleRenameCategory = (oldCat: string, newCat: string) => {
    noteTasks
      .filter(t => ((t.data?.category as string) === oldCat) || (!t.data?.category && oldCat === "Uncategorized"))
      .forEach(async t => {
        await useKanbanStore.getState().updateTask(t.id, {
          data: { ...t.data, category: newCat === "Uncategorized" ? undefined : newCat }
        })
      })
    setEditingCategory(null)
  }

  const handleDeleteCategory = (cat: string) => { setDeletingCategory(cat); setShowDeleteCategoryDialog(true) }

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return
    const toDelete = noteTasks.filter(t => ((t.data?.category as string) || "Uncategorized") === deletingCategory)
    for (const n of toDelete) await useKanbanStore.getState().deleteTask(n.id)
    setDeletingCategory(null); setShowDeleteCategoryDialog(false)
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-")
    if (t && !noteTags.includes(t)) { setNoteTags(p => [...p, t]); setIsDirty(true) }
    setTagInput("")
  }

  // ── Textarea key handling ──────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta  = e.currentTarget
    const val = noteContent

    if (e.key === "Tab") {
      e.preventDefault()
      const res = insertAtCursor(ta, val, "  ")
      setNoteContent(res.value)
      requestAnimationFrame(() => ta.setSelectionRange(res.cursor, res.cursor))
      setIsDirty(true)
      return
    }

    if (e.key === "Enter" && !e.shiftKey) {
      const result = smartEnter(val, ta.selectionStart)
      if (result) {
        e.preventDefault()
        setNoteContent(result.newValue)
        requestAnimationFrame(() => ta.setSelectionRange(result.newCursor, result.newCursor))
        setIsDirty(true)
        return
      }
    }
  }

  // ── Toolbar action ─────────────────────────────────────────────────────────
  const applyToolbar = (toolbarItem: typeof TOOLBAR[0]) => {
    const ta = textareaRef.current
    if (!ta) return
    const result = toolbarItem.action(ta, noteContent)
    if (!result) return
    setNoteContent(result.value)
    setIsDirty(true)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(result.cursor, result.cursor)
    })
  }

  // ── Render note item for sidebar ───────────────────────────────────────────
  const renderNoteItem = (task: Task) => {
    const isSelected = selectedNoteId === task.id
    return (
      <div
        style={{
          padding: "7px 10px",
          borderRadius: 7,
          cursor: "pointer",
          backgroundColor: isSelected ? "rgba(96,165,250,0.12)" : "transparent",
          border: isSelected ? "1px solid rgba(96,165,250,0.25)" : "1px solid transparent",
          transition: "background-color 0.12s, border-color 0.12s",
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)" }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent" }}
      >
        <div style={{
          fontSize: 13, fontWeight: isSelected ? 600 : 500,
          color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {task.title || "Untitled Note"}
        </div>
        {task.description && (
          <div style={{
            fontSize: 11, color: "var(--text-muted)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginTop: 2,
          }}>
            {task.description.slice(0, 50)}…
          </div>
        )}
        {task.tags && task.tags.length > 0 && (
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
            {task.tags.slice(0, 3).map(tag => {
              const c = tagColorClasses(tag)
              return (
                <span key={tag}
                  className={`${c.bg} ${c.border} ${c.text}`}
                  style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, border: "1px solid" }}>
                  #{tag}
                </span>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{
        display: "flex", height: "100%", overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
        backgroundColor: "var(--bg-app)",
      }}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        {!focusMode && (
          <div style={{
            width: sidebarCollapsed ? 48 : 260,
            flexShrink: 0,
            display: "flex", flexDirection: "column",
            borderRight: "1px solid var(--border)",
            backgroundColor: "var(--bg-column-solid, rgba(255,255,255,0.01))",
            transition: "width 0.2s ease",
            overflow: "hidden",
          }}>
            {/* Sidebar header */}
            <div style={{
              padding: "10px 10px 10px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 6,
              flexShrink: 0,
            }}>
              {!sidebarCollapsed && (
                <>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", flex: 1 }}>
                    Notes
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginLeft: 6 }}>
                      {noteTasks.length}
                    </span>
                  </span>
                  <SidebarIconBtn title="New note" onClick={() => { setPendingCategory(""); setShowCreateDialog(true) }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 3v10M3 8h10" />
                    </svg>
                  </SidebarIconBtn>
                </>
              )}
              <SidebarIconBtn
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setSidebarCollapsed(v => !v)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d={sidebarCollapsed ? "M6 4l4 4-4 4" : "M10 4l-4 4 4 4"} />
                </svg>
              </SidebarIconBtn>
            </div>

            {/* Sidebar search */}
            {!sidebarCollapsed && (
              <div style={{ padding: "8px 10px", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
                    className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                    <circle cx="7" cy="7" r="4" strokeWidth={1.75} />
                    <path d="M10.5 10.5l2.5 2.5" strokeLinecap="round" strokeWidth={1.75} />
                  </svg>
                  <input
                    value={sidebarSearch}
                    onChange={e => setSidebarSearch(e.target.value)}
                    placeholder="Search notes…"
                    style={{
                      width: "100%", paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6,
                      borderRadius: 7, border: "1px solid var(--border)",
                      backgroundColor: "var(--bg-input)", color: "var(--text-primary)",
                      fontSize: 12, outline: "none",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Notes tree */}
            {!sidebarCollapsed && (
              <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 12px" }}>
                {noteTasks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>No notes yet</p>
                    <button
                      onClick={() => { setPendingCategory("General"); setShowCreateDialog(true) }}
                      style={{
                        padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        backgroundColor: "rgba(96,165,250,0.15)", color: "var(--accent, #60a5fa)",
                        border: "1px solid rgba(96,165,250,0.25)", cursor: "pointer",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.25)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.15)")}
                    >
                      Create first note
                    </button>
                  </div>
                ) : (
                  <ExplorerTree<Task>
                    items={noteTasks}
                    groupKey={(item: Task) => (item.data?.category as string) || "Uncategorized"}
                    renderItem={renderNoteItem}
                    onCreate={handleCreateNote}
                    onItemSelect={(item) => { setSelectedNoteId(item.id); setViewMode(v => v === "edit" ? "edit" : "preview") }}
                    renderGroupHeader={(groupLabel, groupItems, onCreate) => (
                      <div
                        className="group"
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "6px 6px 3px",
                        }}
                      >
                        <span style={{
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          letterSpacing: "0.08em", color: "var(--text-muted)", flex: 1,
                        }}>
                          {groupLabel} <span style={{ fontWeight: 500, opacity: 0.7 }}>({groupItems.length})</span>
                        </span>
                        <button
                          onClick={() => setEditingCategory(groupLabel)}
                          title="Rename category"
                          className="opacity-0 group-hover:opacity-100"
                          style={{
                            padding: 3, borderRadius: 4, border: "none", cursor: "pointer",
                            backgroundColor: "transparent", color: "var(--text-muted)",
                            transition: "background-color 0.1s, color 0.1s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-primary)" }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                              d="M8 1.5l2.5 2.5L3 11.5H0.5V9L8 1.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onCreate?.(groupLabel)}
                          title={`New note in ${groupLabel}`}
                          className="opacity-0 group-hover:opacity-100"
                          style={{
                            padding: 3, borderRadius: 4, border: "none", cursor: "pointer",
                            backgroundColor: "transparent", color: "var(--text-muted)",
                            transition: "background-color 0.1s, color 0.1s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.12)"; e.currentTarget.style.color = "var(--accent, #60a5fa)" }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 2v8M2 6h8" />
                          </svg>
                        </button>
                      </div>
                    )}
                  />
                )}
              </div>
            )}

            {/* Collapsed sidebar — just icons */}
            {sidebarCollapsed && (
              <div style={{ padding: "8px 6px", display: "flex", flexDirection: "column", gap: 4 }}>
                <SidebarIconBtn title="New note" onClick={() => { setSidebarCollapsed(false); setPendingCategory(""); setShowCreateDialog(true) }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 3v10M3 8h10" />
                  </svg>
                </SidebarIconBtn>
              </div>
            )}
          </div>
        )}

        {/* ── Editor area ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {selectedNote ? (
            <>
              {/* ── Note header ─────────────────────────────────────────────── */}
              <div style={{
                flexShrink: 0,
                borderBottom: "1px solid var(--border)",
                backgroundColor: "var(--bg-app)",
                padding: "10px 20px 0",
              }}>
                {/* Title row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {focusMode && (
                    <button onClick={() => setFocusMode(false)}
                      style={{
                        padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                        backgroundColor: "transparent", border: "1px solid var(--border)",
                        color: "var(--text-muted)", cursor: "pointer",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >← Exit focus</button>
                  )}
                  <h1
                    onDoubleClick={() => setShowEditTitleDialog(true)}
                    title="Double-click to rename"
                    style={{
                      fontSize: 18, fontWeight: 700, color: "var(--text-primary)",
                      flex: 1, cursor: "text", userSelect: "none",
                      letterSpacing: "-0.02em",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {selectedNote.title}
                  </h1>

                  {/* Status indicators */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {isSaving ? (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Saving…</span>
                    ) : isDirty ? (
                      <span style={{ fontSize: 11, color: "#f97316" }}>Unsaved</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#22c55e" }}>Saved</span>
                    )}

                    {/* View mode toggle */}
                    <div style={{
                      display: "flex", backgroundColor: "var(--bg-popover)",
                      borderRadius: 7, padding: 3, border: "1px solid var(--border)", gap: 1,
                    }}>
                      {(["edit", "split", "preview"] as const).map(m => (
                        <ViewToggleBtn key={m} active={viewMode === m} onClick={() => setViewMode(m)}>
                          {m === "edit" ? "Edit" : m === "split" ? "Split" : "Preview"}
                        </ViewToggleBtn>
                      ))}
                    </div>

                    {/* Doc / A4 width toggle */}
                    <HeaderBtn
                      title={docWidthMode ? "Full width" : "Doc width — A4 centered (⌘⇧D)"}
                      active={docWidthMode}
                      onClick={() => setDocWidthMode(v => !v)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                        <rect x="1" y="1" width="12" height="12" rx="1.5" strokeWidth={1.5} />
                        <path strokeLinecap="round" strokeWidth={1.5} d="M3.5 4.5h7M3.5 7h7M3.5 9.5h4.5" />
                      </svg>
                    </HeaderBtn>

                    {/* Focus mode */}
                    <HeaderBtn
                      title="Focus mode (Esc to exit)"
                      active={focusMode}
                      onClick={() => setFocusMode(v => !v)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" />
                      </svg>
                    </HeaderBtn>

                    {/* Save now */}
                    <HeaderBtn title="Save (⌘S)" onClick={handleSaveNow} disabled={!isDirty}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M11 12H3a1 1 0 01-1-1V3a1 1 0 011-1h6l3 3v7a1 1 0 01-1 1z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M9 12V8H5v4M5 2v3h5" />
                      </svg>
                    </HeaderBtn>

                    {/* Delete */}
                    <HeaderBtn title="Delete note" onClick={handleDeleteNote} danger>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M2 2l10 10M12 2L2 12" />
                      </svg>
                    </HeaderBtn>
                  </div>
                </div>

                {/* Tags row */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingBottom: 10 }}>
                  {noteTags.map(tag => {
                    const c = tagColorClasses(tag)
                    return (
                      <span key={tag}
                        className={`${c.bg} ${c.border} ${c.text}`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 11, padding: "2px 8px", borderRadius: 5, border: "1px solid",
                          fontWeight: 500,
                        }}>
                        #{tag}
                        <button
                          onClick={() => { setNoteTags(p => p.filter(t => t !== tag)); setIsDirty(true) }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.6, color: "inherit" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                        >✕</button>
                      </span>
                    )
                  })}

                  {/* Quick tag pills */}
                  {PREDEFINED_TAGS.filter(t => !noteTags.includes(t)).slice(0, 5).map(tag => (
                    <button key={tag}
                      onClick={() => { setNoteTags(p => [...p, tag]); setIsDirty(true) }}
                      style={{
                        fontSize: 11, padding: "2px 7px", borderRadius: 5, cursor: "pointer",
                        backgroundColor: "transparent", color: "var(--text-muted)",
                        border: "1px dashed var(--border)", fontWeight: 500,
                        transition: "background-color 0.1s, color 0.1s, border-color 0.1s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderStyle = "solid" }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderStyle = "dashed" }}
                    >+{tag}</button>
                  ))}

                  {/* Custom tag input */}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() } }}
                    placeholder="Add tag…"
                    style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 5,
                      backgroundColor: "var(--bg-input)", border: "1px solid var(--border)",
                      color: "var(--text-primary)", outline: "none", width: 90,
                    }}
                  />
                </div>

                {/* Markdown toolbar */}
                {viewMode !== "preview" && (
                  <div style={{
                    display: "flex", gap: 2, flexWrap: "wrap",
                    borderTop: "1px solid var(--border)",
                    paddingTop: 6, paddingBottom: 6,
                  }}>
                    {TOOLBAR.map((item, i) => {
                      if (item.title === "sep") {
                        return <div key={i} style={{ width: 1, height: 18, backgroundColor: "var(--border)", margin: "0 2px", alignSelf: "center" }} />
                      }
                      return (
                        <ToolbarBtn key={i} title={item.title} onMouseDown={e => { e.preventDefault(); applyToolbar(item) }}>
                          {item.label}
                        </ToolbarBtn>
                      )
                    })}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, color: "var(--text-muted)", alignSelf: "center", paddingRight: 4, whiteSpace: "nowrap" }}>
                      {wordCountInfo.words}w · {wordCountInfo.chars}c · {wordCountInfo.lines}L
                    </span>
                  </div>
                )}
              </div>

              {/* ── Editor / Preview panes ─────────────────────────────────── */}
              <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>

                {/* Edit pane */}
                {(viewMode === "edit" || viewMode === "split") && (
                  <div style={{
                    flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0,
                    borderRight: viewMode === "split" ? "1px solid var(--border)" : "none",
                    overflow: "hidden",
                  }}>
                    {docWidthMode ? (
                      // Doc-width: scrollable wrapper with centered max-width column
                      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                        <div style={{ maxWidth: 760, margin: "0 auto", minHeight: "100%", display: "flex", flexDirection: "column" }}>
                          <textarea
                            ref={textareaRef}
                            value={noteContent}
                            onChange={e => handleContentChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Start writing…"
                            spellCheck
                            style={{
                              flex: 1, width: "100%",
                              resize: "none", border: "none", outline: "none",
                              backgroundColor: "transparent",
                              color: "var(--text-primary)", fontSize: 15, lineHeight: 1.8,
                              padding: "28px 8px",
                              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                              caretColor: "var(--accent, #60a5fa)",
                              minHeight: "100%",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <textarea
                        ref={textareaRef}
                        value={noteContent}
                        onChange={e => handleContentChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Start writing… Lists auto-continue on Enter · Tab for indent · ⌘S to save"
                        spellCheck
                        style={{
                          flex: 1,
                          width: "100%",
                          minHeight: 0,
                          resize: "none", border: "none", outline: "none",
                          backgroundColor: "var(--bg-app)",
                          color: "var(--text-primary)", fontSize: 14, lineHeight: 1.75,
                          padding: "20px 24px",
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                          caretColor: "var(--accent, #60a5fa)",
                          overflowY: "auto",
                          display: "block",
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Preview pane */}
                {(viewMode === "preview" || viewMode === "split") && (
                  <div style={{
                    flex: 1, overflowY: "auto", minWidth: 0,
                    padding: docWidthMode ? "0 24px" : "20px 32px",
                    backgroundColor: viewMode === "split" ? "rgba(0,0,0,0.15)" : "var(--bg-app)",
                  }}>
                    <div style={docWidthMode ? { maxWidth: 760, margin: "0 auto", padding: "28px 0" } : {}}>
                    {noteContent.trim() ? (
                      <>
                        <MarkdownPreview content={noteContent} onWikiLinkClick={handleWikiLinkClick} />
                        <BacklinksSection
                          currentNote={selectedNote}
                          allNotes={noteTasks}
                          onNoteClick={setSelectedNoteId}
                        />
                      </>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 14, fontStyle: "italic" }}>
                        Nothing to preview yet…
                      </p>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── Empty state ─────────────────────────────────────────────── */
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 16,
            }}>
              <div style={{ textAlign: "center" }}>
                <svg style={{ width: 48, height: 48, color: "var(--text-muted)", margin: "0 auto 16px" }}
                  fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 4h16l8 8v28a4 4 0 01-4 4H12a4 4 0 01-4-4V8a4 4 0 014-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M28 4v8h8M16 24h16M16 32h10" />
                </svg>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                  {noteTasks.length === 0 ? "No notes yet" : "Select a note"}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {noteTasks.length === 0
                    ? "Create your first note to get started"
                    : "Pick a note from the sidebar to view or edit it"}
                </p>
              </div>
              {noteTasks.length === 0 && (
                <button
                  onClick={() => { setPendingCategory("General"); setShowCreateDialog(true) }}
                  style={{
                    padding: "9px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                    backgroundColor: "rgba(96,165,250,0.15)", color: "var(--accent, #60a5fa)",
                    border: "1px solid rgba(96,165,250,0.3)", cursor: "pointer",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.25)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.15)")}
                >
                  Create first note
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <CreateNoteDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onConfirm={handleConfirmCreate}
        title="Create New Note"
        defaultCategory={pendingCategory}
        existingCategories={categories}
      />
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel" variant="danger"
      />
      <TextInputDialog
        isOpen={showEditTitleDialog}
        onClose={() => setShowEditTitleDialog(false)}
        onConfirm={confirmEditTitle}
        title="Rename Note"
        label="Note Title"
        placeholder="Enter note title…"
        required
        defaultValue={selectedNote?.title || ""}
      />
      <CategoryEditDialog
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
        categoryName={editingCategory || ""}
      />
      <ConfirmDialog
        isOpen={showDeleteCategoryDialog}
        onClose={() => setShowDeleteCategoryDialog(false)}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message={`Delete "${deletingCategory}" and all its notes? This cannot be undone.`}
        confirmText="Delete" cancelText="Cancel" variant="danger"
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SidebarIconBtn({ title, onClick, children }: {
  title: string; onClick: () => void; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
        backgroundColor: hov ? "rgba(255,255,255,0.08)" : "transparent",
        color: hov ? "var(--text-primary)" : "var(--text-muted)",
        transition: "background-color 0.12s, color 0.12s", flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function HeaderBtn({ title, onClick, disabled, active, danger, children }: {
  title: string; onClick: () => void; disabled?: boolean; active?: boolean; danger?: boolean; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "5px 8px", borderRadius: 7, border: "1px solid",
        cursor: disabled ? "default" : "pointer",
        transition: "background-color 0.12s, color 0.12s, border-color 0.12s, opacity 0.12s",
        opacity: disabled ? 0.35 : 1,
        backgroundColor: active
          ? "rgba(96,165,250,0.15)"
          : hov
            ? danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.07)"
            : "transparent",
        borderColor: active
          ? "rgba(96,165,250,0.3)"
          : hov
            ? danger ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.12)"
            : "var(--border)",
        color: active
          ? "var(--accent, #60a5fa)"
          : hov
            ? danger ? "#ef4444" : "var(--text-primary)"
            : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  )
}

function ViewToggleBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer",
        transition: "background-color 0.1s, color 0.1s",
        backgroundColor: active ? "rgba(255,255,255,0.1)" : hov ? "rgba(255,255,255,0.05)" : "transparent",
        color: active ? "var(--text-primary)" : hov ? "var(--text-secondary)" : "var(--text-muted)",
        fontSize: 11, fontWeight: active ? 600 : 500,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {children}
    </button>
  )
}

function ToolbarBtn({ title, onMouseDown, children }: {
  title: string; onMouseDown: (e: React.MouseEvent) => void; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "2px 7px", borderRadius: 5, border: "1px solid",
        cursor: "pointer",
        transition: "background-color 0.1s, color 0.1s, border-color 0.1s",
        backgroundColor: hov ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
        borderColor: hov ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)",
        color: hov ? "var(--text-primary)" : "var(--text-muted)",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  )
}