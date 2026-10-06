import { useEffect, useId, useRef, useState } from "react";
import { ReadingText } from "./ReadingText";
import { customTermPattern, decodeTerm, encodeTerm, findGlossaryEntry } from "./glossary";

export function WritingField({ value, onChange, index, article }: {
  value: string;
  onChange: (text: string) => void;
  index: number;
  article: boolean;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const [preview, setPreview] = useState(false);
  const termInput = useRef<HTMLInputElement>(null);
  const [termDraft, setTermDraft] = useState<{ start: number; end: number; label: string; definition: string } | null>(null);
  const addingTerm = Boolean(termDraft);
  useEffect(() => { if (addingTerm) termInput.current?.focus(); }, [addingTerm]);

  function openTerm() {
    const input = field.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const existing = [...value.matchAll(customTermPattern)].find((match) => start >= match.index && end <= match.index + match[0].length);
    const selected = value.slice(start, end);
    const label = existing ? decodeTerm(existing[1]) : selected.trim();
    // Word selection often includes a following space. Replace only the word,
    // keeping its surrounding spaces and paragraph breaks in the article.
    const wordStart = start + selected.length - selected.trimStart().length;
    const wordEnd = label ? end - (selected.length - selected.trimEnd().length) : wordStart;
    setTermDraft({ start: existing?.index ?? wordStart, end: existing ? existing.index + existing[0].length : wordEnd,
      label, definition: existing ? decodeTerm(existing[2]) : findGlossaryEntry(label)?.definition ?? "" });
  }

  function finishTerm(insert: boolean) {
    if (!termDraft) return;
    const replacement = encodeTerm(termDraft.label, termDraft.definition);
    if (insert) onChange(value.slice(0, termDraft.start) + replacement + value.slice(termDraft.end));
    const caret = insert ? termDraft.start + replacement.length : termDraft.end;
    setTermDraft(null);
    requestAnimationFrame(() => { field.current?.focus(); field.current?.setSelectionRange(caret, caret); });
  }

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
        <button type="button" className="text-button" disabled={addingTerm} aria-pressed={preview} aria-controls={`${id}-content`} onClick={() => setPreview(!preview)}>
          {preview ? "Редактирай текста" : "Преглед"}
        </button>
      </div>
      <div id={`${id}-content`}>
        {!preview ? <>
          <div className="formatting-controls" role="group" aria-label={`Форматиране на част ${index + 1}`}>
            <button type="button" disabled={addingTerm} onClick={() => format("bold")}><strong>Удебелен</strong></button>
            <button type="button" disabled={addingTerm} onClick={() => format("italic")}><em>Курсив</em></button>
            <button type="button" disabled={addingTerm} onClick={() => format("list")}>Списък</button>
            <button type="button" disabled={addingTerm} onClick={() => format("quote")}>Цитат</button>
            <button type="button" aria-expanded={addingTerm} aria-controls={`${id}-term-editor`} onClick={() => addingTerm ? finishTerm(false) : openTerm()}>Термин</button>
          </div>
          {termDraft && <div className="term-editor" id={`${id}-term-editor`} role="group" aria-label="Пояснение на термин"
            onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finishTerm(false); }
              else if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); } }}>
            <label htmlFor={`${id}-term`}>Дума или израз</label>
            <input ref={termInput} id={`${id}-term`} value={termDraft.label} maxLength={100}
              onChange={(event) => setTermDraft({ ...termDraft, label: event.target.value })} placeholder="Например: аминокиселини" />
            <label htmlFor={`${id}-definition`}>Кратко обяснение</label>
            <textarea id={`${id}-definition`} rows={3} maxLength={500} value={termDraft.definition}
              onChange={(event) => setTermDraft({ ...termDraft, definition: event.target.value })} placeholder="Обясни с прости думи, в едно-две изречения." />
            <div className="term-editor-actions">
              <button type="button" className="button" disabled={!termDraft.label.trim() || !termDraft.definition.trim()} onClick={() => finishTerm(true)}>Добави пояснение</button>
              <button type="button" className="text-button" onClick={() => finishTerm(false)}>Отказ</button>
            </div>
          </div>}
          <textarea id={id} ref={field} rows={7} value={value} readOnly={addingTerm} onChange={(event) => onChange(event.target.value)} aria-describedby={`${id}-help`}
            placeholder={article ? "Започни с това, което искаш да споделиш…" : "Какво ми беше в главата…"} />
          <p id={`${id}-help`} className="field-help writing-help">Маркирай текст и избери стил. {article ? "Нов ред започва нов абзац." : "Празен ред започва нов абзац."}</p>
          <p className="field-help writing-help">Познатите термини получават пояснение автоматично. За свое обяснение маркирай думата и избери „Термин“. Провери го в „Преглед“.</p>
        </> : <div className="writing-preview day-story" role="region" aria-label={`Преглед на част ${index + 1}`}>
          {value.trim() ? <ReadingText text={value} article={article} /> : <p className="field-help">Добави текст, за да видиш как ще изглежда.</p>}
        </div>}
      </div>
    </div>
  );
}
