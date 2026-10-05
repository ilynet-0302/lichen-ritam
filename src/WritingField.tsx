import { useId, useRef, useState } from "react";
import { ReadingText } from "./ReadingText";

export function WritingField({ value, onChange, index, article }: {
  value: string;
  onChange: (text: string) => void;
  index: number;
  article: boolean;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const [preview, setPreview] = useState(false);

  function format(kind: "bold" | "italic" | "list" | "quote") {
    const input = field.current;
    if (!input) return;
    let start = input.selectionStart;
    let end = input.selectionEnd;
    const block = kind === "list" || kind === "quote";
    if (block) {
      start = value.lastIndexOf("\n", start - 1) + 1;
      const next = value.indexOf("\n", end);
      end = next === -1 ? value.length : next;
    }
    const selected = value.slice(start, end);
    const marker = kind === "bold" ? "**" : "*";
    const replacement = block
      ? (selected || (kind === "list" ? "Елемент" : "Цитат")).split("\n").map((line) => `${kind === "list" ? "- " : "> "}${line}`).join("\n")
      : `${marker}${selected || "текст"}${marker}`;
    onChange(value.slice(0, start) + replacement + value.slice(end));
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + (block ? 0 : marker.length), start + replacement.length - (block ? 0 : marker.length));
    });
  }

  return (
    <div className="writing-field">
      <div className="writing-field-label">
        <label htmlFor={id}>Текст на част {index + 1}</label>
        <button type="button" className="text-button" aria-pressed={preview} aria-controls={`${id}-content`} onClick={() => setPreview(!preview)}>
          {preview ? "Редактирай текста" : "Преглед"}
        </button>
      </div>
      <div id={`${id}-content`}>
        {!preview ? <>
          <div className="formatting-controls" role="group" aria-label={`Форматиране на част ${index + 1}`}>
            <button type="button" onClick={() => format("bold")}><strong>Удебелен</strong></button>
            <button type="button" onClick={() => format("italic")}><em>Курсив</em></button>
            <button type="button" onClick={() => format("list")}>Списък</button>
            <button type="button" onClick={() => format("quote")}>Цитат</button>
          </div>
          <textarea id={id} ref={field} rows={7} value={value} onChange={(event) => onChange(event.target.value)} aria-describedby={`${id}-help`}
            placeholder={article ? "Започни с това, което искаш да споделиш…" : "Какво ми беше в главата…"} />
          <p id={`${id}-help`} className="field-help writing-help">Маркирай текст и избери стил. {article ? "Нов ред започва нов абзац." : "Празен ред започва нов абзац."}</p>
        </> : <div className="writing-preview day-story" role="region" aria-label={`Преглед на част ${index + 1}`}>
          {value.trim() ? <ReadingText text={value} article={article} /> : <p className="field-help">Добави текст, за да видиш как ще изглежда.</p>}
        </div>}
      </div>
    </div>
  );
}
