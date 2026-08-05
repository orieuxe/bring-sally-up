import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { moderateScale as ms, scale } from 'react-native-size-matters';
import Svg, { Circle } from 'react-native-svg';
import type { StackNavigationProp } from '@react-navigation/stack';
import { CUES, SONG_DURATION } from '../data/cues';
import { getHistory, saveDailyBest } from '../storage';
import { getChallengePlayer, startChallengeAudio, stopChallengeAudio } from '../challengeAudio';
import type { Attempt, Cue, RootStackParamList } from '../types';
import { scoreColor, ACCENT } from '../utils/color';
import { dayKey, formatTime } from '../utils/time';
import { COLORS } from '../theme';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Challenge'>;
};

type Phase = 'running' | 'finished';

const TIMER_OFFSET = 6;
const CUE_DELAY = -0.25;

export default function ChallengeScreen({ navigation }: Props) {
  const [phase, setPhase] = useState<Phase>('running');
  const [elapsed, setElapsed] = useState(0);
  const [currentCue, setCurrentCue] = useState<Cue | null>(null);
  const [cueIndex, setCueIndex] = useState(-1);
  const [adjustedTime, setAdjustedTime] = useState(0);
  const [saveMsg, setSaveMsg] = useState('');
  const [history, setHistory] = useState<Attempt[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  // When the challenge started, not when it was saved: a session begun at 23:59
  // belongs to that evening, even though it is saved a few minutes into the
  // next day — otherwise it would break the very streak it was run to keep.
  const startedAtRef = useRef<Date | null>(null);
  const cueIndexRef = useRef(-1);

  useEffect(() => { getHistory().then(setHistory); }, []);

  const recentAvg = useMemo(() => {
    const recent = history.slice(0, 10).map(a => a.duration ?? 0).filter(t => t > 0);
    return recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  }, [history]);

  // The app-wide player (see challengeAudio.ts) is already playing muted
  // in a loop by the time this screen is reached in the vast majority of
  // cases. Still wait for it to report loaded before starting the
  // challenge, in case the screen is reached before the warm-up finished.
  useEffect(() => {
    const player = getChallengePlayer();
    let started = false;

    const start = () => {
      if (started) return;
      started = true;
      beginChallenge();
    };

    if (player.isLoaded) {
      start();
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }

    const subscription = player.addListener('playbackStatusUpdate', status => {
      if (status.isLoaded) start();
    });
    const fallback = setTimeout(start, 3000);

    return () => {
      subscription.remove();
      clearTimeout(fallback);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Stop audio the instant the screen loses focus (back button/gesture),
  // instead of waiting for the pop animation to finish and the component
  // to unmount — that gap let the old track overlap a freshly started one.
  useEffect(() => navigation.addListener('blur', () => {
    stopChallengeAudio();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }), [navigation]);

  const playMusic = async () => {
    try {
      await startChallengeAudio();
    } catch {
      // No audio
    }
  };

  const beginChallenge = async () => {
    setPhase('running');
    setElapsed(0);
    setCueIndex(-1);
    setCurrentCue(null);
    cueIndexRef.current = -1;

    await playMusic();
    startedAtRef.current = new Date();
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSec = (now - startTimeRef.current!) / 1000;
      setElapsed(elapsedSec);
      const nextIdx = cueIndexRef.current + 1;
      if (nextIdx < CUES.length && elapsedSec >= CUES[nextIdx].time + CUE_DELAY) {
        cueIndexRef.current = nextIdx;
        setCueIndex(nextIdx);
        setCurrentCue(CUES[nextIdx]);
        if (Platform.OS !== 'web') Vibration.vibrate(200);
      }
      if (elapsedSec >= SONG_DURATION) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        stopChallengeAudio();
        finishChallenge();
      }
    }, 100);
  };

  // Reads the clock rather than `elapsed`: when the song ends on its own this
  // runs from the interval closure created at start-up, where that state is
  // still 0 — which used to offer a completed session as 0:00.
  const finishChallenge = async () => {
    const started = startTimeRef.current ?? Date.now();
    setAdjustedTime(Math.max(0, Math.floor((Date.now() - started) / 1000 - TIMER_OFFSET)));
    setPhase('finished');
    // Re-read: the day's entry may have been saved by an earlier run.
    setHistory(await getHistory());
  };

  const todayBest = useMemo(
    () => history.find(a => a.date === dayKey(startedAtRef.current ?? new Date()))?.duration ?? 0,
    [history],
  );

  // Derived from the *adjusted* time, so nudging ± keeps the verdict honest.
  const recordMsg = useMemo(() => {
    if (phase !== 'finished') return '';
    if (history.length === 0) return 'Premier score !';
    const best = Math.max(...history.map(a => a.duration ?? 0));
    if (adjustedTime > best) return 'Record absolu !';
    // Second run of the day: the only thing worth saying is whether it beat
    // the morning's time — anything else would contradict the save.
    if (todayBest > 0) {
      return adjustedTime > todayBest
        ? `Séance du jour améliorée : +${adjustedTime - todayBest}s`
        : '';
    }
    const recentBest = Math.max(...history.slice(0, 10).map(a => a.duration ?? 0));
    return adjustedTime >= recentBest ? 'Meilleur temps des 10 dernières séances' : '';
  }, [phase, adjustedTime, history, todayBest]);

  const giveUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    stopChallengeAudio();
    finishChallenge();
  };

  const saveScore = async () => {
    const score = cueIndexRef.current + 1;
    const startedAt = startedAtRef.current ?? new Date();
    const result = await saveDailyBest({
      date: dayKey(startedAt),
      cuesCompleted: score,
      totalCues: CUES.length,
      completed: score >= CUES.length,
      duration: adjustedTime,
      hour: startedAt.getHours(),
    });
    if (!result.saved) {
      setSaveMsg(`Déjà fait mieux aujourd'hui : ${formatTime(result.existing ?? 0)}`);
      return;
    }
    navigation.goBack();
  };

  const displayTime = Math.max(0, elapsed - TIMER_OFFSET);
  const totalDuration = SONG_DURATION - TIMER_OFFSET;
  const progress = Math.min(displayTime / totalDuration, 1);
  const isIntro = elapsed < TIMER_OFFSET;

  const ringSize = scale(240);
  const ringStroke = scale(8);
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);

  const ringColor = isIntro ? '#333' : scoreColor(displayTime, recentAvg);

  return (
    <View style={styles.container}>
      {phase === 'running' && (
        <TouchableOpacity style={styles.container} activeOpacity={1} onPress={isIntro ? undefined : giveUp}>
          <View style={styles.center}>
            <View style={[styles.ringContainer, { width: ringSize, height: ringSize }]}>
              <Svg width={ringSize} height={ringSize} style={{ position: 'absolute' }}>
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="none"
                  stroke="#1f1f2e"
                  strokeWidth={ringStroke}
                />
                <Circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={ringStroke}
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                />
              </Svg>
              <View style={styles.ringCenter}>
                {isIntro
                  ? (
                      <Text style={[styles.introCount, { fontSize: ms(48) }]}>
                        {TIMER_OFFSET - Math.ceil(elapsed)}
                      </Text>
                    )
                  : (
                      <>
                        <Text style={[styles.bigTimer, { fontSize: ms(48) }]}>
                          {formatTime(displayTime)}
                        </Text>
                        {currentCue
                          ? (
                              <View style={[
                                styles.cueBadge,
                                currentCue.position === 'up' ? styles.cueUp : styles.cueDown,
                              ]}
                              >
                                <Text style={styles.cueBadgeText}>
                                  {currentCue.position === 'up' ? 'UP' : 'DOWN'}
                                </Text>
                              </View>
                            )
                          : (
                              <View style={styles.cuePlaceholder} />
                            )}
                      </>
                    )}
              </View>
            </View>
          </View>
          <Text style={[styles.giveUpHint, isIntro && styles.giveUpHintHidden, {
            position: 'absolute',
            alignSelf: 'center',
            bottom: scale(40),
          }]}
          >
            toucher pour abandonner
          </Text>
        </TouchableOpacity>
      )}

      {phase === 'finished' && (
        <View style={styles.center}>
          <Text style={[styles.resultReps]}>
            {cueIndex + 1}
            /
            {CUES.length}
            {' '}
            reps
          </Text>

          <View style={styles.adjustRow}>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => { setAdjustedTime(t => Math.max(0, t - 1)); setSaveMsg(''); }}>
              <Text style={[styles.adjustBtnText, {
                fontSize: ms(20),
                lineHeight: scale(40),
                textAlign: 'center',
              }]}
              >
                −
              </Text>
            </TouchableOpacity>
            <Text style={[styles.resultTime, {
              fontSize: ms(54),
              color: scoreColor(adjustedTime, recentAvg),
            }]}
            >
              {formatTime(adjustedTime)}
            </Text>
            <TouchableOpacity
              style={[
                styles.adjustBtn,
                { opacity: adjustedTime >= Math.floor(elapsed - TIMER_OFFSET) ? 0.3 : 1 },
              ]}
              disabled={adjustedTime >= Math.floor(elapsed - TIMER_OFFSET)}
              onPress={() => { setAdjustedTime(t => Math.min(t + 1, Math.floor(elapsed - TIMER_OFFSET))); setSaveMsg(''); }}
            >
              <Text style={[styles.adjustBtnText, {
                fontSize: ms(20),
                lineHeight: scale(40),
                textAlign: 'center',
              }]}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>

          {recordMsg !== '' && <Text style={styles.recordMsg}>{recordMsg}</Text>}
          {saveMsg !== '' && <Text style={styles.saveMsg}>{saveMsg}</Text>}

          <TouchableOpacity style={styles.saveBtn} onPress={saveScore}>
            <Text style={styles.saveBtnText}>Sauvegarder</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ignoreBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.ignoreBtnText}>Ignorer</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(20),
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  bigTimer: {
    fontWeight: '300',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  introCount: {
    fontWeight: '700',
    color: COLORS.grey,
    fontVariant: ['tabular-nums'],
  },
  cueBadge: {
    // Fixed (not min) width: UP and DOWN must match exactly so switching
    // between them doesn't jump in size.
    width: scale(100),
    paddingHorizontal: scale(20),
    paddingVertical: scale(6),
    borderRadius: scale(12),
    marginTop: scale(10),
    height: scale(38),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuePlaceholder: {
    height: scale(38),
    marginTop: scale(10),
  },
  cueUp: {
    // Green reads visually lighter than red at the same alpha, so it needs
    // a bit more opacity to feel as bold as the DOWN badge.
    backgroundColor: 'rgba(76,175,80,0.34)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.62)',
  },
  cueDown: {
    backgroundColor: 'rgba(244,67,54,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(244,67,54,0.5)',
  },
  cueBadgeText: {
    fontSize: ms(18),
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: 3,
  },
  giveUpHint: {
    fontSize: ms(13),
    color: COLORS.greyDim,
  },
  giveUpHintHidden: { opacity: 0 },
  // Finished
  resultReps: {
    fontVariant: ['tabular-nums'],
    fontSize: ms(14),
    color: COLORS.greyDim,
  },
  resultTime: {
    fontWeight: '600',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
    marginBottom: scale(12),
  },
  adjustBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustBtnText: {
    fontSize: ms(24),
    color: COLORS.grey,
    fontWeight: '600',
  },
  recordMsg: {
    fontSize: ms(14),
    color: ACCENT,
    fontWeight: '600',
    marginBottom: scale(4),
  },
  saveMsg: {
    fontSize: ms(12),
    color: COLORS.bad,
    marginBottom: scale(16),
  },
  saveBtn: {
    backgroundColor: ACCENT,
    paddingHorizontal: scale(60),
    paddingVertical: scale(16),
    borderRadius: scale(30),
    marginBottom: scale(10),
  },
  saveBtnText: {
    fontSize: ms(18),
    fontWeight: '700',
    color: COLORS.bg,
  },
  ignoreBtn: { padding: scale(12) },
  ignoreBtnText: {
    fontSize: ms(13),
    color: COLORS.greyDim,
  },
});
