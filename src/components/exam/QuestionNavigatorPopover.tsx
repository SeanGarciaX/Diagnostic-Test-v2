import styles from "./exam.module.css";

export function QuestionNavigatorPopover({
  title,
  count,
  current,
  answered,
  marked,
  onSelect,
  onClose
}: {
  title: string;
  count: number;
  current: number;
  answered: boolean[];
  marked: boolean[];
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className={styles.qnavPopover}>
      <div className={styles.qnavHeader}>
        <span className={styles.qnavTitle}>{title} Questions</span>
        <button className={styles.qnavClose} onClick={onClose}>
          ✕
        </button>
      </div>
      <div className={styles.qnavLegend}>
        <span className={styles.qnavLegendItem}>📍 Current</span>
        <span className={styles.qnavLegendItem}>
          <span className={styles.qnavLegendSwatch} /> Unanswered
        </span>
        <span className={styles.qnavLegendItem}>🚩 For Review</span>
      </div>
      <div className={styles.qnavGrid}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={styles.qnavItem}>
            <div className={styles.qnavPin}>{i === current ? "📍" : ""}</div>
            <div
              className={`${styles.qnavBox} ${i === current ? styles.current : ""} ${answered[i] ? styles.answered : ""}`}
              onClick={() => onSelect(i)}
            >
              <span>{i + 1}</span>
              {marked[i] && <span className={styles.qnavFlagBadge}>🚩</span>}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.qnavFooter}>
        <button className={styles.qnavReviewBtn} onClick={onClose}>
          Go to Review Page
        </button>
      </div>
    </div>
  );
}
