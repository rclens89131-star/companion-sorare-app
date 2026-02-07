import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { scoutRecruter, type RecruiterRow } from "@/src/scoutApi";

/* XS_RECRUTER_TAB_V1: minimal Recruter tab (list players from /scout/recruter) */
export default function RecruterTab() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<RecruiterRow[]>([]);
  const [meta, setMeta] = useState<any>(null);

  const load = async (query?: string) => {
    setLoading(true);
    setErr(null);
    try {
      const res = await scoutRecruter({ first: 60, q: query ?? "" });
      setRows(res.items ?? []);
      setMeta(res.meta ?? null);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r =>
      String(r.playerName ?? "").toLowerCase().includes(s) ||
      String(r.playerSlug ?? "").toLowerCase().includes(s));
  }, [q, rows]);

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <View style={{ padding: 12, paddingTop: 16 }}>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>Recruter</Text>
        <Text style={{ color: "#888", marginTop: 4 }}>
          Liste de joueurs (agrégé depuis le marché public).
        </Text>

        <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Rechercher joueur / club…"
            placeholderTextColor="#666"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#2a2a2a",
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: "white",
              backgroundColor: "#0f0f0f",
            }}
          />
          <Pressable
            onPress={() => load(q)}
            style={{ paddingHorizontal: 12, justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: "#2a2a2a", backgroundColor: "#111" }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>Go</Text>
          </Pressable>
        </View>

        {meta ? (
          <Text style={{ color: "#666", marginTop: 8 }}>
            {filtered.length} joueurs • fetchedAt: {meta.fetchedAt ?? "—"}
          </Text>
        ) : null}
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
          {filtered.map((r) => (
            <Pressable
              key={String(r.playerSlug ?? r.playerName ?? Math.random())}
              onPress={() => r.playerSlug && router.push(`/player/${r.playerSlug}`)}
              style={{
                padding: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#222",
                backgroundColor: "#0b0b0b",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: "white", fontWeight: "900" }}>{r.playerName ?? r.playerSlug ?? "—"}</Text>
              <Text style={{ color: "#999", marginTop: 4 }}>
                {(r.position ?? "—")}
              </Text>
              <Text style={{ color: "#777", marginTop: 6 }}>
                min €: {r.minPriceEur ?? "—"} • offers: {r.offerCount ?? "—"}
              </Text>
            </Pressable>
          ))}

          {filtered.length === 0 ? (
            <Text style={{ color: "#777", textAlign: "center", marginTop: 18 }}>
              Aucun résultat.
            </Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

