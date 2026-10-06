import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const openedEvent = "journal-term-opened";

export function Term({ label, title = label, definition }: { label: string; title?: string; definition: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pinned = useRef(false);
  const focusOnOpen = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const clearTimer = () => { clearTimeout(timer.current); };
  const close = () => { clearTimer(); pinned.current = false; focusOnOpen.current = false; setOpen(false); setPosition(null); };
  const leave = () => {
    clearTimer();
    if (!pinned.current) timer.current = setTimeout(close, 200);
  };

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (open && position && focusOnOpen.current) {
      closeButton.current?.focus();
      focusOnOpen.current = false;
    }
  }, [open, position]);
  useLayoutEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent(openedEvent, { detail: id }));
    const positionPanel = () => {
      const anchor = trigger.current?.getBoundingClientRect();
      if (!anchor || !panel.current) return;
      const viewport = window.visualViewport;
      const leftEdge = viewport?.offsetLeft ?? 0;
      const topEdge = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      panel.current.style.maxWidth = `${Math.max(1, width - 24)}px`;
      panel.current.style.maxHeight = `${Math.max(1, height - 24)}px`;
      const box = panel.current.getBoundingClientRect();
      if (anchor.bottom < topEdge || anchor.top > topEdge + height) { close(); return; }
      const below = anchor.bottom + 8;
      const top = below + box.height <= topEdge + height - 12 ? below : anchor.top - box.height - 8;
      setPosition({
        left: Math.max(leftEdge + 12, Math.min(anchor.left, leftEdge + width - box.width - 12)),
        top: Math.max(topEdge + 12, Math.min(top, topEdge + height - box.height - 12)),
      });
    };
    const outside = (event: Event) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !panel.current?.contains(target)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (panel.current?.contains(document.activeElement)) trigger.current?.focus();
        close();
      }
    };
    const another = (event: Event) => { if ((event as CustomEvent).detail !== id) close(); };
    positionPanel();
    const observer = new ResizeObserver(positionPanel);
    if (panel.current) observer.observe(panel.current);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener(openedEvent, another);
    window.addEventListener("scroll", positionPanel, true);
    window.addEventListener("resize", positionPanel);
    window.visualViewport?.addEventListener("resize", positionPanel);
    window.visualViewport?.addEventListener("scroll", positionPanel);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener(openedEvent, another);
      window.removeEventListener("scroll", positionPanel, true);
      window.removeEventListener("resize", positionPanel);
      window.visualViewport?.removeEventListener("resize", positionPanel);
      window.visualViewport?.removeEventListener("scroll", positionPanel);
    };
  }, [open, id]);

  return <>
    <button type="button" ref={trigger} className="term-trigger" aria-label={`${label} — пояснение`}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? `${id}-panel` : undefined}
      onPointerEnter={(event) => { if (event.pointerType === "mouse") { clearTimer(); timer.current = setTimeout(() => setOpen(true), 120); } }}
      onPointerLeave={leave}
      onClick={(event) => {
        clearTimer();
        if (open && pinned.current) { close(); return; }
        pinned.current = true;
        focusOnOpen.current = event.detail === 0;
        setOpen(true);
        if (open && event.detail === 0) closeButton.current?.focus();
      }}>{label}</button>
    {open && createPortal(<div ref={panel} id={`${id}-panel`} className="term-popover" role="dialog"
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-definition`}
      style={{ left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? "visible" : "hidden" }}
      onPointerEnter={clearTimer} onPointerLeave={leave}>
      <div className="term-popover-header">
        <strong id={`${id}-title`}>{title}</strong>
        <button ref={closeButton} type="button" aria-label="Затвори пояснението" onClick={() => { trigger.current?.focus(); close(); }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <p id={`${id}-definition`}>{definition}</p>
    </div>, document.body)}
  </>;
}
