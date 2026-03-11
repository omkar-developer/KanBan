/**
 * MarkdownPreview.tsx
 *
 * Standalone, reusable Markdown renderer.
 *
 * Features
 * ────────
 * • Full GFM (tables, task lists, strikethrough, autolinks)   — remark-gfm
 * • LaTeX math — inline $…$ and block $$…$$                   — remark-math + rehype-katex
 * • Syntax-highlighted code blocks (zero external deps)
 * • Mermaid diagram rendering (graceful fallback if not installed)
 * • [[Wiki link]] support via onWikiLinkClick callback
 * • Dark-theme CSS vars (--text-primary, --text-secondary, --accent, --border)
 *
 * Required peer deps (add if not already present):
 *   npm install react-markdown remark-gfm remark-math rehype-katex katex
 *
 * Optional:
 *   npm install mermaid   (diagrams will gracefully degrade without it)
 *
 * Usage:
 *   import MarkdownPreview from "@/components/notes/MarkdownPreview"
 *
 *   <MarkdownPreview
 *     content={markdownString}
 *     onWikiLinkClick={(title) => navigateTo(title)}
 *   />
 *
 * The KaTeX stylesheet must be loaded once in your app:
 *   import "katex/dist/katex.min.css"
 *   — or add to your global CSS:
 *   @import "katex/dist/katex.min.css";
 */

