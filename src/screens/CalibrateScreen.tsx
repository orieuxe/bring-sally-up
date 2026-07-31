import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Vibration,
} from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { saveCustomCues } from '../storage';
import { startChallengeAudio, stopChallengeAudio } from '../challengeAudio';
import type { RootStackParamList, Cue } from '../types';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Calibrate'>;
};

export default function CalibrateScreen({ navigation }: Props) {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [taps, setTaps] = useState<number[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      stopChallengeAudio();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCalibration = async () => {
    setPhase('playing');
    setTaps([]);
    setElapsed(0);

    try {
      await startChallengeAudio();
    } catch {
      // No audio
    }

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed((Date.now() - startTimeRef.current) / 1000);
    }, 50);
  };

  const tap = () => {
    const t = (Date.now() - startTimeRef.current) / 1000;
    setTaps(prev => [...prev, t]);
    if (Platform.OS !== 'web') Vibration.vibrate(50);
  };

  const finish = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopChallengeAudio();
    setPhase('done');

    // Convert taps to cues: first tap = up, second = down, etc.
    if (taps.length >= 2) {
      const cues: Cue[] = taps.map((t, i) => ({
        time: Math.round(t * 10) / 10, // round to 0.1s
        position: i % 2 === 0 ? 'up' : 'down',
      }));
      await saveCustomCues(cues);
    }
  };

  const undoLast = () => {
    setTaps(prev => prev.slice(0, -1));
  };

  const displayTime = elapsed;
  const isIntro = elapsed < 6;

  return (
    <View style={styles.container}>
      {phase === 'ready' && (
        <View style={styles.center}>
          <Text style={styles.title}>Calibration</Text>
          <Text style={styles.help}>
            Lance la chanson et tape sur l'écran à chaque fois que tu entends
            "UP" ou "DOWN".
            {'\n\n'}
            Le 1er tap = UP, le 2ème = DOWN, et ainsi de suite.
          </Text>
          <TouchableOpacity style={styles.goButton} onPress={startCalibration}>
            <Text style={styles.goText}>START</Text>
          </TouchableOpacity>
        </View>
      )}

      {phase === 'playing' && (
        <View style={styles.center}>
          <Text style={styles.tapCount}>
            {taps.length}
            {' '}
            taps
          </Text>
          <Text style={styles.timer}>
            {Math.floor(displayTime / 60)}
            :
            {Math.floor(displayTime % 60)
              .toString()
              .padStart(2, '0')}
          </Text>
          {isIntro && (
            <Text style={styles.introHint}>
              Intro... prépare-toi
            </Text>
          )}
          <TouchableOpacity style={styles.tapButton} onPress={tap}>
            <Text style={styles.tapText}>TAP</Text>
          </TouchableOpacity>
          <View style={styles.bottomRow}>
            <TouchableOpacity style={styles.undoButton} onPress={undoLast}>
              <Text style={styles.undoText}>Annuler dernier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={finish}>
              <Text style={styles.doneText}>Terminé</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {phase === 'done' && (
        <View style={styles.center}>
          <Text style={styles.title}>Calibration OK</Text>
          <Text style={styles.help}>
            {taps.length}
            {' '}
            reps enregistrés.
            {'\n'}
            Tu peux recommencer si besoin.
          </Text>
          <TouchableOpacity
            style={styles.goButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goText}>RETOUR</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#e94560',
    marginBottom: 20,
  },
  help: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    maxWidth: 300,
  },
  goButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 50,
    paddingVertical: 18,
    borderRadius: 16,
  },
  goText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  tapCount: {
    fontSize: 72,
    fontWeight: '900',
    color: '#e94560',
  },
  timer: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
    fontVariant: ['tabular-nums'],
  },
  introHint: {
    fontSize: 14,
    color: '#f0a500',
    marginBottom: 12,
  },
  tapButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#0f3460',
    borderWidth: 6,
    borderColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  tapText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
  },
  bottomRow: {
    flexDirection: 'row',
    gap: 16,
  },
  undoButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  undoText: {
    fontSize: 14,
    color: '#ccc',
  },
  doneButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
