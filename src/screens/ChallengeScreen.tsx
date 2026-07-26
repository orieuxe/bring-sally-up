import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { createAudioPlayer } from "expo-audio";
import Svg, { Circle } from "react-native-svg";
import type { StackNavigationProp } from "@react-navigation/stack";
import { CUES as BUILTIN_CUES, SONG_DURATION as BUILTIN_DURATION } from "../data/cues";
import { getCustomCues, getHistory } from "../storage";
import type { Cue, RootStackParamList } from "../types";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "Challenge">;
};

type Phase = "running" | "finished";

const TIMER_OFFSET = 6;
const CUE_DELAY = -0.25;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const audioSource = require("../../assets/sally.mp3");

export default function ChallengeScreen({ navigation }: Props) {
  const [phase, setPhase] = useState<Phase>("running");
  const [elapsed, setElapsed] = useState(0);
  const [currentCue, setCurrentCue] = useState<Cue | null>(null);
  const [cueIndex, setCueIndex] = useState(-1);
  const [failed, setFailed] = useState(false);
  const [adjustedTime, setAdjustedTime] = useState(0);
  const [saveMsg, setSaveMsg] = useState("");
  const [recordMsg, setRecordMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const cueIndexRef = useRef(-1);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const cuesRef = useRef<Cue[]>(BUILTIN_CUES);
  const songDurationRef = useRef<number>(BUILTIN_DURATION);

  useEffect(() => {
    getCustomCues().then((custom) => {
      if (custom && custom.length > 0) {
        cuesRef.current = custom;
        songDurationRef.current = custom[custom.length - 1].time + 10;
      }
    });
  }, []);

  // Auto-start on mount
  useEffect(() => {
    beginChallenge();
    return () => {
      if (playerRef.current) playerRef.current.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const playMusic = () => {
    try {
      const player = createAudioPlayer(audioSource);
      playerRef.current = player;
      player.play();
    } catch {
      // No audio
    }
  };

  const beginChallenge = () => {
    setPhase("running");
    setElapsed(0);
    setCueIndex(-1);
    setCurrentCue(null);
    setFailed(false);
    cueIndexRef.current = -1;
    startTimeRef.current = Date.now();
    playMusic();

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSec = (now - startTimeRef.current!) / 1000;
      setElapsed(elapsedSec);
      const nextIdx = cueIndexRef.current + 1;
      if (nextIdx < cuesRef.current.length && elapsedSec >= cuesRef.current[nextIdx].time + CUE_DELAY) {
        cueIndexRef.current = nextIdx;
        setCueIndex(nextIdx);
        setCurrentCue(cuesRef.current[nextIdx]);
        if (Platform.OS !== "web") Vibration.vibrate(200);
      }
      if (elapsedSec >= songDurationRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        if (playerRef.current) playerRef.current.pause();
        finishChallenge();
      }
    }, 100);
  };

  const finishChallenge = async () => {
    const time = Math.max(0, Math.floor(elapsed - TIMER_OFFSET));
    setAdjustedTime(time);
    setPhase("finished");

    // Check records
    const history = await getHistory();
    if (history.length === 0) {
      setRecordMsg("Premier score !");
    } else {
      const best = Math.max(...history.map((a) => a.duration ?? 0));
      if (time > best) {
        setRecordMsg("Record absolu !");
      } else {
        // Best in last 10 sessions
        const recent = history.slice(0, 10);
        const recentBest = Math.max(...recent.map((a) => a.duration ?? 0));
        if (time >= recentBest) {
          setRecordMsg(`Meilleur temps des 10 dernières séances`);
        } else {
          setRecordMsg("");
        }
      }
    }
  };

  const giveUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    if (playerRef.current) playerRef.current.pause();
    setFailed(true);
    finishChallenge();
  };

  const saveScore = async () => {
    const today = new Date().toISOString().split("T")[0];
    const history = await getHistory();
    const todayEntry = history.find((a) => a.date === today);
    const score = cueIndexRef.current + 1;
    if (todayEntry && adjustedTime <= (todayEntry.duration ?? 0)) {
      const mins = Math.floor((todayEntry.duration ?? 0) / 60);
      const secs = ((todayEntry.duration ?? 0) % 60).toString().padStart(2, "0");
      setSaveMsg(`Déjà fait mieux aujourd'hui : ${mins}:${secs}`);
      return;
    }
    const filtered = history.filter((a) => a.date !== today);
    filtered.push({
      date: today,
      cuesCompleted: score,
      totalCues: cuesRef.current.length,
      completed: score >= cuesRef.current.length,
      duration: adjustedTime,
    });
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const { default: AsyncStorage } = await import("@react-native-async-storage/async-storage");
    await AsyncStorage.setItem("@sally_history", JSON.stringify(filtered));
    navigation.goBack();
  };

  const displayTime = Math.max(0, elapsed - TIMER_OFFSET);
  const totalDuration = songDurationRef.current - TIMER_OFFSET;
  const progress = Math.min(displayTime / totalDuration, 1);
  const isIntro = elapsed < TIMER_OFFSET;

  // Progress ring color: green → yellow → orange → red
  const ringColor = (() => {
    if (isIntro) return "#333";
    if (progress < 0.33) return "#4caf50";
    if (progress < 0.66) {
      const t = (progress - 0.33) / 0.33;
      const r = Math.round(76 + t * (226 - 76));
      const g = Math.round(175 + t * (183 - 175));
      const b = Math.round(80 + t * (20 - 80));
      return `rgb(${r},${g},${b})`;
    }
    if (progress < 0.85) {
      const t = (progress - 0.66) / 0.19;
      const r = Math.round(226 + t * (244 - 226));
      const g = Math.round(183 + t * (67 - 183));
      const b = Math.round(20 + t * (54 - 20));
      return `rgb(${r},${g},${b})`;
    }
    return "#f44336";
  })();

  // Circular progress ring params
  const size = 240;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <View style={styles.container}>
      {phase === "running" && (
        <TouchableOpacity style={styles.center} onPress={isIntro ? undefined : giveUp} activeOpacity={isIntro ? 1 : 0.95}>
          {/* Circular progress ring */}
          <View style={styles.ringContainer}>
            <Svg width={size} height={size} style={{ position: "absolute" }}>
              <Circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none" stroke="#1f1f2e" strokeWidth={stroke}
              />
              <Circle
                cx={size / 2} cy={size / 2} r={radius}
                fill="none"
                stroke={ringColor}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={styles.bigTimer}>
                {Math.floor(displayTime / 60)}:
                {Math.floor(displayTime % 60).toString().padStart(2, "0")}
              </Text>
              {isIntro && (
                <Text style={styles.introCount}>{TIMER_OFFSET - Math.ceil(elapsed)}</Text>
              )}
              {!isIntro && currentCue && (
                <View style={[
                  styles.cueBadge,
                  currentCue.position === "up" ? styles.cueUp : styles.cueDown,
                ]}>
                  <Text style={styles.cueBadgeText}>
                    {currentCue.position === "up" ? "UP" : "DOWN"}
                  </Text>
                </View>
              )}
              {!isIntro && !currentCue && (
                <View style={styles.cuePlaceholder} />
              )}
            </View>
          </View>

          <Text style={styles.cueCounter}>
            {cueIndex + 1}/{cuesRef.current.length}
          </Text>

          <Text style={[styles.giveUpHint, isIntro && styles.giveUpHintHidden]}>toucher pour abandonner</Text>
        </TouchableOpacity>
      )}

      {phase === "finished" && (
        <View style={styles.center}>
          <Text style={styles.resultLabel}>temps</Text>

          <View style={styles.adjustRow}>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => { setAdjustedTime((t) => Math.max(0, t - 1)); setSaveMsg(""); }}>
              <Text style={styles.adjustBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.resultTime}>
              {Math.floor(adjustedTime / 60)}:
              {(adjustedTime % 60).toString().padStart(2, "0")}
            </Text>
            <TouchableOpacity style={styles.adjustBtn} onPress={() => { setAdjustedTime((t) => t + 1); setSaveMsg(""); }}>
              <Text style={styles.adjustBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.resultDetail}>
            {cueIndex + 1}/{cuesRef.current.length} reps
          </Text>

          {recordMsg !== "" && <Text style={styles.recordMsg}>{recordMsg}</Text>}
          {saveMsg !== "" && <Text style={styles.saveMsg}>{saveMsg}</Text>}

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
  container: { flex: 1, backgroundColor: "#16161a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  runningTitle: { fontSize: 18, fontWeight: "300", color: "#e2b714", letterSpacing: 4, marginBottom: 12 },
  ringContainer: { width: 240, height: 240, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  ringCenter: { position: "absolute", alignItems: "center" },
  bigTimer: { fontSize: 52, fontWeight: "300", color: "#fff", fontVariant: ["tabular-nums"], letterSpacing: 2 },
  introCount: { fontSize: 24, fontWeight: "700", color: "#666", marginTop: 4 },
  cueBadge: { minWidth: 80, paddingHorizontal: 20, paddingVertical: 6, borderRadius: 12, marginTop: 10, alignItems: "center", justifyContent: "center", height: 38 },
  cuePlaceholder: { height: 38, marginTop: 10 },
  cueUp: { backgroundColor: "rgba(76,175,80,0.25)", borderWidth: 1, borderColor: "rgba(76,175,80,0.5)" },
  cueDown: { backgroundColor: "rgba(244,67,54,0.25)", borderWidth: 1, borderColor: "rgba(244,67,54,0.5)" },
  cueBadgeText: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: 3 },
  cueCounter: { fontSize: 13, color: "#555", marginTop: 8 },
  giveUpHint: { fontSize: 12, color: "#333", marginTop: 30, height: 18 },
  giveUpHintHidden: { opacity: 0 },
  // Finished
  resultLabel: { fontSize: 12, color: "#444", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 },
  resultTime: { fontSize: 56, fontWeight: "300", color: "#e2b714", letterSpacing: 2, fontVariant: ["tabular-nums"] },
  resultDetail: { fontSize: 13, color: "#555", marginBottom: 8 },
  adjustRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 12 },
  adjustBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#222", alignItems: "center", justifyContent: "center" },
  adjustBtnText: { fontSize: 26, color: "#aaa", fontWeight: "600" },
  recordMsg: { fontSize: 14, color: "#e2b714", fontWeight: "600", marginBottom: 4 },
  saveMsg: { fontSize: 12, color: "#e25a5a", marginBottom: 16 },
  saveBtn: { backgroundColor: "#e2b714", paddingHorizontal: 60, paddingVertical: 16, borderRadius: 30, marginBottom: 10 },
  saveBtnText: { fontSize: 18, fontWeight: "700", color: "#16161a" },
  ignoreBtn: { padding: 12 },
  ignoreBtnText: { fontSize: 13, color: "#444" },
});
