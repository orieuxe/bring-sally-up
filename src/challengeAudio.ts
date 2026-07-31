import { createAudioPlayer, AudioPlayer } from 'expo-audio';

export const CHALLENGE_AUDIO_SOURCE = require('../assets/sally.mp3');

let player: AudioPlayer | null = null;
let warmupStarted = false;

function getPlayer(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(CHALLENGE_AUDIO_SOURCE);
  }
  return player;
}

// A fresh AudioPlayer's underlying output track is "cold": on Android the
// first ever play() can silently eat the first couple of seconds of audio
// while the hardware output path engages, even though playback position
// (and therefore our timer sync) advances normally the whole time. Playing
// it once, muted, well before the user reaches the challenge screen warms
// that path up. Crucially this reuses the *same* player instance for the
// real challenge instead of creating a new one, since a brand new player
// would just be cold again.
export function warmUpChallengeAudio() {
  if (warmupStarted) return;
  warmupStarted = true;
  const p = getPlayer();

  const warm = () => {
    p.volume = 0;
    p.play();
    setTimeout(() => {
      p.pause();
      p.seekTo(0);
      p.volume = 1;
    }, 300);
  };

  if (p.isLoaded) {
    warm();
  } else {
    const subscription = p.addListener('playbackStatusUpdate', status => {
      if (status.isLoaded) {
        subscription.remove();
        warm();
      }
    });
  }
}

export function getChallengePlayer(): AudioPlayer {
  return getPlayer();
}
