import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { scoutRecruter, type RecruiterRow } from "@/src/scoutApi";

const formatEur = (n?: number | null) => {
  if (n === null || n === undefined) return "—";
  try { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n); }
  catch { return `${n}€`; }
};

export default function RecruterScreen() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<RecruiterRow[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  const load = async (qq?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await scoutRecruter({ first: 60, q: (qq ?? q).trim() || undefined });
      setItems(res.items ?? []);
      setFetchedAt(Date.now());
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);

  const data = useMemo(() => items, [items]);

  return (
    <View style={{ flex: 1, padding: 12, gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: "800" }}>Recruter</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Recherche (nom, slug, club)..."
          placeholderTextColor="#888"
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#333",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: "white",
            backgroundColor: "#111",
          }}
          onSubmitEditing={() => load()}
          returnKeyType="search"
        />
        <Pressable
          onPress={() => load()}
          style={{
            paddingHorizontal: 14,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "#333",
            backgroundColor: "#1a1a1a",
          }}
        >
          <Text style={{ color: "white", fontWeight: "700" }}>Go</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ paddingTop: 16 }}>
          <ActivityIndicator />
        </View>
      ) : err ? (
        <View style={{ padding: 12, borderWidth: 1, borderColor: "#5a1", borderRadius: 10 }}>
          <Text style={{ color: "white", fontWeight: "700" }}>Erreur</Text>
          <Text style={{ color: "#ccc" }}>{err}</Text>
        </View>
      ) : data.length === 0 ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: "#bbb" }}>Aucun résultat.</Text>
        </View>
      ) : null}

      <FlatList
        data={data}
        keyExtractor={(it) => it.playerSlug}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => {
          const club = item.activeClub?.name ?? "—";
          const pos = item.position ?? "—";
          const price = formatEur(item.minPriceEur);
          const count = item.offerCount ?? 0;

          return (
            <Pressable
              onPress={() => router.push(`/player/${item.playerSlug}`)}
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: "#2a2a2a",
                borderRadius: 12,
                backgroundColor: "#0f0f0f",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
                {item.playerName ?? item.playerSlug}
              </Text>
              <Text style={{ color: "#bbb", marginTop: 4 }}>
                {club} • {pos} • {count} offres
              </Text>
              <Text style={{ color: "white", marginTop: 6, fontWeight: "700" }}>
                Prix min: {price}
              </Text>
            </Pressable>
          );
        }}
        ListFooterComponent={
          fetchedAt ? (
            <Text style={{ color: "#666", textAlign: "center", paddingTop: 6 }}>
              MAJ: {new Date(fetchedAt).toLocaleString("fr-FR")}
            </Text>
          ) : null
        }
      />
    </View>
  );
}
