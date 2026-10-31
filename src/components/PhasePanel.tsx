import type { Ref } from "react";
import { PHASE_LABEL, type Phase } from "@/lib/breath";
import styles from "./BreathPage.module.css";

export type Status = "idle" | "breathing" | "done" | "stopped";

export type BreathDisplay = {
  phase: Phase;
  phaseRemaining: number;
  totalRemaining: number;
};

type Props = {
  status: Status;
  display: BreathDisplay;
  wordRef: Ref<HTMLParagraphElement>;
};

export const TITLE = "1分の深呼吸";

/** 段階の欄。高さは状態で変えない。箱ごと aria-live */
export function PhasePanel({ status, display, wordRef }: Props) {
  return (
    <div className={styles.phaseBox} aria-live="polite">
      {status === "idle" && (
        <h1 key="idle" className={`${styles.heading} ${styles.fadeIn}`}>
          {TITLE}
        </h1>
      )}
      {status === "breathing" && (
        <div key="breathing" className={`${styles.phaseInner} ${styles.fadeIn}`}>
          {/* 濃さは呼吸の時計（requestAnimationFrame）が毎フレーム決める */}
          <p ref={wordRef} className={styles.word} style={{ opacity: 0 }}>
            {PHASE_LABEL[display.phase]}
          </p>
          <p className={styles.seconds} aria-hidden="true">
            {display.phaseRemaining}
          </p>
        </div>
      )}
      {status === "done" && (
        <h2 key="done" className={`${styles.heading} ${styles.fadeInLate}`}>
          1分の深呼吸ができました
        </h2>
      )}
      {status === "stopped" && (
        <h2 key="stopped" className={`${styles.heading} ${styles.fadeIn}`}>
          途中で止まりました
        </h2>
      )}
    </div>
  );
}
