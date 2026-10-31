import { describe, expect, it } from "vitest";
import { breathAt, breathEase, cubicBezier, wordOpacity } from "./breath";

describe("breathAt：段階", () => {
  it("0秒は吸うの始まり。残り4秒・全体60秒・光は最小", () => {
    const f = breathAt(0);
    expect(f.phase).toBe("inhale");
    expect(f.phaseRemaining).toBe(4);
    expect(f.totalRemaining).toBe(60);
    expect(f.scale).toBeCloseTo(0.3);
    expect(f.done).toBe(false);
  });

  it("4秒の手前は吸う、4秒ちょうどから止める", () => {
    expect(breathAt(3.999).phase).toBe("inhale");
    expect(breathAt(3.999).phaseRemaining).toBe(1);
    const f = breathAt(4);
    expect(f.phase).toBe("hold");
    expect(f.phaseRemaining).toBe(4);
    expect(f.scale).toBe(1);
  });

  it("8秒の手前は止める、8秒ちょうどから吐く（残り6秒）", () => {
    expect(breathAt(7.999).phase).toBe("hold");
    const f = breathAt(8);
    expect(f.phase).toBe("exhale");
    expect(f.phaseRemaining).toBe(6);
    expect(f.scale).toBeCloseTo(1);
  });

  it("14秒の手前は吐く、14秒ちょうどから2周目の吸う（14秒周期）", () => {
    expect(breathAt(13.999).phase).toBe("exhale");
    expect(breathAt(13.999).phaseRemaining).toBe(1);
    const f = breathAt(14);
    expect(f.phase).toBe("inhale");
    expect(f.phaseRemaining).toBe(4);
    expect(f.scale).toBeCloseTo(0.3);
  });

  it("14秒ずらしても同じ段階・同じ大きさ", () => {
    for (const t of [0.5, 3.2, 5, 9.7, 12.3]) {
      const a = breathAt(t);
      const b = breathAt(t + 14 * 2);
      expect(b.phase).toBe(a.phase);
      expect(b.phaseRemaining).toBe(a.phaseRemaining);
      expect(b.scale).toBeCloseTo(a.scale);
    }
  });

  it("残り秒数は切り上げ（吸う 4・3・2・1）", () => {
    expect([0.1, 1.1, 2.1, 3.1].map((t) => breathAt(t).phaseRemaining)).toEqual([4, 3, 2, 1]);
    expect([1, 2, 3].map((t) => breathAt(t).phaseRemaining)).toEqual([3, 2, 1]);
  });

  it("全体の残り秒数は60秒から引いて切り上げ", () => {
    expect(breathAt(0.5).totalRemaining).toBe(60);
    expect(breathAt(1).totalRemaining).toBe(59);
    expect(breathAt(13).totalRemaining).toBe(47);
    expect(breathAt(59.01).totalRemaining).toBe(1);
  });
});

describe("breathAt：最後の周回と60秒での終わり", () => {
  it("56秒から5周目の吸う。60秒で切れるので長さは4秒のまま", () => {
    const f = breathAt(56);
    expect(f.phase).toBe("inhale");
    expect(f.phaseDuration).toBe(4);
    expect(f.phaseRemaining).toBe(4);
    expect(f.totalRemaining).toBe(4);
  });

  it("60秒の手前は吸うの終わり近く（光はほぼ最大）", () => {
    const f = breathAt(59.999);
    expect(f.done).toBe(false);
    expect(f.phase).toBe("inhale");
    expect(f.phaseRemaining).toBe(1);
    expect(f.totalRemaining).toBe(1);
    expect(f.scale).toBeGreaterThan(0.99);
  });

  it("60秒ちょうどで終わり。光は最小に戻る", () => {
    const f = breathAt(60);
    expect(f.done).toBe(true);
    expect(f.totalRemaining).toBe(0);
    expect(f.scale).toBeCloseTo(0.3);
  });

  it("60秒を過ぎても終わりのまま", () => {
    expect(breathAt(75).done).toBe(true);
  });

  it("負の経過は0秒として扱う", () => {
    expect(breathAt(-1).phase).toBe("inhale");
    expect(breathAt(-1).totalRemaining).toBe(60);
  });
});

describe("breathAt：光の大きさ", () => {
  it("吸うの途中は 0.3 から 1 へ増え続ける", () => {
    let prev = 0;
    for (let t = 0; t < 4; t += 0.25) {
      const s = breathAt(t).scale;
      expect(s).toBeGreaterThanOrEqual(prev);
      expect(s).toBeGreaterThanOrEqual(0.3);
      expect(s).toBeLessThanOrEqual(1);
      prev = s;
    }
    expect(breathAt(2).scale).toBeCloseTo(0.65, 2);
  });

  it("吐くの途中は 1 から 0.3 へ減り続ける", () => {
    let prev = 2;
    for (let t = 8; t < 14; t += 0.25) {
      const s = breathAt(t).scale;
      expect(s).toBeLessThanOrEqual(prev);
      prev = s;
    }
    expect(breathAt(11).scale).toBeCloseTo(0.65, 2);
  });

  it("動きを減らす設定では、各1秒の始まりにその1秒の終わりの大きさへ跳ぶ", () => {
    const opt = { reducedMotion: true };
    expect([0, 1, 2, 3].map((t) => breathAt(t, opt).scale)).toEqual(
      [0.475, 0.65, 0.825, 1].map((v) => expect.closeTo(v, 3)),
    );
    expect(breathAt(0.9, opt).scale).toBeCloseTo(0.475);
    expect(breathAt(5, opt).scale).toBe(1);
    expect([8, 9, 10, 11, 12, 13].map((t) => breathAt(t, opt).scale)).toEqual(
      [0.883, 0.767, 0.65, 0.533, 0.417, 0.3].map((v) => expect.closeTo(v, 2)),
    );
  });
});

describe("cubicBezier", () => {
  it("端は0と1、真ん中は対称の曲線なら0.5", () => {
    expect(breathEase(0)).toBe(0);
    expect(breathEase(1)).toBe(1);
    expect(breathEase(0.5)).toBeCloseTo(0.5, 5);
  });

  it("linear は入力と同じ", () => {
    const linear = cubicBezier(0, 0, 1, 1);
    expect(linear(0.3)).toBeCloseTo(0.3, 5);
  });
});

describe("wordOpacity", () => {
  it("段階の始まりから 200ms で出る", () => {
    expect(wordOpacity(breathAt(4))).toBe(0);
    expect(wordOpacity(breathAt(4.2))).toBeCloseTo(1);
    expect(wordOpacity(breathAt(5))).toBe(1);
  });

  it("段階の終わり 200ms 前から消える", () => {
    expect(wordOpacity(breathAt(3.8))).toBeCloseTo(1);
    expect(wordOpacity(breathAt(3.9))).toBeGreaterThan(0);
    expect(wordOpacity(breathAt(3.9))).toBeLessThan(1);
  });

  it("最後の吸う（60秒で終わる）は消さない", () => {
    expect(wordOpacity(breathAt(59.95))).toBe(1);
  });

  it("動きを減らす設定ではいつも1", () => {
    expect(wordOpacity(breathAt(4), true)).toBe(1);
  });
});
