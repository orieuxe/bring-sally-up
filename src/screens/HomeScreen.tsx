import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { moderateScale as ms, scale } from "react-native-size-matters";
import { useFocusEffect } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { getHistory } from "../storage";
import type { RootStackParamList, Attempt } from "../types";
import { scoreColor } from "../utils/color";

type Props = { navigation: StackNavigationProp<RootStackParamList, "Home"> };

export default function HomeScreen({ navigation }: Props) {
  const [lastScore, setLastScore] = useState<Attempt | null>(null);
  const [bestScore, setBestScore] = useState<Attempt | null>(null);
  const [streak, setStreak] = useState(0);
  const [recentAvg, setRecentAvg] = useState(0);

  useFocusEffect(useCallback(() => {
    getHistory().then((h) => {
      if (h.length > 0) {
        setLastScore(h[0]);
        setBestScore(h.reduce((max, a) => (a.duration ?? 0) > (max.duration ?? 0) ? a : max, h[0]));
        let s = 0;
        const today = new Date();
        for (let i = 0; i < h.length; i++) {
          const d = new Date(h[i].date);
          const e = new Date(today); e.setDate(e.getDate() - i);
          if (d.toDateString() === e.toDateString()) s++; else break;
        }
        setStreak(s);
        const recent = h.slice(0, 10).map(a => a.duration ?? 0).filter(t => t > 0);
        if (recent.length > 0) setRecentAvg(recent.reduce((a, b) => a + b, 0) / recent.length);
      }
    });
  }, []));

  const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.center}>
        <Text style={[styles.logo, { fontSize: ms(28), marginBottom: ms(24) }]}>BRING SALLY UP</Text>

        <View style={[styles.scoresRow, { gap: scale(32) }]}>
          <View style={[styles.scoreBox, {
            paddingHorizontal: scale(24), paddingVertical: scale(16), borderRadius: scale(16),
          }]}>
            <Text style={[styles.scoreLabel, { fontSize: ms(11) }]}>record</Text>
            <Text style={[styles.scoreValue, { fontSize: ms(42) }]}>
              {bestScore?.duration != null ? fmt(bestScore.duration) : "--:--"}
            </Text>
            <Text style={[styles.scoreDate, { fontSize: ms(12) }]}>{bestScore?.date ? new Date(bestScore.date).toLocaleDateString("fr", { day: "numeric", month: "short", year: "numeric" }) : ""}</Text>
          </View>
          <View style={[styles.scoreBox, {
            paddingHorizontal: scale(24), paddingVertical: scale(16), borderRadius: scale(16),
          }]}>
            <Text style={[styles.scoreLabel, { fontSize: ms(11) }]}>dernier</Text>
            <Text style={[styles.scoreValue, { fontSize: ms(42), color: lastScore?.duration != null ? scoreColor(lastScore.duration, recentAvg) : "#fff" }]}>
              {lastScore?.duration != null ? fmt(lastScore.duration) : "--:--"}
            </Text>
            <Text style={[styles.scoreDate, { fontSize: ms(12) }]}>{lastScore?.date ? new Date(lastScore.date).toLocaleDateString("fr", { day: "numeric", month: "short", year: "numeric" }) : ""}</Text>
          </View>
        </View>

        {streak > 1 && (
          <Text style={[styles.streak, { fontSize: ms(13) }]}>🔥 {streak} jours de suite</Text>
        )}

        <TouchableOpacity
          style={[styles.goBtn, { width: scale(110), height: scale(110), borderRadius: scale(55) }]}
          onPress={() => navigation.navigate("Challenge")}
        >
          <Text style={[styles.goBtnIcon, { fontSize: ms(36) }]}>▶</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.navBtn, {
            paddingHorizontal: scale(28), paddingVertical: scale(14), borderRadius: scale(28),
          }]}
          onPress={() => navigation.navigate("History")}
        >
          <Text style={[styles.navBtnText, { fontSize: ms(15) }]}>historique</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#16161a" },
  scrollContent: { flexGrow: 1, padding: 20, justifyContent: "center" },
  logo: { fontWeight: "700", color: "#e2b714", letterSpacing: 4 },
  streak: { color: "#e2b714" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scoresRow: { flexDirection: "row", marginBottom: 32 },
  scoreBox: {
    alignItems: "center",
    backgroundColor: "#1c1c22",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)", elevation: 4,
  },
  scoreLabel: { color: "#666", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 },
  scoreValue: { fontWeight: "300", color: "#fff", letterSpacing: 2, fontVariant: ["tabular-nums"] },
  scoreDate: { color: "#555", marginTop: 4 },
  goBtn: {
    backgroundColor: "#e2b714", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 12px rgba(226,183,20,0.4)", elevation: 8,
  },
  goBtnIcon: { color: "#16161a" },
  bottom: { flexDirection: "row", justifyContent: "center", paddingBottom: 20, paddingTop: 16 },
  navBtn: {
    backgroundColor: "#1c1c22",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)", elevation: 2,
  },
  navBtnText: { color: "#aaa", fontWeight: "500", letterSpacing: 1 },
});
