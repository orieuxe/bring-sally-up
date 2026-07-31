import { createAudioPlayer, setIsAudioActiveAsync, AudioPlayer } from 'expo-audio';

export const CHALLENGE_AUDIO_SOURCE = require('../assets/sally.mp3');

// Activate the audio session as early as possible (module scope, before any
// component renders) — this negotiation is itself part of what made the
// very first play() on Android eat the opening beats.
setIsAudioActiveAsync(true).catch(() => {});

let player: AudioPlayer | null = null;

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(CHALLENGE_AUDIO_SOURCE);
  }
  return player;
}

// Keeps the challenge track continuously playing, muted and looping, from
// app launch onward — pausing it (even a warmed-up player) let the output
// path go cold again, so a later play() still ate the opening beats.
// Because it never actually stops, starting/stopping a challenge only ever
// toggles volume + position, never play()/pause().
export function warmUpChallengeAudio() {
  const p = getPlayer();
  p.loop = true;
  p.volume = 0;

  const start = () => {
    if (p.isLoaded && !p.playing) p.play();
  };

  if (p.isLoaded) {
    start();
  } else {
    const subscription = p.addListener('playbackStatusUpdate', status => {
      if (status.isLoaded) {
        subscription.remove();
        start();
      }
    });
  }
}

export function getChallengePlayer(): AudioPlayer {
  return getPlayer();
}

export async function startChallengeAudio(): Promise<void> {
  const p = getPlayer();
  p.loop = false;
  await p.seekTo(0);
  p.volume = 1;
  if (!p.playing) p.play();
}

// Mutes and resumes the silent background loop instead of pausing, so the
// output path stays warm for the next challenge.
export function stopChallengeAudio() {
  const p = getPlayer();
  p.volume = 0;
  p.loop = true;
  if (!p.playing) p.play();
}
