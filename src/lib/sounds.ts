let audio: HTMLAudioElement | null = null;

export function playMessageSound() {
  try {
    if (!audio) {
      audio = new Audio("/sounds/message.mp3");
      audio.volume = 0.5;
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {}
}
