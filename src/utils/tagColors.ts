export function tagColorClasses(tag: string) {
  let h = 0
  for (let i = 0; i < tag.length; i++) h = tag.charCodeAt(i) + ((h << 5) - h)
  const palettes = [
    { bg: "bg-sky-500/15",     border: "border-sky-500/30",     text: "text-sky-400"     },
    { bg: "bg-violet-500/15",  border: "border-violet-500/30",  text: "text-violet-400"  },
    { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400" },
    { bg: "bg-amber-500/15",   border: "border-amber-500/30",   text: "text-amber-400"   },
    { bg: "bg-rose-500/15",    border: "border-rose-500/30",    text: "text-rose-400"    },
    { bg: "bg-pink-500/15",    border: "border-pink-500/30",    text: "text-pink-400"    },
    { bg: "bg-orange-500/15",  border: "border-orange-500/30",  text: "text-orange-400"  },
    { bg: "bg-teal-500/15",    border: "border-teal-500/30",    text: "text-teal-400"    },
  ]
  return palettes[Math.abs(h) % palettes.length]
}