/**
 * MarkdownPreview.tsx  — v4
 *
 * Features
 * ────────
 * • GFM (tables, task lists, strikethrough, autolinks)   remark-gfm
 * • Footnotes                                             remark-footnotes
 * • Frontmatter stripping (YAML / TOML)                  regex
 * • LaTeX inline $…$ and block $$…$$                     remark-math + rehype-katex
 * • Syntax highlighting via Shiki — dual theme (dark + light, switches automatically)
 *   Falls back to zero-dep highlighter if Shiki isn't installed
 * • Copy button on every code block
 * • Mermaid diagrams (graceful fallback if not installed)
 * • [[Wiki link]] navigation via onWikiLinkClick
 * • Heading anchors — hover to reveal #
 * • <details>/<summary>
 * • Image captions via title attribute
 * • External links via Tauri shell plugin (falls back to window.open)
 *
 * Required deps:
 *   npm install react-markdown remark-gfm remark-math remark-footnotes \
 *               rehype-katex rehype-slug rehype-raw katex
 *
 * For Tauri links (recommended):
 *   npm install @tauri-apps/plugin-shell
 *   # add "shell" to plugins in tauri.conf.json
 *
 * Optional:
 *   npm install shiki      (falls back silently without it)
 *   npm install mermaid    (falls back silently without it)
 *
 * CSS: @import "katex/dist/katex.min.css";
 */

import { useMemo, useState, useEffect, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import remarkFootnotes from "remark-footnotes"
import rehypeKatex from "rehype-katex"
import rehypeSlug from "rehype-slug"
import rehypeRaw from "rehype-raw"

// ─────────────────────────────────────────────────────────────────────────────
// Theme detection — watches prefers-color-scheme AND a data-theme attribute
// on <html> so it syncs with manual theme toggles in the app.
// ─────────────────────────────────────────────────────────────────────────────

function useIsDark(): boolean {
  const get = () => {
    const attr = document.documentElement.getAttribute("data-theme")
      ?? document.documentElement.getAttribute("class")
    if (attr?.includes("dark"))  return true
    if (attr?.includes("light")) return false
    return window.matchMedia("(prefers-color-scheme: dark)").matches
  }
  const [dark, setDark] = useState(get)

  useEffect(() => {
    // Watch media query
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onMq = () => setDark(get())
    mq.addEventListener("change", onMq)

    // Watch data-theme / class mutations on <html>
    const obs = new MutationObserver(() => setDark(get()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] })

    return () => { mq.removeEventListener("change", onMq); obs.disconnect() }
  }, [])

  return dark
}

// ─────────────────────────────────────────────────────────────────────────────
// Shiki — singleton per theme, lazy-loaded
// ─────────────────────────────────────────────────────────────────────────────

type ShikiHL = { codeToHtml: (code: string, opts: { lang: string; theme: string }) => string }

const _shikiCache: Record<string, ShikiHL | null> = {}
const _shikiLoading: Record<string, boolean> = {}
const _shikiCbs: Record<string, Array<() => void>> = {}

async function getShiki(theme: string): Promise<ShikiHL | null> {
  if (_shikiCache[theme] !== undefined) return _shikiCache[theme]
  if (_shikiLoading[theme]) return new Promise(res => (_shikiCbs[theme] ??= []).push(() => res(_shikiCache[theme])))
  _shikiLoading[theme] = true
  try {
    const m = await import("shiki") as unknown as {
      getHighlighter: (o: { theme: string; langs: string[] }) => Promise<ShikiHL>
    }
    _shikiCache[theme] = await m.getHighlighter({
      theme,
      langs: [
        "javascript","typescript","tsx","jsx","python","go","rust",
        "bash","sh","sql","json","html","xml","css","scss","less",
        "markdown","yaml","toml","dockerfile","graphql",
        "swift","kotlin","java","cpp","c","csharp","ruby","php",
      ],
    })
    ;(_shikiCbs[theme] ?? []).forEach(fn => fn())
    _shikiCbs[theme] = []
  } catch {
    _shikiCache[theme] = null
    _shikiLoading[theme] = false
  }
  return _shikiCache[theme]
}

