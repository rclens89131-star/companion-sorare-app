import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, SafeAreaView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { scoutPlayer, type ScoutOffer } from "../../src/scoutApi";

// XS_RECRUTER_PLAYER_SCREEN_V1_BEGIN
type PlayerRes = {
  player?: { slug: string; displayName?: string | null; team?: string | null; position?: string | null; pictureUrl?: string | null } | null;
  cards?: ScoutOffer[];
  note?: string;
};

function priceText(card: any) {
  return typeof card?.eur === "number" ? `€${card.eur.toFixed(2)}` : "—";
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
        const res = (await scoutPlayer(s)) as any;
        if (!alive) return;
        setData(res);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Erreur chargement joueur");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [slug]);

  const cards = useMemo(() => (data?.cards || []), [data]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f1115" }}>
      <View style={{ padding: 12 }}>
        <Text style={{ color: "white", fontSize: 22, fontWeight: "800" }}>
          {data?.player?.displayName || String(slug || "")}
        </Text>
        <Text style={{ color: "#9ba1a6", marginTop: 4 }}>
          {(data?.player?.team || "Club inconnu")} · {(data?.player?.position || "N/A")}
        </Text>
        {data?.note ? <Text style={{ color: "#6e7681", marginTop: 6, fontSize: 12 }}>{data.note}</Text> : null}
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
          keyExtractor={(it, idx) => `${(it as any)?.offerId || (it as any)?.slug || "x"}-${idx}`}
          contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
          ListEmptyComponent={<Text style={{ color: "#9ba1a6", textAlign: "center", marginTop: 20 }}>Aucune offre.</Text>}
          renderItem={({ item }: any) => (
            <View style={{ backgroundColor: "#161b22", borderRadius: 12, padding: 10, marginBottom: 10, flexDirection: "row" }}>
              <Image
                source={{ uri: item?.pictureUrl || "https://via.placeholder.com/100x140.png?text=Card" }}
                style={{ width: 56, height: 78, borderRadius: 8, backgroundColor: "#0d1117", marginRight: 10 }}
              />
              <View style={{ flex: 1, justifyContent: "center" }}>
                <Text style={{ color: "#fff", fontWeight: "700" }} numberOfLines={1}>{item?.slug || "Carte"}</Text>
                <Text style={{ color: "#58a6ff", fontWeight: "800" }}>{priceText(item)}</Text>
                <Text style={{ color: "#9ba1a6" }}>{String(item?.rarity || "rarity inconnue")}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
// XS_RECRUTER_PLAYER_SCREEN_V1_END