import { Fragment } from "react";
import type { ReactNode } from "react";

// A deliberately small writing format. React escapes all text; authored HTML
// is never executed, and only http(s) links are made clickable.
function inline(text: string, depth = 0): ReactNode {
  if (depth > 4) return text;
  const pattern = /\*\*(.+?)\*\*|\*([^*\n]+)\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const result: ReactNode[] = [];
  let end = 0;
  for (const match of text.matchAll(pattern)) {
    result.push(text.slice(end, match.index));
    const key = match.index;
    if (match[1]) result.push(<strong key={key}>{inline(match[1], depth + 1)}</strong>);
    else if (match[2]) result.push(<em key={key}>{match[2]}</em>);
    else result.push(<a key={key} href={match[4]}>{match[3]}</a>);
    end = match.index! + match[0].length;
  }
  result.push(text.slice(end));
  return result;
}

function paragraph(text: string, definitions: boolean): ReactNode {
  // Existing plain-text definitions ("Term — explanation") gain emphasis
  // without rewriting stored entries or maintaining a topic-specific word list.
  const definition = definitions && text.match(/^([\p{L}\p{N}][\p{L}\p{N} ,–-]{0,48}) (—|–) (.+)$/u);
  if (definition && definition[1].trim().split(/\s+/).length <= 5)
    return <><strong>{definition[1]}</strong> {definition[2]} {inline(definition[3])}</>;
  return inline(text);
}

export function ReadingText({ text, article = false }: { text: string; article?: boolean }) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let buffer: string[] = [];
  const flush = () => {
    if (!buffer.length) return;
    blocks.push(<p key={`p-${blocks.length}`}>{buffer.map((line, index) => (
      <Fragment key={index}>{index > 0 && <br />}{paragraph(line, article)}</Fragment>
    ))}</p>);
    buffer = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flush(); continue; }
    const list = line.match(/^(?:([-*])|([0-9]+)[.)])\s+(.+)$/);
    if (list) {
      flush();
      const ordered = Boolean(list[2]);
      const items: ReactNode[] = [];
      let j = i;
      for (; j < lines.length; j++) {
        const item = lines[j].trim().match(/^(?:([-*])|([0-9]+)[.)])\s+(.+)$/);
        if (!item || Boolean(item[2]) !== ordered) break;
        items.push(<li key={j}>{paragraph(item[3], article)}</li>);
      }
      blocks.push(ordered
        ? <ol key={`list-${i}`} start={Number(list[2])}>{items}</ol>
        : <ul key={`list-${i}`}>{items}</ul>);
      i = j - 1;
    } else if (line.startsWith("> ")) {
      flush();
      const quoted: ReactNode[] = [];
      let j = i;
      for (; j < lines.length && lines[j].trim().startsWith("> "); j++)
        quoted.push(<p key={j}>{inline(lines[j].trim().slice(2))}</p>);
      blocks.push(<blockquote key={`quote-${i}`}>{quoted}</blockquote>);
      i = j - 1;
    } else {
      buffer.push(line);
      if (article) flush();
    }
  }
  flush();
  return <div className="reading-text">{blocks}</div>;
}

export function readingMinutes(sections: { body: string }[]) {
  const words = sections.map((section) => section.body).join(" ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
