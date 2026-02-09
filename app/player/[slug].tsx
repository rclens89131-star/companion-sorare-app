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
  // XS_PRICE_TEXT_PREF_V1: prefer backend-provided label
  const s = String(card?.priceText || "").trim();
  if (s) return s;
  return (typeof card?.eur === "number" && Number.isFinite(card.eur)) ? `€${card.eur.toFixed(2)}` : "Prix indisponible (public)";
}` : "Prix indisponible (public)"; }

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
        /* ===== XS_PLAYER2_SHAPE_FIX_V1 =====
   Normalize backend response to PlayerRes:
   - v2: { player, offers, meta }
   - legacy: { player?, cards?, note? }
==================================== */
        const raw = (await scoutPlayer(s)) as any;
        if (!alive) return;

        const v2Player = raw?.player || null;
        const v2Offers = Array.isArray(raw?.offers) ? raw.offers : [];
        const legacyPlayer = raw?.player || null;
        const legacyCards = Array.isArray(raw?.cards) ? raw.cards : [];

        const playerObj =
          v2Player
            ? {
                slug: String(v2Player.playerSlug || v2Player.slug || s),
                displayName: v2Player.playerName || v2Player.displayName || null,
                team: v2Player.activeClub?.name || v2Player.team || null,
                position: v2Player.position || null,
                pictureUrl: v2Player.pictureUrl || null,
              }
            : (legacyPlayer
                ? {
                    slug: String(legacyPlayer.slug || s),
                    displayName: legacyPlayer.displayName || null,
                    team: legacyPlayer.team || null,
                    position: legacyPlayer.position || null,
                    pictureUrl: legacyPlayer.pictureUrl || null,
                  }
                : { slug: s, displayName: s, team: null, position: null, pictureUrl: null });

        const cardsArr = (v2Offers.length ? v2Offers : legacyCards);

        const noteTxt =
          raw?.note ||
          raw?.meta?.note ||
          (v2Offers.length ? "v2" : "legacy") ||
          undefined;

        setData({ player: playerObj, cards: cardsArr, note: noteTxt });
/* ===== END XS_PLAYER2_SHAPE_FIX_V1 ===== */} catch (e: any) {
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



