export type AudioPlaybackState = "speaking" | "quiet" | "blocked";

// Observe the audio graph that actually feeds the speakers. Caption gaps and
// model/tool completion never establish playback. This is a client observation,
// not proof that a person heard every word (or that their OS volume was audible).
export function createAudioPlaybackObserver(
  onChange: (state: AudioPlaybackState) => void,
) {
  if (typeof AudioContext === "undefined") return null;
  const context = new AudioContext();
  void context.resume().catch(() => onChange("blocked"));
  let audio: HTMLAudioElement | null = null;
  let analyser: AnalyserNode | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let speaking = false;
  let lastSoundAt = 0;
  let lastSoundMediaTime = 0;
  const samples = new Float32Array(512);
  return {
    attach(element: HTMLAudioElement, stream: MediaStream) {
      audio = element;
      // WebRTC srcObject audio is observed from the negotiated stream, not a
      // MediaElementAudioSourceNode (which may yield silence for remote streams).
      // Keep the existing HTML audio player as the audible output path.
      const source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const silentSink = context.createGain();
      silentSink.gain.value = 0;
      analyser.connect(silentSink);
      silentSink.connect(context.destination);
      if (context.state !== "running") onChange("blocked");
      interval = setInterval(() => {
        if (!audio || !analyser) return;
        if (
          context.state !== "running" ||
          audio.paused ||
          audio.muted ||
          audio.volume === 0
        ) {
          if (speaking) onChange("blocked");
          speaking = false;
          return;
        }
        analyser.getFloatTimeDomainData(samples);
        const energy = Math.sqrt(
          samples.reduce((sum, sample) => sum + sample * sample, 0) /
            samples.length,
        );
        const now = performance.now();
        if (energy > 0.003) {
          lastSoundAt = now;
          lastSoundMediaTime = audio.currentTime;
          if (!speaking) {
            speaking = true;
            onChange("speaking");
          }
        } else if (
          speaking &&
          now - lastSoundAt >= 350 &&
          audio.currentTime > lastSoundMediaTime
        ) {
          speaking = false;
          onChange("quiet");
        }
      }, 50);
    },
    async resume() {
      await context.resume();
      await audio?.play();
    },
    close() {
      if (interval) clearInterval(interval);
      audio = null;
      if (context.state !== "closed")
        void context.close().catch(() => undefined);
    },
  };
}
