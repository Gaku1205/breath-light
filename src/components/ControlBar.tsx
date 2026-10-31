import type { Ref } from "react";
import styles from "./BreathPage.module.css";
import type { Status } from "./PhasePanel";

type Props = {
  status: Status;
  totalRemaining: number;
  onStart: () => void;
  onStop: () => void;
  onHome: () => void;
  startRef: Ref<HTMLButtonElement>;
  stopRef: Ref<HTMLButtonElement>;
  againRef: Ref<HTMLButtonElement>;
};

/** 下の操作の帯。今の状態のボタンだけを DOM に置く */
export function ControlBar({
  status,
  totalRemaining,
  onStart,
  onStop,
  onHome,
  startRef,
  stopRef,
  againRef,
}: Props) {
  if (status === "idle") {
    return (
      <div key="idle" className={`${styles.controls} ${styles.fadeIn}`}>
        <button
          ref={startRef}
          type="button"
          className={`${styles.primary} startButton`}
          onClick={onStart}
        >
          はじめる
        </button>
      </div>
    );
  }

  if (status === "breathing") {
    return (
      <div key="breathing" className={`${styles.controls} ${styles.controlsRow} ${styles.fadeIn}`}>
        <span className={styles.remaining} aria-hidden="true">
          残り<span className={styles.remainingNum}>{totalRemaining}</span>秒
        </span>
        <button ref={stopRef} type="button" className={styles.textButton} onClick={onStop}>
          やめる
        </button>
      </div>
    );
  }

  return (
    <div
      key={status}
      className={`${styles.controls} ${styles.controlsPair} ${
        status === "done" ? styles.fadeInLate : styles.fadeIn
      }`}
    >
      <button ref={againRef} type="button" className={styles.primary} onClick={onStart}>
        もう1分はじめる
      </button>
      <button type="button" className={styles.textButton} onClick={onHome}>
        最初の画面へ
      </button>
    </div>
  );
}
