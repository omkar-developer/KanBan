import { useMemo } from "react";
import type { Task } from "../../models/Task";
import { findBacklinks } from "../../utils/wikiLinks";
import "./BacklinksSection.css";

interface BacklinksSectionProps {
  currentNote: Task;
  allNotes: Task[];
  onNoteClick?: (noteId: string) => void;
}

export default function BacklinksSection({
  currentNote,
  allNotes,
  onNoteClick,
}: BacklinksSectionProps) {
  // Find all notes that reference this note
  const backlinks = useMemo(() => {
    const noteData = allNotes.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
    }));
    return findBacklinks(currentNote.title, noteData);
  }, [currentNote, allNotes]);

  if (backlinks.length === 0) {
    return null;
  }

  return (
    <div className="backlinks-section">
      <div className="backlinks-header">
        <h3 className="backlinks-title">Backlinks</h3>
        <span className="backlinks-count">{backlinks.length}</span>
      </div>

      <div className="backlinks-list">
        {backlinks.map((backlink) => (
          <button
            key={backlink.id}
            onClick={() => onNoteClick?.(backlink.id)}
            className="backlink-item"
            title={`Open: ${backlink.title}`}
          >
            <span className="backlink-icon">←</span>
            <span className="backlink-title">{backlink.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
