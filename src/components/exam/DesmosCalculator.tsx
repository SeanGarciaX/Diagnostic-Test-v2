"use client";

// A draggable, resizable floating panel wrapping the Desmos graphing
// calculator, ported from the original app's drag/resize-handle logic.
// The Desmos script itself is loaded once by FullTestExam.tsx via
// next/script, using the same public API key the original app used.

import { useEffect, useRef } from "react";
import styles from "./exam.module.css";

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (
        node: HTMLElement,
        options: { keypad: boolean; expressions: boolean; settingsMenu: boolean; zoomButtons: boolean; border: boolean }
      ) => { resize: () => void };
    };
  }
}

const MIN_WIDTH = 300;
const MIN_HEIGHT = 260;
type ResizeDir = "e" | "w" | "n" | "s" | "ne" | "nw" | "se" | "sw";
const RESIZE_HANDLES: { dir: ResizeDir; style: React.CSSProperties }[] = [
  { dir: "e", style: { top: 0, right: -3, width: 6, height: "100%", cursor: "ew-resize" } },
  { dir: "w", style: { top: 0, left: -3, width: 6, height: "100%", cursor: "ew-resize" } },
  { dir: "n", style: { top: -3, left: 0, width: "100%", height: 6, cursor: "ns-resize" } },
  { dir: "s", style: { bottom: -3, left: 0, width: "100%", height: 6, cursor: "ns-resize" } },
  { dir: "ne", style: { top: -4, right: -4, width: 12, height: 12, cursor: "nesw-resize" } },
  { dir: "nw", style: { top: -4, left: -4, width: 12, height: 12, cursor: "nwse-resize" } },
  { dir: "se", style: { bottom: -4, right: -4, width: 12, height: 12, cursor: "nwse-resize" } },
  { dir: "sw", style: { bottom: -4, left: -4, width: 12, height: 12, cursor: "nesw-resize" } }
];

export function DesmosCalculator({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<ReturnType<NonNullable<Window["Desmos"]>["GraphingCalculator"]> | null>(null);

  useEffect(() => {
    if (mountRef.current && window.Desmos && !calculatorRef.current) {
      calculatorRef.current = window.Desmos.GraphingCalculator(mountRef.current, {
        keypad: true,
        expressions: true,
        settingsMenu: false,
        zoomButtons: true,
        border: false
      });
    }
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    const header = panel?.querySelector<HTMLElement>(`.${styles.desmosHeader}`);
    if (!panel || !header) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const onMouseDown = (e: MouseEvent) => {
      dragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      e.preventDefault();
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return;
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.top = `${e.clientY - offsetY}px`;
    };
    const onMouseUp = () => {
      dragging = false;
    };

    header.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      header.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    let resizing = false;
    let dir: ResizeDir | null = null;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let startLeft = 0;
    let startTop = 0;

    const handles = panel.querySelectorAll<HTMLElement>(`.${styles.resizeHandle}`);
    const onHandleDown = (e: MouseEvent, handleDir: ResizeDir) => {
      resizing = true;
      dir = handleDir;
      startX = e.clientX;
      startY = e.clientY;
      startW = panel.offsetWidth;
      startH = panel.offsetHeight;
      startLeft = panel.offsetLeft;
      startTop = panel.offsetTop;
      e.preventDefault();
      e.stopPropagation();
    };
    const listeners: [HTMLElement, ResizeDir][] = [];
    handles.forEach((handle) => {
      const handleDir = handle.dataset.dir as ResizeDir;
      const listener = (e: MouseEvent) => onHandleDown(e, handleDir);
      handle.addEventListener("mousedown", listener as EventListener);
      listeners.push([handle, handleDir]);
      handle.dataset.bound = "1";
      (handle as HTMLElement & { __listener?: EventListener }).__listener = listener as EventListener;
    });

    const onMouseMove = (e: MouseEvent) => {
      if (!resizing || !dir) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (dir.includes("e")) panel.style.width = `${Math.max(MIN_WIDTH, startW + dx)}px`;
      if (dir.includes("s")) panel.style.height = `${Math.max(MIN_HEIGHT, startH + dy)}px`;
      if (dir.includes("w")) {
        const newW = Math.max(MIN_WIDTH, startW - dx);
        panel.style.width = `${newW}px`;
        panel.style.left = `${startLeft + (startW - newW)}px`;
      }
      if (dir.includes("n")) {
        const newH = Math.max(MIN_HEIGHT, startH - dy);
        panel.style.height = `${newH}px`;
        panel.style.top = `${startTop + (startH - newH)}px`;
      }
      calculatorRef.current?.resize();
    };
    const onMouseUp = () => {
      if (resizing) calculatorRef.current?.resize();
      resizing = false;
      dir = null;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      handles.forEach((handle) => {
        const listener = (handle as HTMLElement & { __listener?: EventListener }).__listener;
        if (listener) handle.removeEventListener("mousedown", listener);
      });
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return (
    <div className={styles.desmosPanel} ref={panelRef}>
      <div className={styles.desmosHeader}>
        <span>Desmos Graphing Calculator</span>
        <button className={styles.desmosClose} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className={styles.desmosMount} ref={mountRef} />
      {RESIZE_HANDLES.map(({ dir, style }) => (
        <div key={dir} className={styles.resizeHandle} data-dir={dir} style={style} />
      ))}
    </div>
  );
}
