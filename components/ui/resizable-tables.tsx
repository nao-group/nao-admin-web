"use client";

import { useEffect } from "react";

const MIN_WIDTH = 88;

/** Adds drag handles to data tables while leaving component-internal tables untouched. */
export function ResizableTables() {
  useEffect(() => {
    const cleanups = new Map<HTMLElement, () => void>();
    const enhance = (table: HTMLTableElement) => {
      if (table.closest("[data-calendar], [data-dates-dropdown]")) {
        table.querySelectorAll<HTMLElement>(".admin-column-resizer").forEach((handle) => {
          cleanups.get(handle)?.();
          cleanups.delete(handle);
          handle.remove();
        });
        table.querySelectorAll<HTMLTableCellElement>("thead th").forEach((header) => {
          delete header.dataset.resizableReady;
          header.classList.remove("admin-resizable-header");
          header.style.removeProperty("width");
          header.style.removeProperty("min-width");
        });
        delete table.dataset.widthsInitialized;
        table.style.removeProperty("table-layout");
        table.style.removeProperty("width");
        return;
      }
      const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th"));
      headers.forEach((header, index) => {
        if (header.dataset.resizableReady || header.querySelector(".question-column-resizer") || (index === headers.length - 1 && !header.textContent?.trim())) return;
        header.dataset.resizableReady = "true";
        header.classList.add("admin-resizable-header");
        const handle = document.createElement("button");
        handle.type = "button";
        handle.className = "admin-column-resizer";
        handle.setAttribute("aria-label", `Ubah lebar kolom ${header.textContent?.trim() || index + 1}`);
        handle.title = "Tarik untuk mengubah lebar kolom";
        header.appendChild(handle);
        const startResize = (event: PointerEvent) => {
          event.preventDefault();
          event.stopPropagation();
          if (!table.dataset.widthsInitialized) {
            headers.forEach((cell) => {
              const width = Math.round(cell.getBoundingClientRect().width);
              cell.style.width = `${width}px`;
              cell.style.minWidth = `${Math.min(width, MIN_WIDTH)}px`;
            });
            table.dataset.widthsInitialized = "true";
            table.style.tableLayout = "fixed";
            table.style.width = `${Math.ceil(table.getBoundingClientRect().width)}px`;
          }
          const startX = event.clientX;
          const startWidth = header.getBoundingClientRect().width;
          const startTableWidth = table.getBoundingClientRect().width;
          handle.setPointerCapture(event.pointerId);
          document.body.classList.add("is-resizing-table");
          const move = (moveEvent: PointerEvent) => {
            const nextWidth = Math.max(MIN_WIDTH, startWidth + moveEvent.clientX - startX);
            header.style.width = `${nextWidth}px`;
            header.style.minWidth = `${nextWidth}px`;
            table.style.width = `${Math.max(MIN_WIDTH * headers.length, startTableWidth + nextWidth - startWidth)}px`;
          };
          const stop = () => {
            handle.removeEventListener("pointermove", move);
            handle.removeEventListener("pointerup", stop);
            handle.removeEventListener("pointercancel", stop);
            document.body.classList.remove("is-resizing-table");
          };
          handle.addEventListener("pointermove", move);
          handle.addEventListener("pointerup", stop);
          handle.addEventListener("pointercancel", stop);
        };
        handle.addEventListener("pointerdown", startResize);
        cleanups.set(handle, () => handle.removeEventListener("pointerdown", startResize));
      });
    };
    const scan = () => document.querySelectorAll<HTMLTableElement>("table").forEach(enhance);
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { observer.disconnect(); cleanups.forEach((cleanup) => cleanup()); };
  }, []);
  return null;
}
