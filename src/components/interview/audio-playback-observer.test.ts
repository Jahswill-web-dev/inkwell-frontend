import { afterEach, expect, it, vi } from "vitest";
import { createAudioPlaybackObserver } from "./audio-playback-observer";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("observes rendered audio activity and never treats a paused player as completed playback", async () => {
  vi.useFakeTimers();
  let time = 0;
  let energy = 0;
  vi.spyOn(performance, "now").mockImplementation(() => time);
  const close = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal(
    "AudioContext",
    class {
      state = "running";
      destination = {};
      resume = vi.fn().mockResolvedValue(undefined);
      close = close;
      createMediaStreamSource = () => ({ connect: vi.fn() });
      createGain = () => ({ gain: { value: 1 }, connect: vi.fn() });
      createAnalyser = () => ({
        fftSize: 512,
        connect: vi.fn(),
        getFloatTimeDomainData: (data: Float32Array) => data.fill(energy),
      });
    },
  );
  const audio = {
    paused: false,
    muted: false,
    volume: 1,
    get currentTime() {
      return time / 1000;
    },
  } as HTMLAudioElement;
  const changed = vi.fn();
  const observer = createAudioPlaybackObserver(changed)!;
  observer.attach(audio, {} as MediaStream);
  const tick = (milliseconds: number) => {
    time += milliseconds;
    vi.advanceTimersByTime(milliseconds);
  };
  tick(1000);
  expect(changed).not.toHaveBeenCalled();
  energy = 0.1;
  tick(50);
  expect(changed).toHaveBeenLastCalledWith("speaking");
  energy = 0;
  tick(400);
  expect(changed).toHaveBeenLastCalledWith("quiet");
  energy = 0.1;
  tick(50);
  Object.defineProperty(audio, "paused", { value: true });
  tick(500);
  expect(changed).toHaveBeenLastCalledWith("blocked");
  expect(
    changed.mock.calls.filter(([state]) => state === "quiet"),
  ).toHaveLength(1);
  observer.close();
  expect(close).toHaveBeenCalledOnce();
});
