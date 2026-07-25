import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { getHistory } from "../storage";
import type { RootStackParamList, Attempt } from "../types";

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "Home">;
};

export default function HomeScreen({ navigation }: Props) {
  const [lastScore, setLastScore] = useState<Attempt | null>(null);
  const [bestScore, setBestScore] = useState<Attempt | null>(null);
  const [streak, setStreak] = useState(0);

  useFocusEffect(
    useCallback(() => {
      getHistory().then((h) => {
        if (h.length > 0) {
          setLastScore(h[0]);
          const best = h.reduce((max, a) => (a.duration ?? 0) > (max.duration ?? 0) ? a : max, h[0]);
          setBestScore(best);
          let s = 0;
          const today = new Date();
          for (let i = 0; i < h.length; i++) {
            const d = new Date(h[i].date);
            const expected = new Date(today);
            expected.setDate(expected.getDate() - i);
            if (d.toDateString() === expected.toDateString()) s++;
            else break;
          }
          setStreak(s);
        }
      });
    }, [])
  );

  const { width: sw } = useWindowDimensions();
  const s = Math.min(1.5, Math.max(0.7, sw / 390)); // scale factor
  const fmt = (t: number) => {
    const m = Math.floor(t / 60);
    const sec = (t % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.center}>
        <Text style={[styles.logo, { fontSize: 28 * s, marginBottom: 24 * s }]}>BRING SALLY UP</Text>

        <View style={[styles.scoresRow, { gap: 32 * s }]}>
          <View style={[styles.scoreBox, { paddingHorizontal: 24 * s, paddingVertical: 16 * s, borderRadius: 16 * s }]}>
            <Text style={[styles.scoreLabel, { fontSize: 11 * s }]}>record</Text>
            <Text style={[styles.scoreValue, { fontSize: 42 * s }]}>
              {bestScore?.duration != null ? fmt(bestScore.duration) : "--:--"}
            </Text>
            <Text style={[styles.scoreDate, { fontSize: 12 * s }]}>{bestScore?.date ?? ""}</Text>
          </View>
          <View style={[styles.scoreBox, { paddingHorizontal: 24 * s, paddingVertical: 16 * s, borderRadius: 16 * s }]}>
            <Text style={[styles.scoreLabel, { fontSize: 11 * s }]}>dernier</Text>
            <Text style={[styles.scoreValue, { fontSize: 42 * s }]}>
              {lastScore?.duration != null ? fmt(lastScore.duration) : "--:--"}
            </Text>
            <Text style={[styles.scoreDate, { fontSize: 12 * s }]}>{lastScore?.date ?? ""}</Text>
          </View>
        </View>

        {streak > 1 && (
          <Text style={[styles.streak, { fontSize: 13 * s }]}>🔥 {streak} jours de suite</Text>
        )}

        <TouchableOpacity
          style={[styles.goBtn, { width: 110 * s, height: 110 * s, borderRadius: 55 * s }]}
          onPress={() => navigation.navigate("Challenge")}
        >
          <Text style={[styles.goBtnIcon, { fontSize: 36 * s }]}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.navBtn, { paddingHorizontal: 28 * s, paddingVertical: 14 * s, borderRadius: 28 * s }]}
          onPress={() => navigation.navigate("History")}
        >
          <Text style={[styles.navBtnText, { fontSize: 15 * s }]}>historique</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#16161a" },
  scrollContent: { flexGrow: 1, padding: 20, justifyContent: "center" },
  logo: { fontSize: 28, fontWeight: "700", color: "#e2b714", letterSpacing: 4, marginBottom: 24 },
  streak: { fontSize: 13, color: "#e2b714", marginBottom: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scoresRow: { flexDirection: "row", gap: 32, marginBottom: 32 },
  scoreBox: {
    alignItems: "center",
    backgroundColor: "#1c1c22",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreLabel: { fontSize: 11, color: "#666", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 },
  scoreValue: { fontSize: 42, fontWeight: "300", color: "#fff", letterSpacing: 2, fontVariant: ["tabular-nums"] },
  scoreDate: { fontSize: 12, color: "#555", marginTop: 4 },
  noScore: { fontSize: 16, color: "#333" },
  goBtn: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "#e2b714",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#e2b714",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  goBtnIcon: { fontSize: 36, color: "#16161a", marginLeft: 3 },
  bottom: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingBottom: 20,
    paddingTop: 16,
  },
  navBtn: {
    backgroundColor: "#1c1c22",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  navBtnText: { fontSize: 15, color: "#aaa", fontWeight: "500", letterSpacing: 1 },
});
