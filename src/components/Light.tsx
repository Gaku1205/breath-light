import type { Ref } from "react";
import styles from "./BreathPage.module.css";

type Props = {
  /** 呼吸中は requestAnimationFrame で大きさを直接変えるので、transition を切る */
  running: boolean;
  lightRef: Ref<HTMLDivElement>;
};

/** 器と光。押せない飾りなので読み上げから外す */
export function Light({ running, lightRef }: Props) {
  return (
    <div className={styles.stage} aria-hidden="true">
      <div className={styles.vessel} />
      <div ref={lightRef} className={styles.light} data-running={running ? "" : undefined} />
    </div>
  );
}
