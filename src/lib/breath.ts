// 呼吸の案内の計算。経過時間（秒）から、段階・残り秒数・光の大きさを決める。
// 光・言葉・秒数をずらさないため、画面の値はすべてこの関数から出す。

export type Phase = "inhale" | "hold" | "exhale";

export const PHASE_LABEL: Record<Phase, string> = {
  inhale: "吸う",
  hold: "止める",
  exhale: "吐く",
};

export const INHALE_SECONDS = 4;
export const HOLD_SECONDS = 4;
export const EXHALE_SECONDS = 6;
export const CYCLE_SECONDS = INHALE_SECONDS + HOLD_SECONDS + EXHALE_SECONDS;
export const TOTAL_SECONDS = 60;

export const MIN_SCALE = 0.3;
export const MAX_SCALE = 1;

export type BreathFrame = {
  /** 今の段階。終わったあとは最後の段階（吸う）のまま */
  phase: Phase;
  /** 段階の始まりからの経過秒 */
  phaseElapsed: number;
  /** 段階の長さ（秒） */
  phaseDuration: number;
  /** 段階の残り秒数（切り上げ） */
  phaseRemaining: number;
  /** 全体の残り秒数（切り上げ） */
  totalRemaining: number;
  /** 光の大きさ（0.3〜1） */
  scale: number;
  /** 60秒に達したか */
  done: boolean;
};

export type BreathOptions = {
  /** prefers-reduced-motion のとき true。光を1秒ごとの段で変える */
  reducedMotion?: boolean;
};

// cubic-bezier(x1, y1, x2, y2) の曲線。t（0〜1、時間）から進み（0〜1）を返す。
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (t: number) => number {
  const sample = (a1: number, a2: number, u: number): number =>
    3 * a1 * u * (1 - u) * (1 - u) + 3 * a2 * u * u * (1 - u) + u * u * u;
  const slope = (a1: number, a2: number, u: number): number =>
    3 * a1 * (1 - u) * (1 - u) + 6 * (a2 - a1) * u * (1 - u) + 3 * (1 - a2) * u * u;

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // ニュートン法で x(u) = t となる u を探し、うまくいかなければ二分法
    let u = t;
    for (let i = 0; i < 8; i++) {
      const err = sample(x1, x2, u) - t;
      if (Math.abs(err) < 1e-7) return sample(y1, y2, u);
      const d = slope(x1, x2, u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0;
    let hi = 1;
    u = t;
    for (let i = 0; i < 40; i++) {
      const x = sample(x1, x2, u);
      if (Math.abs(x - t) < 1e-7) break;
      if (x < t) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return sample(y1, y2, u);
  };
}

/** 吸う・吐くの曲線 cubic-bezier(0.37, 0, 0.63, 1) */
export const breathEase = cubicBezier(0.37, 0, 0.63, 1);

// 浮動小数の誤差で 3.0000000001 が 4 に切り上がらないよう、少しだけ丸めてから切り上げる
function ceilSeconds(value: number): number {
  return Math.ceil(Math.round(value * 1e6) / 1e6);
}

function scaleFor(
  phase: Phase,
  phaseElapsed: number,
  phaseDuration: number,
  reducedMotion: boolean,
): number {
  if (phase === "hold") return MAX_SCALE;
  let progress: number;
  if (reducedMotion) {
    // 各1秒の始まりに、その1秒の終わりの大きさへ跳ぶ
    const step = Math.min(Math.floor(phaseElapsed + 1e-9) + 1, phaseDuration);
    progress = step / phaseDuration;
  } else {
    progress = breathEase(phaseElapsed / phaseDuration);
  }
  const range = MAX_SCALE - MIN_SCALE;
  return phase === "inhale"
    ? MIN_SCALE + range * progress
    : MAX_SCALE - range * progress;
}

/**
 * 経過時間（秒）から、そのときの案内を返す。
 * 0秒で「吸う」が始まり、吸う4・止める4・吐く6 をくり返し、60秒で終わる。
 * 段階の境目ちょうどは次の段階とする。
 */
export function breathAt(elapsedSeconds: number, options: BreathOptions = {}): BreathFrame {
  const reducedMotion = options.reducedMotion ?? false;
  const elapsed = Math.max(0, elapsedSeconds);

  if (elapsed >= TOTAL_SECONDS) {
    return {
      phase: "inhale",
      phaseElapsed: INHALE_SECONDS,
      phaseDuration: INHALE_SECONDS,
      phaseRemaining: 0,
      totalRemaining: 0,
      scale: MIN_SCALE,
      done: true,
    };
  }

  const inCycle = elapsed % CYCLE_SECONDS;
  let phase: Phase;
  let phaseElapsed: number;
  let phaseDuration: number;
  if (inCycle < INHALE_SECONDS) {
    phase = "inhale";
    phaseElapsed = inCycle;
    phaseDuration = INHALE_SECONDS;
  } else if (inCycle < INHALE_SECONDS + HOLD_SECONDS) {
    phase = "hold";
    phaseElapsed = inCycle - INHALE_SECONDS;
    phaseDuration = HOLD_SECONDS;
  } else {
    phase = "exhale";
    phaseElapsed = inCycle - INHALE_SECONDS - HOLD_SECONDS;
    phaseDuration = EXHALE_SECONDS;
  }

  // 最後の周回が途中で切れるときは、段階の長さを60秒までに縮める
  const phaseStart = elapsed - phaseElapsed;
  phaseDuration = Math.min(phaseDuration, TOTAL_SECONDS - phaseStart);

  return {
    phase,
    phaseElapsed,
    phaseDuration,
    phaseRemaining: ceilSeconds(phaseDuration - phaseElapsed),
    totalRemaining: ceilSeconds(TOTAL_SECONDS - elapsed),
    scale: scaleFor(phase, phaseElapsed, phaseDuration, reducedMotion),
    done: false,
  };
}

/** 段階の言葉の濃さ（0〜1）。境目の 200ms 前から消え、境目から 200ms で出る */
export const WORD_FADE_SECONDS = 0.2;

export function wordOpacity(frame: BreathFrame, reducedMotion = false): number {
  if (reducedMotion || frame.done) return 1;
  const fadeIn = frame.phaseElapsed / WORD_FADE_SECONDS;
  const left = frame.phaseDuration - frame.phaseElapsed;
  // 60秒で終わる最後の段階は、消さずに終わりの画面へ切りかえる
  const isLastPhase = frame.totalRemaining <= frame.phaseRemaining;
  const fadeOut = isLastPhase ? 1 : left / WORD_FADE_SECONDS;
  return wordEase(Math.max(0, Math.min(1, fadeIn, fadeOut)));
}

/** 言葉の出入りの曲線（CSS の ease と同じ） */
const wordEase = cubicBezier(0.25, 0.1, 0.25, 1);