const SHIKI_DARK  = "one-dark-pro"
const SHIKI_LIGHT = "github-light"

// ─────────────────────────────────────────────────────────────────────────────
// Fallback token colours — separate palettes for dark / light
// ─────────────────────────────────────────────────────────────────────────────

type TT = "kw"|"str"|"cmt"|"num"|"op"|"fn"|"ty"|"tag"|"attr"|"pct"|"bi"|"pl"

const TC_DARK: Record<TT,string> = {
  kw:"#c792ea", str:"#c3e88d", cmt:"#546e7a", num:"#f78c6c",
  op:"#89ddff", fn:"#82aaff", ty:"#ffcb6b", tag:"#f07178",
  attr:"#c792ea", pct:"#89ddff", bi:"#80cbc4", pl:"#e4e4e7",
}
// GitHub Light-inspired palette — readable on white
const TC_LIGHT: Record<TT,string> = {
  kw:"#cf222e", str:"#0a3069", cmt:"#6e7781", num:"#0550ae",
  op:"#953800", fn:"#8250df", ty:"#953800", tag:"#116329",
  attr:"#0550ae", pct:"#24292f", bi:"#8250df", pl:"#24292f",
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

function tokenize(code: string, lang: string): Array<{t:TT;v:string}> {
  const l = lang.toLowerCase()
  const lk = l==="typescript"||l==="tsx"?"ts":l==="javascript"||l==="jsx"?"js":l==="python"?"py":l==="shell"||l==="sh"?"bash":l
  const kws = new Set(KW[lk]||[])
  if (l==="html"||l==="xml") {
    const toks:Array<{t:TT;v:string}>=[]
    const re=/(<\/?[a-zA-Z][^>]*\/?>|<!--[\s\S]*?-->|"[^"]*"|'[^']*')/g
    let last=0,m
    while((m=re.exec(code))){if(m.index>last)toks.push({t:"pl",v:code.slice(last,m.index)});const s=m[0];if(s.startsWith("<!--"))toks.push({t:"cmt",v:s});else if(s.startsWith("<"))toks.push({t:"tag",v:s});else toks.push({t:"str",v:s});last=m.index+s.length}
    if(last<code.length)toks.push({t:"pl",v:code.slice(last)});return toks
  }
  if (l==="css"||l==="scss"||l==="less") {
    const toks:Array<{t:TT;v:string}>=[]
    const re=/(\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|#[0-9a-fA-F]{3,8}\b|\b\d+\.?\d*(?:px|em|rem|vh|vw|%|s|ms|deg)?\b|[a-zA-Z-]+(?=\s*:)|[:;{}(),])/g
    let last=0,m
    while((m=re.exec(code))){if(m.index>last)toks.push({t:"pl",v:code.slice(last,m.index)});const s=m[0];if(s.startsWith("/*"))toks.push({t:"cmt",v:s});else if(s.startsWith('"')||s.startsWith("'"))toks.push({t:"str",v:s});else if(s.startsWith("#"))toks.push({t:"num",v:s});else if(/^\d/.test(s))toks.push({t:"num",v:s});else if(/^[a-zA-Z-]+$/.test(s))toks.push({t:"attr",v:s});else toks.push({t:"pct",v:s});last=m.index+s.length}
    if(last<code.length)toks.push({t:"pl",v:code.slice(last)});return toks
  }
  if (l==="json") {
    const toks:Array<{t:TT;v:string}>=[]
    const re=/("(?:[^"\\]|\\.)*"\s*(?=:))|("(?:[^"\\]|\\.)*")|(true|false|null)|(-?\d+\.?\d*(?:[eE][+-]?\d+)?)|([{}[\]:,])/g
    let last=0,m
    while((m=re.exec(code))){if(m.index>last)toks.push({t:"pl",v:code.slice(last,m.index)});if(m[1])toks.push({t:"attr",v:m[1]});else if(m[2])toks.push({t:"str",v:m[2]});else if(m[3])toks.push({t:"kw",v:m[3]});else if(m[4])toks.push({t:"num",v:m[4]});else toks.push({t:"pct",v:m[0]});last=m.index+m[0].length}
    if(last<code.length)toks.push({t:"pl",v:code.slice(last)});return toks
  }
  const toks:Array<{t:TT;v:string}>=[]
  const pats:Array<[TT,RegExp]>=[
    ["cmt",/^(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*)/],
    ["str",/^("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/],
    ["num",/^-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/],
  ]
  let pos=0
  while(pos<code.length){
    if(/[ \t\n\r]/.test(code[pos])){let j=pos;while(j<code.length&&/[ \t\n\r]/.test(code[j]))j++;toks.push({t:"pl",v:code.slice(pos,j)});pos=j;continue}
    let hit=false
    for(const[type,re]of pats){const m=code.slice(pos).match(re);if(m){toks.push({t:type,v:m[0]});pos+=m[0].length;hit=true;break}}
    if(hit)continue
    const idm=code.slice(pos).match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)
    if(idm){const w=idm[0];if(kws.has(w))toks.push({t:"kw",v:w});else if(BUILTINS.has(w))toks.push({t:"bi",v:w});else if(code.slice(pos+w.length).match(/^\s*\(/))toks.push({t:"fn",v:w});else if(/^[A-Z]/.test(w))toks.push({t:"ty",v:w});else toks.push({t:"pl",v:w});pos+=w.length;continue}
    const opm=code.slice(pos).match(/^(=>|\.\.\.|\?\?|[+\-*/%=!<>&|^~?]+)/);if(opm){toks.push({t:"op",v:opm[0]});pos+=opm[0].length;continue}
    const pctm=code.slice(pos).match(/^[{}[\]();,.:@]/);if(pctm){toks.push({t:"pct",v:pctm[0]});pos+=pctm[0].length;continue}
    toks.push({t:"pl",v:code[pos]});pos++
  }
  return toks
}

function FallbackCode({ code, lang, dark }: { code: string; lang: string; dark: boolean }) {
  const tokens = useMemo(()=>tokenize(code,lang),[code,lang])
  const TC = dark ? TC_DARK : TC_LIGHT
  return (
    <code style={{color:TC.pl,background:"none",border:"none",padding:0,fontSize:"inherit",fontFamily:"inherit"}}>
      {tokens.map((tok,i)=><span key={i} style={{color:TC[tok.t]}}>{tok.v}</span>)}
    </code>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CodeBlock — Shiki highlighted, with copy button, theme-aware
// ─────────────────────────────────────────────────────────────────────────────

function CodeBlock({ code, lang, dark }: { code: string; lang: string; dark: boolean }) {
  const [html, setHtml] = useState<string|null>(null)
  const [copied, setCopied] = useState(false)
  const shikiTheme = dark ? SHIKI_DARK : SHIKI_LIGHT

  useEffect(()=>{
    let cancel = false
    const loadShiki = async () => {
      setHtml(null) // reset when theme flips
      const h = await getShiki(shikiTheme)
      if (!h || cancel) return
      try {
        const r = h.codeToHtml(code, { lang: lang||"text", theme: shikiTheme })
        if (!cancel) setHtml(r)
      } catch { /* unknown lang — fallback renders */ }
    }
    loadShiki()
    return ()=>{ cancel=true }
  }, [code, lang, shikiTheme])

  const copy = useCallback(()=>{
    navigator.clipboard.writeText(code).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),1800) })
  },[code])

  // Theme-aware shell colours
  const shellBg     = dark ? "rgba(0,0,0,0.45)"           : "#f6f8fa"
  const shellBorder = dark ? "rgba(255,255,255,0.08)"      : "#d0d7de"
  const langColor   = dark ? "rgba(255,255,255,0.2)"       : "rgba(0,0,0,0.25)"
  const copyBg      = dark ? "rgba(255,255,255,0.06)"      : "rgba(0,0,0,0.04)"
  const copyColor   = dark ? "rgba(255,255,255,0.4)"       : "rgba(0,0,0,0.4)"
  const copyBorder  = dark ? "rgba(255,255,255,0.15)"      : "rgba(0,0,0,0.15)"

  return (
    <div style={{position:"relative",marginBottom:16,borderRadius:10,overflow:"hidden",border:`1px solid ${shellBorder}`,backgroundColor:shellBg}}>
      {lang && (
        <div style={{position:"absolute",top:10,right:68,fontSize:10,fontWeight:600,letterSpacing:"0.07em",color:langColor,textTransform:"uppercase",fontFamily:"'DM Sans',sans-serif",userSelect:"none",pointerEvents:"none",zIndex:2}}>
          {lang}
        </div>
      )}
      <button
        onClick={copy}
        style={{position:"absolute",top:8,right:8,padding:"3px 10px",borderRadius:5,border:`1px solid ${copied?"rgba(134,239,172,0.5)":copyBorder}`,backgroundColor:copied?"rgba(134,239,172,0.15)":copyBg,color:copied?"#4ade80":copyColor,fontSize:10,fontWeight:600,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",transition:"all 0.15s",zIndex:2}}
      >
        {copied ? "✓ Copied" : "Copy"}
      </button>
      {html ? (
        // Shiki output — strip its background so our shell controls it
        <div
          style={{overflowX:"auto",fontSize:13,lineHeight:1.7,padding:"14px 18px",fontFamily:"'JetBrains Mono','Fira Code','Cascadia Code',monospace"}}
          dangerouslySetInnerHTML={{__html: html
            // Remove shiki's inline background declarations
            .replace(/background(?:-color)?:\s*(?:#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)\s*;?/gi, "")
            .replace(/<pre ([^>]*)>/, "<pre $1 style=\"margin:0;padding:0;background:transparent;font-size:inherit;font-family:inherit;line-height:inherit\">")
          }}
        />
      ) : (
        <pre style={{overflowX:"auto",fontSize:13,lineHeight:1.7,margin:0,padding:"14px 18px",fontFamily:"'JetBrains Mono','Fira Code','Cascadia Code',monospace",backgroundColor:"transparent"}}>
          <FallbackCode code={code} lang={lang||"plain"} dark={dark} />
        </pre>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Mermaid
// ─────────────────────────────────────────────────────────────────────────────

function MermaidDiagram({ code, dark }: { code: string; dark: boolean }) {
  const [svg, setSvg] = useState<string|null>(null)
  const [err, setErr] = useState<string|null>(null)
  useEffect(()=>{
    setSvg(null); setErr(null)
    let cancel = false
    ;(async()=>{
      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad:false,
          theme: dark ? "dark" : "default",
          darkMode: dark,
          themeVariables: dark
            ? { background:"transparent", primaryColor:"#3b82f6", primaryTextColor:"#e4e4e7", lineColor:"#52525b", edgeLabelBackground:"#1c1c1c" }
            : { background:"transparent", primaryColor:"#3b82f6", primaryTextColor:"#1e293b", lineColor:"#94a3b8" },
        })
        const id = "mmd-"+Math.random().toString(36).slice(2)
        const { svg: r } = await mermaid.render(id, code)
        if (!cancel) setSvg(r)
      } catch(e:unknown) {
        if (!cancel) setErr((e as {message?:string})?.message||"Mermaid not available")
      }
    })()
    return ()=>{ cancel=true }
  }, [code, dark])

  if (err) return (
    <div style={{border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,backgroundColor:"rgba(239,68,68,0.06)",padding:"10px 14px",marginBottom:14}}>
      <p style={{fontSize:11,color:"#ef4444",fontWeight:600,margin:"0 0 4px"}}>Mermaid error</p>
      <pre style={{fontSize:12,color:"#a1a1aa",margin:0,whiteSpace:"pre-wrap"}}>{err}</pre>
    </div>
  )
  if (!svg) return (
    <div style={{backgroundColor:"rgba(0,0,0,0.1)",borderRadius:8,padding:"20px 16px",marginBottom:14,textAlign:"center",border:"1px solid var(--border)"}}>
      <span style={{fontSize:12,color:"var(--text-muted)"}}>Rendering diagram…</span>
    </div>
  )
  return <div style={{marginBottom:14,display:"flex",justifyContent:"center",overflowX:"auto"}} dangerouslySetInnerHTML={{__html:svg}}/>
}

// ─────────────────────────────────────────────────────────────────────────────
// LatexBlock — explicit ```latex fence
// ─────────────────────────────────────────────────────────────────────────────

function LatexBlock({ code }: { code: string }) {
  const html = useMemo(()=>{
    try {
      // Try window.katex first (loaded via CDN), fallback to dynamic import
      const katexLib = (window as typeof globalThis & { katex?: typeof import("katex") }).katex
      if (!katexLib) return null
      return katexLib.renderToString(code,{displayMode:true,throwOnError:false})
    } catch { return null }
  },[code])
  if (!html) return <pre style={{color:"#ef4444",fontSize:12,padding:"8px 12px",backgroundColor:"rgba(239,68,68,0.06)",borderRadius:8}}>KaTeX not available{"\n"}{code}</pre>
  return <div style={{overflowX:"auto",marginBottom:16,padding:"12px 16px",backgroundColor:"rgba(0,0,0,0.06)",borderRadius:10,border:"1px solid var(--border)"}} dangerouslySetInnerHTML={{__html:html}}/>
}

// ─────────────────────────────────────────────────────────────────────────────
// HeadingAnchor
// ─────────────────────────────────────────────────────────────────────────────

function HeadingAnchor({ id, children }: { id?:string; children:React.ReactNode }) {
  const [hov, setHov] = useState(false)
  if (!id) return <>{children}</>
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:6}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {children}
      <a href={`#${id}`} aria-label="section link" style={{opacity:hov?0.45:0,transition:"opacity 0.15s",color:"var(--accent,#60a5fa)",textDecoration:"none",fontSize:"0.75em",fontWeight:400}}>#</a>
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tauri-aware link opener
// ─────────────────────────────────────────────────────────────────────────────

async function openExternal(url: string): Promise<void> {
  try {
    const { open } = await import("@tauri-apps/plugin-shell")
    await open(url)
  } catch {
    // Dev mode / browser fallback
    window.open(url, "_blank", "noopener,noreferrer")
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Content pre-processor
// ─────────────────────────────────────────────────────────────────────────────

function processContent(text: string): string {
  return text
    .replace(/^---[\s\S]*?---\n?/, "")
    .replace(/^\+\+\+[\s\S]*?\+\+\+\n?/, "")
    .replace(/\[\[([^\]]+)\]\]/g, (_m, title) => `[${title}](wiki:${encodeURIComponent(title)})`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Static plugin arrays — outside component so references never change
// ─────────────────────────────────────────────────────────────────────────────

const REMARK_PLUGINS = [remarkGfm, remarkMath, [remarkFootnotes, { inlineNotes: true }]] as never
const REHYPE_PLUGINS = [rehypeRaw, rehypeKatex, rehypeSlug] as never

// ─────────────────────────────────────────────────────────────────────────────
// MarkdownPreview
// ─────────────────────────────────────────────────────────────────────────────

export interface MarkdownPreviewProps {
  content: string
  onWikiLinkClick?: (title: string) => void
}

export default function MarkdownPreview({ content, onWikiLinkClick }: MarkdownPreviewProps) {
  const dark      = useIsDark()
  const processed = useMemo(()=>processContent(content),[content])

  // Pre-warm both Shiki themes in background
  useEffect(()=>{ getShiki(SHIKI_DARK); getShiki(SHIKI_LIGHT) },[])

  // Theme-derived values for non-code elements
  const inlineCodeBg     = dark ? "rgba(255,255,255,0.08)"  : "rgba(0,0,0,0.06)"
  const inlineCodeBorder = dark ? "rgba(255,255,255,0.12)"  : "rgba(0,0,0,0.12)"
  const inlineCodeColor  = dark ? "#e2b06a"                 : "#b44800"
  const hrColor          = dark ? "rgba(255,255,255,0.12)"  : "rgba(0,0,0,0.1)"
  const tableRowHover    = dark ? "rgba(255,255,255,0.02)"  : "rgba(0,0,0,0.02)"
  const theadBg          = dark ? "rgba(255,255,255,0.04)"  : "rgba(0,0,0,0.03)"
  const tdBorder         = dark ? "rgba(255,255,255,0.04)"  : "rgba(0,0,0,0.06)"
  const detailsBg        = dark ? "rgba(255,255,255,0.02)"  : "rgba(0,0,0,0.02)"
  const mutedColor       = dark ? "#71717a"                 : "#6b7280"

  return (
    <div className="prose-notes" style={{color:"var(--text-primary)",fontFamily:"'DM Sans',sans-serif",fontSize:15,lineHeight:1.75}}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={{

          h1: ({children,id})=>(
            <h1 id={id} style={{fontSize:26,fontWeight:700,marginTop:28,marginBottom:12,color:"var(--text-primary)",borderBottom:"1px solid var(--border)",paddingBottom:8,letterSpacing:"-0.02em"}}>
              <HeadingAnchor id={id}>{children}</HeadingAnchor>
            </h1>
          ),
          h2: ({children,id})=>(
            <h2 id={id} style={{fontSize:20,fontWeight:650,marginTop:24,marginBottom:10,color:"var(--text-primary)",letterSpacing:"-0.015em"}}>
              <HeadingAnchor id={id}>{children}</HeadingAnchor>
            </h2>
          ),
          h3: ({children,id})=>(
            <h3 id={id} style={{fontSize:16,fontWeight:650,marginTop:20,marginBottom:8,color:"var(--text-primary)"}}>
              <HeadingAnchor id={id}>{children}</HeadingAnchor>
            </h3>
          ),
          h4: ({children,id})=>(
            <h4 id={id} style={{fontSize:14,fontWeight:600,marginTop:16,marginBottom:6,color:"var(--text-secondary)"}}>
              <HeadingAnchor id={id}>{children}</HeadingAnchor>
            </h4>
          ),

          p: ({children})=><p style={{marginTop:0,marginBottom:14,color:"var(--text-primary)"}}>{children}</p>,

          // ── Links — Tauri-aware ─────────────────────────────────────────────
          a: ({href,children})=>{
            if (href?.startsWith("wiki:")) {
              const title = decodeURIComponent(href.slice(5))
              return (
                <button onClick={()=>onWikiLinkClick?.(title)} style={{color:"var(--accent,#60a5fa)",textDecoration:"underline",textDecorationStyle:"dotted",background:"none",border:"none",cursor:"pointer",padding:0,font:"inherit"}}>
                  {children}
                </button>
              )
            }
            // Anchor links (#id) are fine as regular hrefs
            if (href?.startsWith("#")) {
              return <a href={href} style={{color:"var(--accent,#60a5fa)",textDecoration:"underline"}}>{children}</a>
            }
            // External links — use Tauri shell when available
            return (
              <a
                href={href}
                style={{color:"var(--accent,#60a5fa)",textDecoration:"underline",cursor:"pointer"}}
                onClick={e=>{ e.preventDefault(); if(href) openExternal(href) }}
              >
                {children}
              </a>
            )
          },

          ul: ({children})=><ul style={{paddingLeft:20,marginBottom:14,listStyleType:"disc"}}>{children}</ul>,
          ol: ({children})=><ol style={{paddingLeft:20,marginBottom:14,listStyleType:"decimal"}}>{children}</ol>,
          li: ({children,...props})=>{
            const isTask=(props as Record<string,unknown>).className==="task-list-item"
            return <li style={{marginBottom:4,color:"var(--text-primary)",listStyleType:isTask?"none":undefined,marginLeft:isTask?-4:undefined}}>{children}</li>
          },
          input: ({type,checked}:{type?:string;checked?:boolean})=>{
            if(type==="checkbox") return <input type="checkbox" checked={checked} readOnly style={{marginRight:6,accentColor:"var(--accent,#60a5fa)",cursor:"default"}}/>
            return null
          },

          blockquote: ({children})=>(
            <blockquote style={{borderLeft:"3px solid var(--accent,#60a5fa)",marginLeft:0,marginBottom:14,color:"var(--text-secondary)",backgroundColor:"rgba(96,165,250,0.06)",borderRadius:"0 6px 6px 0",padding:"8px 16px"}}>
              {children}
            </blockquote>
          ),

          code: ({inline,children,className}:{inline?:boolean;children?:React.ReactNode;className?:string})=>{
            if (inline) return (
              <code style={{backgroundColor:inlineCodeBg,border:`1px solid ${inlineCodeBorder}`,borderRadius:4,padding:"1px 6px",fontSize:"0.87em",fontFamily:"'JetBrains Mono','Fira Code',monospace",color:inlineCodeColor}}>
                {children}
              </code>
            )
            const lang=(className||"").replace("language-","").toLowerCase()
            const code=String(children).replace(/\n$/,"")
            if(lang==="mermaid") return <MermaidDiagram code={code} dark={dark}/>
            if(lang==="latex"||lang==="math") return <LatexBlock code={code}/>
            return <CodeBlock code={code} lang={lang} dark={dark}/>
          },

          table: ({children})=><div style={{overflowX:"auto",marginBottom:16}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}>{children}</table></div>,
          thead: ({children})=><thead style={{backgroundColor:theadBg}}>{children}</thead>,
          th: ({children})=><th style={{padding:"8px 12px",textAlign:"left",color:"var(--text-secondary)",fontWeight:600,fontSize:12,textTransform:"uppercase",letterSpacing:"0.05em",borderBottom:"1px solid var(--border)"}}>{children}</th>,
          td: ({children})=><td style={{padding:"8px 12px",color:"var(--text-primary)",borderBottom:`1px solid ${tdBorder}`}}>{children}</td>,
          tr: ({children})=>(
            <tr style={{transition:"background-color 0.1s"}}
              onMouseEnter={e=>(e.currentTarget.style.backgroundColor=tableRowHover)}
              onMouseLeave={e=>(e.currentTarget.style.backgroundColor="transparent")}>
              {children}
            </tr>
          ),

          hr: ()=><div style={{display:"block",height:1,backgroundColor:hrColor,border:"none",margin:"28px 0"}}/>,

          strong: ({children})=><strong style={{fontWeight:700,color:"var(--text-primary)"}}>{children}</strong>,
          em:     ({children})=><em style={{fontStyle:"italic",color:"var(--text-secondary)"}}>{children}</em>,
          del:    ({children})=><del style={{textDecoration:"line-through",color:mutedColor}}>{children}</del>,

          img: ({src,alt,title})=>(
            <figure style={{margin:"12px 0",padding:0}}>
              <img src={src} alt={alt} loading="lazy" style={{maxWidth:"100%",borderRadius:8,border:"1px solid var(--border)",display:"block"}}/>
              {title&&<figcaption style={{marginTop:6,fontSize:12,color:mutedColor,textAlign:"center",fontStyle:"italic"}}>{title}</figcaption>}
            </figure>
          ),

          details: ({children,...props})=>(
            <details {...props as React.HTMLAttributes<HTMLElement>} style={{border:"1px solid var(--border)",borderRadius:8,padding:"8px 14px",marginBottom:14,backgroundColor:detailsBg}}>
              {children}
            </details>
          ),
          summary: ({children})=>(
            <summary style={{cursor:"pointer",fontWeight:600,color:"var(--text-primary)",userSelect:"none",listStyle:"none",display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:10,opacity:0.4}}>▶</span>{children}
            </summary>
          ),

          section: ({children,...props})=>{
            const cls=(props as Record<string,unknown>).className as string|undefined
            if(cls?.includes("footnotes")) return (
              <section style={{marginTop:40,paddingTop:16,borderTop:"1px solid var(--border)",fontSize:13,color:"var(--text-secondary)"}}>
                <p style={{fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,color:mutedColor}}>Footnotes</p>
                {children}
              </section>
            )
            return <section {...props as React.HTMLAttributes<HTMLElement>}>{children}</section>
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}