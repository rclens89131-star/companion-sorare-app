import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { scoutPlayer, type ScoutOffer } from "../../src/scoutApi";

// XS_PLAYER_ROUTE_DEFAULT_EXPORT_V1: required by expo-router
type PlayerRes = {
  player?: { slug: string; displayName?: string | null; team?: string | null; position?: string | null; pictureUrl?: string | null } | null;
  offers?: ScoutOffer[] | null;
  cards?: ScoutOffer[] | null;
  note?: string | null;
};

function priceText(card: any) {
  // XS_PRICE_TEXT_SAFE_V1: avoid template literals
  const s = String(card?.priceText || "").trim();
  if (s) return s;
  if (typeof card?.eur === "number" && Number.isFinite(card.eur)) return "€" + card.eur.toFixed(2);
  return "—";
}

export default function PlayerRecruiterScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlayerRes | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const s = String(slug || "").trim();
        if (!s) throw new Error("Slug manquant");

        const raw = (await scoutPlayer(s)) as any;
        if (!alive) return;

        const normalized: PlayerRes = {
          player: raw?.player ?? null,
          offers: raw?.offers ?? null,
          cards: raw?.cards ?? null,
          note: raw?.note ?? raw?.meta?.note ?? null,
        };

        setData(normalized);
      } catch (e: any) {
        if (!alive) return;
        setError(String(e?.message || e));
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const cards = useMemo(() => {
    const arr = (data?.offers ?? data?.cards ?? []) as any[];
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  const title = String(data?.player?.displayName || data?.player?.slug || slug || "Joueur");
  const sub = [data?.player?.position, data?.player?.team].filter(Boolean).join(" • ");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0d1117" }}>
      <View style={{ padding: 12, paddingBottom: 8 }}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={{ color: "#9ba1a6", marginTop: 2 }}>{sub}</Text> : null}
        {data?.note ? <Text style={{ color: "#6e7681", marginTop: 6, fontSize: 12 }}>{String(data.note)}</Text> : null}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color="#58a6ff" />
        </View>
      ) : error ? (
        <View style={{ padding: 12 }}>
          <Text style={{ color: "#ff7b72" }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(it: any, idx: number) => String(it?.offerId || it?.id || it?.slug || "x") + "-" + String(idx)}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          ListEmptyComponent={<Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 20 }}>Aucune offre.</Text>}
          renderItem={({ item }: any) => (
            <View style={{ backgroundColor: "#161b22", borderRadius: 12, padding: 10, marginBottom: 10, flexDirection: "row" }}>
              <Image
                source={{ uri: item?.pictureUrl || "https://via.placeholder.com/100x140.png?text=Card" }}
                style={{ width: 56, height: 78, borderRadius: 8, backgroundColor: "#0d1117", marginRight: 10 }}
              />
              <View style={{ flex: 1, justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700" }} numberOfLines={1}>{String(item?.slug || "Carte")}</Text>
                <Text style={{ color: "#58a6ff", fontWeight: "800", marginTop: 2 }}>{priceText(item)}</Text>
                <Text style={{ color: "#9ba1a6", marginTop: 2 }}>{String(item?.rarity || "rarity inconnue")}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