import { useMemo, useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"

// ─────────────────────────────────────────────────────────────────────────────
// Syntax highlighter — zero deps, covers JS/TS/Python/Go/Rust/CSS/HTML/JSON/SQL/Bash
// ─────────────────────────────────────────────────────────────────────────────

type TT = "kw"|"str"|"cmt"|"num"|"op"|"fn"|"ty"|"tag"|"attr"|"pct"|"bi"|"pl"
const TC: Record<TT, string> = {
  kw:   "#c792ea", str: "#c3e88d", cmt: "#546e7a", num: "#f78c6c",
  op:   "#89ddff", fn:  "#82aaff", ty:  "#ffcb6b", tag: "#f07178",
  attr: "#c792ea", pct: "#89ddff", bi:  "#80cbc4", pl:  "#e4e4e7",
}

const KW: Record<string, string[]> = {
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

function tokenize(code: string, lang: string): Array<{ t: TT; v: string }> {
  const l = lang.toLowerCase()
  const langKey =
    l === "typescript" || l === "tsx" ? "ts" :
    l === "javascript" || l === "jsx" ? "js" :
    l === "python"                    ? "py" :
    l === "shell"      || l === "sh"  ? "bash" : l
  const kws = new Set(KW[langKey] || [])

  // HTML/XML
  if (l === "html" || l === "xml") {
    const toks: Array<{ t: TT; v: string }> = []
    const re = /(<\/?[a-zA-Z][^>]*\/?>|<!--[\s\S]*?-->|"[^"]*"|'[^']*')/g
    let last = 0, m
    while ((m = re.exec(code))) {
      if (m.index > last) toks.push({ t: "pl", v: code.slice(last, m.index) })
      const s = m[0]
      if (s.startsWith("<!--")) toks.push({ t: "cmt", v: s })
      else if (s.startsWith("<")) toks.push({ t: "tag", v: s })
      else toks.push({ t: "str", v: s })
      last = m.index + s.length
    }
    if (last < code.length) toks.push({ t: "pl", v: code.slice(last) })
    return toks
  }

  // CSS
  if (l === "css" || l === "scss" || l === "less") {
    const toks: Array<{ t: TT; v: string }> = []
    const re = /(\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|#[0-9a-fA-F]{3,8}\b|\b\d+\.?\d*(?:px|em|rem|vh|vw|%|s|ms|deg)?\b|[a-zA-Z-]+(?=\s*:)|[:;{}(),])/g
    let last = 0, m
    while ((m = re.exec(code))) {
      if (m.index > last) toks.push({ t: "pl", v: code.slice(last, m.index) })
      const s = m[0]
      if      (s.startsWith("/*"))  toks.push({ t: "cmt",  v: s })
      else if (s.startsWith('"') || s.startsWith("'")) toks.push({ t: "str", v: s })
      else if (s.startsWith("#"))   toks.push({ t: "num",  v: s })
      else if (/^\d/.test(s))       toks.push({ t: "num",  v: s })
      else if (/^[a-zA-Z-]+$/.test(s)) toks.push({ t: "attr", v: s })
      else toks.push({ t: "pct", v: s })
      last = m.index + s.length
    }
    if (last < code.length) toks.push({ t: "pl", v: code.slice(last) })
    return toks
  }

  // JSON
  if (l === "json") {
    const toks: Array<{ t: TT; v: string }> = []
    const re = /("(?:[^"\\]|\\.)*"\s*(?=:))|("(?:[^"\\]|\\.)*")|(true|false|null)|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|([{}[\]:,])/g
    let last = 0, m
    while ((m = re.exec(code))) {
      if (m.index > last) toks.push({ t: "pl", v: code.slice(last, m.index) })
      if      (m[1]) toks.push({ t: "attr", v: m[1] })
      else if (m[2]) toks.push({ t: "str",  v: m[2] })
      else if (m[3]) toks.push({ t: "kw",   v: m[3] })
      else if (m[4]) toks.push({ t: "num",  v: m[4] })
      else           toks.push({ t: "pct",  v: m[0] })
      last = m.index + m[0].length
    }
    if (last < code.length) toks.push({ t: "pl", v: code.slice(last) })
    return toks
  }

  // General: JS/TS/Python/Go/Rust/SQL/Bash
  const toks: Array<{ t: TT; v: string }> = []
  const patterns: Array<[TT, RegExp]> = [
    ["cmt", /^(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*(?:(?!bash))|--[^\n]*)/],
    ["str", /^("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/],
    ["num", /^-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/],
  ]
  let pos = 0
  while (pos < code.length) {
    if (/[ \t\n\r]/.test(code[pos])) {
      let j = pos
      while (j < code.length && /[ \t\n\r]/.test(code[j])) j++
      toks.push({ t: "pl", v: code.slice(pos, j) }); pos = j; continue
    }
    let hit = false
    for (const [type, re] of patterns) {
      const m = code.slice(pos).match(re)
      if (m) { toks.push({ t: type, v: m[0] }); pos += m[0].length; hit = true; break }
    }
    if (hit) continue
    const idm = code.slice(pos).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
    if (idm) {
      const w = idm[0]
      const isCall = code.slice(pos + w.length).match(/^\s*\(/)
      const isType = /^[A-Z]/.test(w)
      if      (kws.has(w))    toks.push({ t: "kw", v: w })
      else if (BUILTINS.has(w)) toks.push({ t: "bi", v: w })
      else if (isCall)        toks.push({ t: "fn", v: w })
      else if (isType)        toks.push({ t: "ty", v: w })
      else                    toks.push({ t: "pl", v: w })
      pos += w.length; continue
    }
    const opm = code.slice(pos).match(/^(=>|\.\.\.|\?\?|[+\-*/%=!<>&|^~?]+)/)
    if (opm) { toks.push({ t: "op", v: opm[0] }); pos += opm[0].length; continue }
    const pctm = code.slice(pos).match(/^[{}[\]();,.:@]/)
    if (pctm) { toks.push({ t: "pct", v: pctm[0] }); pos += pctm[0].length; continue }
    toks.push({ t: "pl", v: code[pos] }); pos++
  }
  return toks
}

function SyntaxCode({ code, lang }: { code: string; lang: string }) {
  const tokens = useMemo(() => tokenize(code, lang), [code, lang])
  return (
    <code style={{ color: TC.pl, background: "none", border: "none", padding: 0, fontSize: "inherit", fontFamily: "inherit" }}>
      {tokens.map((tok, i) => <span key={i} style={{ color: TC[tok.t] }}>{tok.v}</span>)}
    </code>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mermaid renderer — dynamic import, graceful fallback
// ─────────────────────────────────────────────────────────────────────────────

function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg]   = useState<string | null>(null)
  const [err, setErr]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mermaid = (await import("mermaid" as unknown)).default as typeof import("mermaid").default
        mermaid.initialize({
          startOnLoad: false, theme: "dark", darkMode: true,
          themeVariables: {
            background: "transparent", primaryColor: "#3b82f6",
            primaryTextColor: "#e4e4e7", lineColor: "#52525b", edgeLabelBackground: "#1c1c1c",
          },
        })
        const id = "mmd-" + Math.random().toString(36).slice(2)
        const { svg: rendered } = await mermaid.render(id, code)
        if (!cancelled) setSvg(rendered)
      } catch (e: unknown) {
        if (!cancelled) setErr((e as { message?: string })?.message || "Mermaid not available. Run: npm install mermaid")
      }
    })()
    return () => { cancelled = true }
  }, [code])

  if (err) return (
    <div style={{ border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, backgroundColor: "rgba(239,68,68,0.06)", padding: "10px 14px", marginBottom: 14 }}>
      <p style={{ fontSize: 11, color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>Mermaid error</p>
      <pre style={{ fontSize: 12, color: "#a1a1aa", margin: 0, whiteSpace: "pre-wrap" }}>{err}</pre>
      <pre style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 8, padding: "8px 10px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 6 }}>{code}</pre>
    </div>
  )
  if (!svg) return (
    <div style={{ backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "20px 16px", marginBottom: 14, textAlign: "center", border: "1px solid var(--border)" }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Rendering diagram…</span>
    </div>
  )
  return <div style={{ marginBottom: 14, display: "flex", justifyContent: "center", overflowX: "auto" }} dangerouslySetInnerHTML={{ __html: svg }} />
}

// ─────────────────────────────────────────────────────────────────────────────
// Wiki-link pre-processor
// ─────────────────────────────────────────────────────────────────────────────

function processWikiLinks(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, (_match, title) =>
    `[${title}](wiki:${encodeURIComponent(title)})`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MarkdownPreview — public API
// ─────────────────────────────────────────────────────────────────────────────

export interface MarkdownPreviewProps {
  /** Raw markdown string to render */
  content: string
  /**
   * Called when a [[Wiki Link]] is clicked.
   * Receives the raw link title (decoded).
   */
  onWikiLinkClick?: (title: string) => void
}

export default function MarkdownPreview({ content, onWikiLinkClick }: MarkdownPreviewProps) {
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
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // ── Headings ────────────────────────────────────────────────────────
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

          // ── Paragraphs ──────────────────────────────────────────────────────
          p: ({ children }) => (
            <p style={{ marginTop: 0, marginBottom: 14, color: "var(--text-primary)" }}>{children}</p>
          ),

          // ── Links — handle wiki: scheme ─────────────────────────────────────
          a: ({ href, children }) => {
            if (href?.startsWith("wiki:")) {
              const title = decodeURIComponent(href.slice(5))
              return (
                <button
                  onClick={() => onWikiLinkClick?.(title)}
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

          // ── Lists ───────────────────────────────────────────────────────────
          ul: ({ children }) => (
            <ul style={{ paddingLeft: 20, marginBottom: 14, listStyleType: "disc" }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: 20, marginBottom: 14, listStyleType: "decimal" }}>{children}</ol>
          ),
          li: ({ children, ...props }) => {
            const isTask = (props as Record<string, unknown>).className === "task-list-item"
            return (
              <li style={{
                marginBottom: 4,
                color: "var(--text-primary)",
                listStyleType: isTask ? "none" : undefined,
                marginLeft:    isTask ? -4    : undefined,
              }}>
                {children}
              </li>
            )
          },
          input: ({ type, checked }: { type?: string; checked?: boolean }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  style={{ marginRight: 6, accentColor: "var(--accent, #60a5fa)", cursor: "default" }}
                />
              )
            }
            return null
          },

          // ── Blockquote ──────────────────────────────────────────────────────
          blockquote: ({ children }) => (
            <blockquote style={{
              borderLeft: "3px solid var(--accent, #60a5fa)",
              marginLeft: 0, marginBottom: 14,
              color: "var(--text-secondary)",
              backgroundColor: "rgba(96,165,250,0.05)",
              borderRadius: "0 6px 6px 0",
              padding: "8px 16px",
            }}>
              {children}
            </blockquote>
          ),

          // ── Code — inline, block, mermaid, latex ────────────────────────────
          code: ({ inline, children, className }: { inline?: boolean; children?: React.ReactNode; className?: string }) => {
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

            // LaTeX code block (```latex or ```math)
            // remark-math handles $…$ / $$…$$ automatically; this handles
            // explicit ```latex fences as a convenience fallback.
            if (lang === "latex" || lang === "math") {
              return (
                <div
                  style={{ overflowX: "auto", marginBottom: 16, padding: "12px 16px", backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      try {
                        // eslint-disable-next-line @typescript-eslint/no-require-imports
                        const katex = require("katex") as typeof import("katex")
                        return katex.renderToString(code, { displayMode: true, throwOnError: false })
                      } catch {
                        return `<span style="color:#ef4444;font-size:12px">KaTeX not available. Run: npm install katex</span>`
                      }
                    })(),
                  }}
                />
              )
            }

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

          // ── Tables ──────────────────────────────────────────────────────────
          table: ({ children }) => (
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
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
            <td style={{ padding: "8px 12px", color: "var(--text-primary)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr
              style={{ transition: "background-color 0.1s" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              {children}
            </tr>
          ),

          // ── Horizontal rule ─────────────────────────────────────────────────
          hr: () => (
            <div style={{
              display: "block", height: 1,
              backgroundColor: "rgba(255,255,255,0.12)",
              border: "none", margin: "28px 0",
            }} />
          ),

          // ── Inline text decoration ──────────────────────────────────────────
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700, color: "var(--text-primary)" }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: "italic", color: "var(--text-secondary)" }}>{children}</em>
          ),

          // ── Images ──────────────────────────────────────────────────────────
          img: ({ src, alt }) => (
            <img src={src} alt={alt}
              style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border)", margin: "8px 0" }}
            />
          ),
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}