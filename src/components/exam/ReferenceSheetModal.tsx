"use client";

import { useState } from "react";
import styles from "./exam.module.css";

const REFERENCE_SHEET_IMAGE_URL =
  "https://media.geeksforgeeks.org/wp-content/uploads/20240724174949/SAT-Math-Formulas-You-MUST-Know.png";

export function ReferenceSheetModal({ onClose }: { onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.refOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.refPanel} ${expanded ? styles.expanded : ""}`}>
        <div className={styles.refHeader}>
          <span>Reference</span>
          <div style={{ display: "flex", gap: 18 }}>
            <button title="Expand" onClick={() => setExpanded((value) => !value)}>
              ⤢
            </button>
            <button title="Close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>
        <div className={styles.refBody}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={REFERENCE_SHEET_IMAGE_URL} alt="SAT Reference Sheet" />
        </div>
      </div>
    </div>
  );
}
