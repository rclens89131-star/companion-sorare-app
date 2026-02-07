import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

/* XS_PLAYER_SCREEN_V1: minimal player detail screen using /scout/player/:slug */
export default function PlayerScreen() {
  const params = useLocalSearchParams();
  const slug = String(params.slug ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!slug) return;
      setLoading(true);
      setErr(null);
      try {
        const base =
          process.env.EXPO_PUBLIC_BASE_URL ??
          "http://127.0.0.1:3000";
        const res = await fetch(`${base}/scout/player/${encodeURIComponent(slug)}?first=20`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <View style={{ padding: 12, paddingTop: 16 }}>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>
          Joueur
        </Text>
        <Text style={{ color: "#888", marginTop: 4 }}>
          {slug || "—"}
        </Text>
      </View>

      {loading ? (
        <View style={{ paddingTop: 24 }}>
          <ActivityIndicator />
        </View>
      ) : err ? (
        <View style={{ margin: 12, padding: 12, borderWidth: 1, borderColor: "#5a1", borderRadius: 12 }}>
          <Text style={{ color: "white", fontWeight: "900" }}>Erreur</Text>
          <Text style={{ color: "#ccc", marginTop: 6 }}>{err}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
          <Text style={{ color: "#bbb", fontWeight: "800" }}>Réponse brute</Text>
          <Text style={{ color: "#777", marginTop: 8, fontFamily: "monospace" }}>
            {data ? JSON.stringify(data, null, 2) : "—"}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
