import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { moderateScale as ms, scale } from "react-native-size-matters";
import { createAudioPlayer } from "expo-audio";
import Svg, { Circle } from "react-native-svg";
import type { StackNavigationProp } from "@react-navigation/stack";
import { CUES as BUILTIN_CUES, SONG_DURATION as BUILTIN_DURATION } from "../data/cues";
import { getCustomCues, getHistory } from "../storage";
import type { Cue, RootStackParamList } from "../types";
import { scoreColor, ACCENT } from "../utils/color";

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
  const [recentAvg, setRecentAvg] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const cueIndexRef = useRef(-1);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const cuesRef = useRef<Cue[]>(BUILTIN_CUES);
  const songDurationRef = useRef<number>(BUILTIN_DURATION);

  useEffect(() => {
    Promise.all([getCustomCues(), getHistory()]).then(([custom, history]) => {
      if (custom && custom.length > 0) {
        cuesRef.current = custom;
        songDurationRef.current = custom[custom.length - 1].time + 10;
      }
      const recent = history.slice(0, 10).map(a => a.duration ?? 0).filter(t => t > 0);
      if (recent.length > 0) setRecentAvg(recent.reduce((a, b) => a + b, 0) / recent.length);
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

  const ringSize = scale(240);
  const ringStroke = scale(8);
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progress);

  const ringColor = isIntro ? "#333" : scoreColor(displayTime, recentAvg);

  return (
    <View style={styles.container}>
      {phase === "running" && (
        <TouchableOpacity style={styles.container} activeOpacity={1} onPress={isIntro ? undefined : giveUp}>
          <View style={styles.center}>
          <View style={styles.ringContainer}>
            <Svg width={ringSize} height={ringSize} style={{ position: "absolute" }}>
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
                fill="none" stroke="#1f1f2e" strokeWidth={ringStroke}
              />
              <Circle
                cx={ringSize / 2} cy={ringSize / 2} r={ringRadius}
                fill="none"
                stroke={ringColor}
                strokeWidth={ringStroke}
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                rotation={-90}
                origin={`${ringSize / 2}, ${ringSize / 2}`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={[styles.bigTimer, { fontSize: ms(48) }]}>
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
          </View>
          <Text style={[styles.giveUpHint, isIntro && styles.giveUpHintHidden, { position: "absolute", alignSelf: "center", bottom: scale(40) }]}>toucher pour abandonner</Text>
        </TouchableOpacity>
      )}

      {phase === "finished" && (
        <View style={styles.center}>
          <Text style={[styles.resultReps]}>
            {cueIndex + 1}/{cuesRef.current.length} reps
          </Text>

          <View style={styles.adjustRow}>
            <TouchableOpacity style={[styles.adjustBtn, { width: scale(40), height: scale(40), borderRadius: scale(20) }]} onPress={() => { setAdjustedTime((t) => Math.max(0, t - 1)); setSaveMsg(""); }}>
              <Text style={[styles.adjustBtnText, { fontSize: ms(20), lineHeight: scale(40), textAlign: "center" }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.resultTime, { fontSize: ms(54), color: scoreColor(adjustedTime, recentAvg) }]}>
              {Math.floor(adjustedTime / 60)}:
              {(adjustedTime % 60).toString().padStart(2, "0")}
            </Text>
            <TouchableOpacity style={[styles.adjustBtn, { width: scale(40), height: scale(40), borderRadius: scale(20), opacity: adjustedTime >= Math.floor(elapsed - TIMER_OFFSET) ? 0.3 : 1 }]} disabled={adjustedTime >= Math.floor(elapsed - TIMER_OFFSET)} onPress={() => { setAdjustedTime((t) => Math.min(t + 1, Math.floor(elapsed - TIMER_OFFSET))); setSaveMsg(""); }}>
              <Text style={[styles.adjustBtnText, { fontSize: ms(20), lineHeight: scale(40), textAlign: "center" }]}>+</Text>
            </TouchableOpacity>
          </View>

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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: scale(20) },
  ringContainer: { alignItems: "center", justifyContent: "center", marginBottom: scale(12) },
  ringCenter: { position: "absolute", alignItems: "center" },
  bigTimer: { fontWeight: "300", color: "#fff", fontVariant: ["tabular-nums"], letterSpacing: 2 },
  introCount: { fontSize: ms(20), fontWeight: "700", color: "#666", marginTop: scale(4) },
  cueBadge: { minWidth: scale(80), paddingHorizontal: scale(20), paddingVertical: scale(6), borderRadius: scale(12), marginTop: scale(10), alignItems: "center", justifyContent: "center", height: scale(38) },
  cuePlaceholder: { height: scale(38), marginTop: scale(10) },
  cueUp: { backgroundColor: "rgba(76,175,80,0.25)", borderWidth: 1, borderColor: "rgba(76,175,80,0.5)" },
  cueDown: { backgroundColor: "rgba(244,67,54,0.25)", borderWidth: 1, borderColor: "rgba(244,67,54,0.5)" },
  cueBadgeText: { fontSize: ms(18), fontWeight: "800", color: "#fff", letterSpacing: 3 },
  giveUpHint: { fontSize: ms(13), color: "#333" },
  giveUpHintHidden: { opacity: 0 },
  // Finished
  resultReps: { fontVariant: ["tabular-nums"], fontSize: ms(14), color: "#555" },
  resultTime: { fontWeight: "600", letterSpacing: 2, fontVariant: ["tabular-nums"] },
  resultDetail: { color: "#555", marginBottom: scale(8) },
  adjustRow: { flexDirection: "row", alignItems: "center", gap: scale(16), marginBottom: scale(12) },
  adjustBtn: { width: scale(52), height: scale(52), borderRadius: scale(26), backgroundColor: "#222", alignItems: "center", justifyContent: "center" },
  adjustBtnText: { fontSize: ms(24), color: "#aaa", fontWeight: "600" },
  recordMsg: { fontSize: ms(14), color: ACCENT, fontWeight: "600", marginBottom: scale(4) },
  saveMsg: { fontSize: ms(12), color: "#e25a5a", marginBottom: scale(16) },
  saveBtn: { backgroundColor: ACCENT, paddingHorizontal: scale(60), paddingVertical: scale(16), borderRadius: scale(30), marginBottom: scale(10) },
  saveBtnText: { fontSize: ms(18), fontWeight: "700", color: "#16161a" },
  ignoreBtn: { padding: scale(12) },
  ignoreBtnText: { fontSize: ms(13), color: "#444" },
});
