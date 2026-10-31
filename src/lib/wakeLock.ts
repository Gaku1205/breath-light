// 呼吸中だけ画面を消さないための小さな包み（Screen Wake Lock API）。
// 非対応・失敗のときは null を返し、呼び出し側はそのまま案内を続ける。

export async function requestScreenWakeLock(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return null;
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}

export function releaseScreenWakeLock(sentinel: WakeLockSentinel | null): void {
  if (!sentinel || sentinel.released) return;
  sentinel.release().catch(() => {
    // 解除の失敗は案内に関係しないので無視する
  });
}
