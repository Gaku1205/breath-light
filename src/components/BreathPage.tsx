"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { breathAt, wordOpacity, TOTAL_SECONDS, INHALE_SECONDS } from "@/lib/breath";
import { releaseScreenWakeLock, requestScreenWakeLock } from "@/lib/wakeLock";
import styles from "./BreathPage.module.css";
import { ControlBar } from "./ControlBar";
import { Light } from "./Light";
import { PhasePanel, TITLE, type BreathDisplay, type Status } from "./PhasePanel";
import { useReducedMotion } from "./useReducedMotion";

type StopReason = "user" | "hidden";
type FocusTarget = "start" | "stop" | "again";

const INITIAL_DISPLAY: BreathDisplay = {
  phase: "inhale",
  phaseRemaining: INHALE_SECONDS,
  totalRemaining: TOTAL_SECONDS,
};

const DESCRIPTION =
  "光が広がるあいだに吸って、止まったら息を止め、縮むあいだに吐きます。吸う4秒、止める4秒、吐く6秒を4回くり返します。";
const DONE_DESCRIPTION = "息がととのったら、このまま閉じて大丈夫です。";
const STOPPED_DESCRIPTION: Record<StopReason, string> = {
  hidden: "ほかの画面に切りかわったので、案内を止めました。もう一度はじめから合わせられます。",
  user: "案内を止めました。もう一度はじめから合わせられます。",
};
const NOSCRIPT_TEXT =
  "この案内は JavaScript で動きます。ブラウザの設定で JavaScript を有効にしてください。";

export function BreathPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [stopReason, setStopReason] = useState<StopReason>("user");
  const [display, setDisplay] = useState<BreathDisplay>(INITIAL_DISPLAY);
  const reducedMotion = useReducedMotion();

  const startTimeRef = useRef(0);
  const lightRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLParagraphElement>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const stopButtonRef = useRef<HTMLButtonElement>(null);
  const againButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocusRef = useRef<FocusTarget | null>(null);

  const start = useCallback(() => {
    startTimeRef.current = performance.now();
    pendingFocusRef.current = "stop";
    setDisplay(INITIAL_DISPLAY);
    setStatus("breathing");
  }, []);

  const stop = useCallback((reason: StopReason) => {
    pendingFocusRef.current = "again";
    setStopReason(reason);
    setStatus("stopped");
  }, []);

  const goHome = useCallback(() => {
    pendingFocusRef.current = "start";
    setStatus("idle");
  }, []);

  // フォーカスの移動（ボタンを押したときだけ。読み込み時は動かさない）
  useEffect(() => {
    const target = pendingFocusRef.current;
    if (!target) return;
    pendingFocusRef.current = null;
    const button = {
      start: startButtonRef.current,
      stop: stopButtonRef.current,
      again: againButtonRef.current,
    }[target];
    button?.focus();
  }, [status]);

  // 呼吸中の時計。光・言葉・秒数をすべて同じ経過時間から決める
  useEffect(() => {
    if (status !== "breathing") return;
    let frameId = 0;
    let last: BreathDisplay = INITIAL_DISPLAY;

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const frame = breathAt(elapsed, { reducedMotion });
      if (frame.done) {
        pendingFocusRef.current = "again";
        setStatus("done");
        return;
      }
      if (lightRef.current) lightRef.current.style.transform = `scale(${frame.scale})`;
      if (wordRef.current) {
        wordRef.current.style.opacity = String(wordOpacity(frame, reducedMotion));
      }
      if (
        frame.phase !== last.phase ||
        frame.phaseRemaining !== last.phaseRemaining ||
        frame.totalRemaining !== last.totalRemaining
      ) {
        last = {
          phase: frame.phase,
          phaseRemaining: frame.phaseRemaining,
          totalRemaining: frame.totalRemaining,
        };
        const next = last;
        // 光と同じフレームで文字も差し替える
        flushSync(() => setDisplay(next));
      }
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    const light = lightRef.current;
    return () => {
      cancelAnimationFrame(frameId);
      // 呼吸が終わったら、光は CSS の transition で 0.3 に戻る
      if (light) light.style.transform = "";
    };
  }, [status, reducedMotion]);

  // ページが隠れたら止める。Esc でも止める
  useEffect(() => {
    if (status !== "breathing") return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stop("hidden");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") stop("user");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [status, stop]);

  // 呼吸中だけ画面を消さない。非対応・失敗でも案内は続ける
  useEffect(() => {
    if (status !== "breathing") return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    requestScreenWakeLock().then((s) => {
      if (cancelled) releaseScreenWakeLock(s);
      else sentinel = s;
    });
    return () => {
      cancelled = true;
      releaseScreenWakeLock(sentinel);
    };
  }, [status]);

  const description =
    status === "idle"
      ? DESCRIPTION
      : status === "done"
        ? DONE_DESCRIPTION
        : status === "stopped"
          ? STOPPED_DESCRIPTION[stopReason]
          : null;

  return (
    <>
      <div className={styles.doneLayer} data-on={status === "done" ? "" : undefined} />
      <main className={styles.page}>
        {status !== "idle" && <h1 className={styles.srOnly}>{TITLE}</h1>}
        <header className={styles.topbar}>
          {status === "idle" && (
            <span className={`${styles.name} ${styles.fadeIn}`} translate="no">
              breath-light
            </span>
          )}
        </header>
        <Light running={status === "breathing"} lightRef={lightRef} />
        <PhasePanel status={status} display={display} wordRef={wordRef} />
        {description !== null && (
          <p
            key={`${status}-${stopReason}`}
            className={`${styles.desc} ${status === "done" ? styles.fadeInLate : styles.fadeIn}`}
          >
            {description}
          </p>
        )}
        {status === "idle" && (
          <noscript>
            <p className={styles.desc}>{NOSCRIPT_TEXT}</p>
            <style>{".startButton{display:none!important}"}</style>
          </noscript>
        )}
        <ControlBar
          status={status}
          totalRemaining={display.totalRemaining}
          onStart={start}
          onStop={() => stop("user")}
          onHome={goHome}
          startRef={startButtonRef}
          stopRef={stopButtonRef}
          againRef={againButtonRef}
        />
      </main>
    </>
  );
}
