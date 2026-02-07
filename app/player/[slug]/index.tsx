import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { scoutPlayer, type RecruiterPlayer } from "@/src/scoutApi";

/* XS_RECRUTER_PLAYER_ROUTE_V1 */
export default function PlayerDetails() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<RecruiterPlayer | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setErr(null);
    scoutPlayer(String(slug), { first: 80 })
      .then(setData)
      .catch((e) => setErr(e?.message ?? String(e)))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
      <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}>
        <Text style={{ color: "#9cf" }}>← Retour</Text>
      </Pressable>

      <Text style={{ fontSize: 20, fontWeight: "900", color: "white" }}>
        {data?.playerName ?? String(slug ?? "")}
      </Text>

      <Text style={{ color: "#bbb", marginTop: 6 }}>
        {(data?.activeClub?.name ?? "—")} • {(data?.position ?? "—")}
      </Text>

      {loading ? (
        <View style={{ paddingTop: 16 }}>
          <ActivityIndicator />
        </View>
      ) : err ? (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#5a1", borderRadius: 10, marginTop: 12 }}>
          <Text style={{ color: "white", fontWeight: "700" }}>Erreur</Text>
          <Text style={{ color: "#ccc" }}>{err}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
