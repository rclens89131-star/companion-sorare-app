/* XS_MARKET_DEVICEID_OPTIONAL_V2 */
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator,
  FlatList,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View, Image, Modal, Pressable, TextInput } from "react-native"; /* XS_RECRUTER_UI_V1_IMPORT */
import AsyncStorage from "@react-native-async-storage/async-storage";

type MarketOffer = {
  id: string;
  status?: string;

  cardSlug?: string;
  cardName?: string;

  pictureUrl?: string; // XS_MARKET_APP_IMG_V1
  rarity?: string;
  collection?: string;

  eur?: number | null;
  eth?: number | null;
  wei?: string | null;

  price?: { currency: "EUR" | "WEI" | string; amount: any } | null;
  priceText?: string;

  [k: string]: any;
};

// XS_MARKET_DEDUPE_OFFERS_V1: avoid duplicate offers when pagination returns same items
function offerKeyV1(o: MarketOffer) {
  return String(o?.id || o?.cardSlug || "");
}
function dedupeOffersByKey(prev: MarketOffer[], next: MarketOffer[]) {
  const map = new Map<string, MarketOffer>();
  const put = (o: MarketOffer) => {
    const k = offerKeyV1(o);
    if (!k) return;
    map.set(k, o);
  };
  prev.forEach(put);
  next.forEach(put);
  return Array.from(map.values());
}type MarketOffersResponse = {
  ok: boolean;
  fromCache?: boolean;
  count?: number;   // total renvoyé par backend (après ses filtres)
  items: MarketOffer[];
  error?: string;
};

const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL ?? "http://127.0.0.1:3000";

async function getStoredDeviceId(): Promise<string | null> {
  const v = await AsyncStorage.getItem("deviceId");
  /* XS_UI_MARKET_RENDER_GATE_HINT_V1: etape suivante -> conditionner le rendu marche sur uiTab==='marche' */
return (v && v.trim() ? v.trim() : null); // XS_GETSTOREDDEVICEID_PUBLIC_V2
}
async function fetchMarketOffers(
  baseUrl: string,
  deviceId: string | null,
  first = 50,
  eurOnly = false
) {
  const qs = new URLSearchParams();
  // XS_FIX_FETCHMARKETOFFER_NO_DEVICEID_V1: never send deviceId to /scout/cards (forces OAuth path -> empty)
  qs.set("first", String(first));
  if (eurOnly) {
    qs.set("allowUnknownPrices", "1"); /* XS_ALLOW_UNKNOWN_PRICES_MARKET_V1 */
  }

  const url = `${baseUrl}/scout/cards?${qs.toString()}`;
  // XS_FIX_NO_DEVICEID_SCOUT_CARDS_V1: do NOT send deviceId to /scout/cards (forces OAuth path -> empty)
  const res = await fetch(url);
  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Réponse non-JSON: ${text.slice(0, 160)}`);
  }

  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return { url, data: json as MarketOffersResponse };
}

function formatPrice(o: MarketOffer) {
  if (o?.priceText != null && !String(o.priceText).trim()) return "—"; // XS_ALLOW_UNKNOWN_PRICES_UI_V2
  if (o?.priceText && o.priceText.trim()) return o.priceText;
  if (typeof o?.eur === "number") return `€${o.eur.toFixed(2)}`;
  if (o?.wei) return `WEI ${o.wei}`;
  if (o?.price?.currency === "WEI" && o?.price?.amount) return `WEI ${String(o.price.amount)}`;
  return "—";
}

function norm(s?: string) {
  return String(s || "").trim().toLowerCase();
}

export default function MarketScreen() {
  
  
  
  
  // XS_UI_MARKET_SHELL_STATE_V1
  const [uiTab, setUiTab] = useState<"watchlist" | "marche" | "alertes">("watchlist");
  const [marketLoaded, setMarketLoaded] = useState(false);
  const [qUi, setQUi] = useState("");
// XS_TRENDING_UI_V1
  const BASE_URL =
    (process.env.EXPO_PUBLIC_BASE_URL as string) ||
    (process.env.EXPO_PUBLIC_API_URL as string) ||
    "http://127.0.0.1:3000";

  type TrendingItem = { searchTerm?: string; q?: string; count?: number };

  // XS_UI_MARKET_LOAD_ON_DEMAND_V1
  const loadMarketOnDemand = async () => {
    if (marketLoaded) return;
    setMarketLoaded(true);
    try {
      await loadOffers(true); // XS_UI_MARKET_LOAD_ON_DEMAND_CALL_LOADOFFERS_V1
    } catch (e) {
      // laisse l'erreur UI existante gérer si tu en as une
    }
  };

  const [trending, setTrending] = React.useState<TrendingItem[]>([]);
  const [trendingLoading, setTrendingLoading] = React.useState(false);
  const [trendingError, setTrendingError] = React.useState<string | null>(null);

  const loadTrending = React.useCallback(async () => {
    try {
      setTrendingLoading(true);
      setTrendingError(null);
      const r = await fetch(`${BASE_URL}/scout/players/trending?limit=10`); // XS_FIX_TRENDING_FETCH_SEMI_V1
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      const items = Array.isArray(j?.items) ? j.items : [];
      setTrending(items);
    } catch (e: any) {
      setTrendingError(e?.message || "error");
      setTrending([]);
    } finally {
      setTrendingLoading(false);
    }
  }, [BASE_URL]);

  React.useEffect(() => {
    loadTrending();
  }, [loadTrending]);

// XS_DEVICEID_STATE_V3_BEGIN
  const [deviceId, setDeviceId] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const v = await getStoredDeviceId(); if (alive && v) setDeviceId(String(v));
      } catch {}
    })();
    /* XS_UI_MARKET_RENDER_GATE_HINT_V1: etape suivante -> conditionner le rendu marche sur uiTab==='marche' */
return () => { alive = false; };
  }, []);
  // XS_DEVICEID_STATE_V3_END
// XS_MARKET_V3_STATE_V1_BEGIN
  const [selected, setSelected] = useState<MarketOffer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const xsOpenOffer = (it: MarketOffer) => {
    setSelected(it);
    setModalOpen(true);
  };
  const xsCloseOffer = () => setModalOpen(false);
  // XS_MARKET_V3_STATE_V1_END
const [offers, setOffers] = useState<MarketOffer[]>([]);
  const [error, setError] = useState<string | null>(null); // XS_FIX_ERROR_STATE_V1
  const [loading, setLoading] = useState(false); // XS_FIX_LOADING_STATE_V2
  const [meta, setMeta] = useState<{ fromCache?: boolean; count?: number } | null>(null); // XS_FIX_META_STATE_V1
  
  const [fetchedAt, setFetchedAt] = useState<number>(0); // XS_DEBUG_PROBE_V1 // UI settings
  const [first, setFirst] = useState(50);
  const [eurOnly, setEurOnly] = useState(false);
  const [footballOnly, setFootballOnly] = useState(true);
  const [rarity, setRarity] = useState<"all" | "limited" | "rare" | "super_rare" | "unique">("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  

  // XS_RECRUTER_UI_V1_BEGIN
  const [activeTab, setActiveTab] = useState<"Explore" | "Recruter" | "Watchlists">("Recruter");
  const [searchQuery, setSearchQuery] = useState("");
  const [titulaireOnly, setTitulaireOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // XS_RECRUTER_UI_V1_END// debug
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [lastDeviceId, setLastDeviceId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const fetched = offers.length;
    const eurCount = offers.filter(o => typeof o.eur === "number" && o.eur !== null).length;
    return { fetched, eurCount };
  }, [offers]);
  // XS_MARKET_DEBUG_COUNTS_V1_BEGIN
  const debugCounts = useMemo(() => {
    const arr = Array.isArray(offers) ? offers : [];
    const eurNum = arr.filter(o => typeof (o as any).eur === "number").length;
    const ptNotNull = arr.filter(o => (o as any).priceText != null).length;
    const ptEmpty = arr.filter(o => (o as any).priceText != null && !String((o as any).priceText).trim()).length;
    const ptNonEmpty = arr.filter(o => (o as any).priceText != null && String((o as any).priceText).trim()).length;
    const teamSlug = arr.filter(o => Boolean((o as any).teamSlug)).length;
    return { total: arr.length, eurNum, ptNotNull, ptEmpty, ptNonEmpty, teamSlug };
  }, [offers]);
  // XS_MARKET_DEBUG_COUNTS_V1_END
  // XS_MARKET_V3_PREFETCH_V1_BEGIN
  useEffect(() => {
    try {
      const urls = (offers || [])
        .map((o: any) => o?.pictureUrl)
        .filter((u: any) => typeof u === "string" && u.startsWith("http"));
      // évite d'exploser la RAM: on précharge juste les 12 premières
      urls.slice(0, 12).forEach((u: string) => { Image.prefetch(u); });
    } catch {}
  }, [offers]);
  // XS_MARKET_V3_PREFETCH_V1_END


  const shown = useMemo(() => {
    let arr = offers.slice();
if (footballOnly) {
      arr = arr.filter(o => !o.collection || norm(o.collection) === "football");
    }

    if (eurOnly) {
      arr = arr.filter(o => (typeof o.eur === "number" && o.eur !== null) || (o.priceText != null) /* XS_ALLOW_UNKNOWN_PRICES_APP_V1 */ || o.eth || o.wei || (o.price?.currency === "WEI" && o.price?.amount));
    }

    if (rarity !== "all") {
      arr = arr.filter(o => norm(o.rarity) === rarity);
    }

    // tri prix EUR (les null vont à la fin si eurOnly=false)
    arr.sort((a, b) => {
      const ae = typeof a.eur === "number" ? a.eur : Number.POSITIVE_INFINITY;
      const be = typeof b.eur === "number" ? b.eur : Number.POSITIVE_INFINITY;
      return sortAsc ? (ae - be) : (be - ae);
    });

    

    // XS_RECRUTER_UI_V1_SEARCH
    if (searchQuery.trim()) {
      const q = norm(searchQuery);
      arr = arr.filter((o) => norm(o.cardName).includes(q) || norm(o.cardSlug).includes(q));
    }

    return arr;
  }, [offers, eurOnly, footballOnly, rarity, sortAsc]);

  const loadOffers = async (force?: boolean) => {
    // XS_UI_MARKET_LOADOFFERS_FORCE_V1: gate market load unless forced
    if (!force && !marketLoaded) { return; }
    try {
      setLoading(true);
      setError(null);

      const deviceId = await getStoredDeviceId().catch(() => null); // XS_RECRUIT_FIX_LOAD_DEVICEID_OPTIONAL_V1

      setLastDeviceId(deviceId);

      const { url, data } = await fetchMarketOffers(BASE_URL, deviceId ?? null, first, eurOnly);
      setLastUrl(url);

      
      // XS_DEBUG_PROBE_UI_V1_NOTE: UI hook not auto-injected (no <Text>{lastUrl}</Text> exact match).{
        const raw = Array.isArray(data.items) ? data.items : [];
        const normalized = raw.map((it: any, idx: number) => ({
          ...it,
          // XS_FIX_SCOUT_NORMALIZE_FIELDS_V1_BEGIN
          cardSlug: String(it?.cardSlug || it?.slug || ""),
          cardName: String(it?.cardName || it?.playerName || ""),
          collection: it?.collection ?? ((it?.team || it?.playerName || it?.positions) ? "football" : undefined),
          // XS_FIX_SCOUT_NORMALIZE_FIELDS_V1_END
          id: String(it?.offerId || it?.slug || it?.cardSlug || it?.id || ("row-" + idx)),
        }));
        setOffers(normalized);
      
        setFetchedAt(Date.now()); // XS_DEBUG_PROBE_V1}
setMeta({ fromCache: data.fromCache, count: data.count });
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  const Chip = ({
    label,
    active,
    onPress,
  }: {
    label: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 999,
        backgroundColor: active ? "#1f6feb" : "#222",
        marginRight: 8,
        marginTop: 8,
      }}
    >
      <Text style={{ color: "white", fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </TouchableOpacity>
  );

          // XS_RECRUTER_UI_V1_ROWS_BEGIN
  const renderItem = ({ item }: { item: MarketOffer }) => {
    const isSkeleton = typeof item?.id === "string" && item.id.startsWith("sk-");
    if (isSkeleton) {
      /* XS_UI_MARKET_RENDER_GATE_HINT_V1: etape suivante -> conditionner le rendu marche sur uiTab==='marche' */
return (<View style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1a1a1f" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 54, height: 72, borderRadius: 8, backgroundColor: "#17171d" }} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <View style={{ width: "70%", height: 12, borderRadius: 8, backgroundColor: "#17171d" }} />
              <View style={{ width: "40%", height: 10, borderRadius: 8, backgroundColor: "#17171d", marginTop: 8 }} />
            </View>
          </View>
        </View>
      );
    }

    /* XS_UI_MARKET_RENDER_GATE_HINT_V1: etape suivante -> conditionner le rendu marche sur uiTab==='marche' */
return (<Pressable
        onPress={() => xsOpenOffer(item)}
        style={{ paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1a1a1f" }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {item.pictureUrl ? (
            <Image source={{ uri: item.pictureUrl }} style={{ width: 54, height: 72, borderRadius: 8, backgroundColor: "#121217" }} resizeMode="cover" />
          ) : (
            <View style={{ width: 54, height: 72, borderRadius: 8, backgroundColor: "#151519", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#666", fontSize: 10, fontWeight: "700" }}>No image</Text>
            </View>
          )}

          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text numberOfLines={1} style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>
              {item.cardName || item.cardSlug || item.id}
            </Text>

            {/* placeholders: poste/âge tant qu’on n’a pas l’enrichissement joueur */}
            <Text style={{ marginTop: 4, color: "#8f95a3", fontSize: 12, fontWeight: "600" }}>DF • 26 ans</Text>

            {/* placeholders stats */}
            <View style={{ flexDirection: "row", marginTop: 8 }}>
              {["L5 42", "L15 49", "L40 51"].map((badge) => (
                <View key={badge} style={{ paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: "#171a22", marginRight: 6 }}>
                  <Text style={{ color: "#b8c2d9", fontSize: 10, fontWeight: "700" }}>{badge}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{formatPrice(item)}</Text>
            <Pressable
              onPress={() => {}}
              hitSlop={8}
              style={{ marginTop: 8, width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#2a2d36", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ color: "#c8ccd5", fontWeight: "900" }}>···</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };
  // XS_RECRUTER_UI_V1_ROWS_END

  // XS_MARKET_GRID_V2
  // XS_MARKET_V3_V1
  // XS_MARKET_CARD_UI_V1

  /* XS_UI_MARKET_RENDER_GATE_HINT_V1: etape suivante -> conditionner le rendu marche sur uiTab==='marche' */
return (<SafeAreaView style={{ flex: 1, backgroundColor: "#050509" }}>
<View style={{ padding: 12, backgroundColor: '#ff00ff' }}><Text style={{ color: 'black', fontWeight: '900' }}>XS_UI_MARKET_PROBE_V1 — SI TU VOIS PAS ÇA, T’ES PAS SUR CE FICHIER</Text></View>

{/* XS_UI_MARKET_SHELL_V1 */}
<View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 }}>
  <Text style={{ fontSize: 22, fontWeight: "800" }}>Recruter</Text>
  <Text style={{ opacity: 0.7, marginTop: 2 }}>Watchlist, Marché, Alertes — et rien ne charge sans ton feu vert.</Text>

  <View style={{ marginTop: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 }}>
    <TextInput
      value={qUi}
      onChangeText={setQUi}
      placeholder="Rechercher un joueur, un club, une ligue…"
      placeholderTextColor="rgba(255,255,255,0.45)"
      style={{ color: "white" }}
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
    />
  </View>

  <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
    {[
      ["watchlist","Watchlist"],
      ["marche","Marché"],
      ["alertes","Alertes"],
    ].map(([key,label]) => {
      const active = uiTab === key;
      /* XS_UI_MARKET_RENDER_GATE_HINT_V1: etape suivante -> conditionner le rendu marche sur uiTab==='marche' */
return (<Pressable
          key={key}
          onPress={() => setUiTab(key as any)}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
            backgroundColor: active ? "rgba(255,255,255,0.10)" : "transparent",
          }}
        >
          <Text style={{ color: "white", fontWeight: active ? "700" : "600" }}>{label}</Text>
        </Pressable>
      );
    })}
  </View>

  {uiTab === "marche" && !marketLoaded && (
    <Pressable
      onPress={loadMarketOnDemand}
      style={{
        marginTop: 12,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
        backgroundColor: "rgba(255,255,255,0.06)",
      }}
    >
      <Text style={{ color: "white", fontWeight: "800" }}>Charger le marché</Text>
      <Text style={{ color: "rgba(255,255,255,0.7)", marginTop: 2, fontSize: 12 }}>
        (pas de chargement auto — moins de rate-limit)
      </Text>
    </Pressable>
  )}
</View>

      
{/* XS_TRENDING_TOP_V2 */}
<View style={{ marginHorizontal: 12, marginTop: 6, marginBottom: 10 }}>
  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
    <Text style={{ fontSize: 16, fontWeight: "700" }}>Tendances</Text>
    <Pressable onPress={loadTrending} hitSlop={8}>
      <Text style={{ fontSize: 12, opacity: 0.8 }}>Rafraîchir</Text>
    </Pressable>
  </View>

  {trendingLoading ? (
    <Text style={{ fontSize: 12, opacity: 0.8 }}>Chargement…</Text>
  ) : trendingError ? (
    <Text style={{ fontSize: 12, opacity: 0.8 }}>Erreur: {trendingError}</Text>
  ) : trending.length === 0 ? (
    <Text style={{ fontSize: 12, opacity: 0.8 }}>Aucune tendance pour l’instant.</Text>
  ) : (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {trending.slice(0, 10).map((t, idx) => (
        <Pressable
          key={(t.searchTerm || t.q || "t") + "_" + idx}
          onPress={() => { const term = String(t.searchTerm || t.q || "").trim(); if (term) {/* TODO hook search setter */} }} // XS_FIX_TRENDING_SETQ_V1
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            marginRight: 8,
            marginBottom: 8,
            opacity: 0.95,
          }}
        >
          <Text style={{ fontSize: 12 }}>
            {t.searchTerm || t.q}{" "}
            <Text style={{ opacity: 0.7 }}>({t.count || 0})</Text>
          </Text>
        </Pressable>
      ))}
    </View>
  )}
</View>
{/* XS_TRENDING_TOP_V2_END */}
<View style={{ padding: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "white" }}>Recruter</Text>

{/* XS_RECRUTER_UI_V1_TOP_BEGIN */}
<View style={{ flexDirection: "row", marginTop: 12, backgroundColor: "#111218", borderRadius: 10, padding: 4 }}>
  {(["Explore", "Recruter", "Watchlists"] as const).map((tab) => (
    <Pressable
      key={tab}
      onPress={() => setActiveTab(tab)}
      style={{
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: activeTab === tab ? "#232634" : "transparent",
        alignItems: "center",
      }}
    >
      <Text style={{ color: activeTab === tab ? "#fff" : "#7f8698", fontWeight: "700", fontSize: 12 }}>{tab}</Text>
    </Pressable>
  ))}
</View>

<View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
  <TextInput
    value={searchQuery}
    onChangeText={setSearchQuery}
    placeholder="Rechercher un joueur"
    placeholderTextColor="#6f7585"
    style={{
      flex: 1,
      backgroundColor: "#12131a",
      borderWidth: 1,
      borderColor: "#232634",
      color: "white",
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontWeight: "600",
    }}
  />
  <Pressable
    onPress={() => setFiltersOpen((v) => !v)}
    style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: "#1b1d27", borderWidth: 1, borderColor: "#2a2d36" }}
  >
    <Text style={{ color: "white", fontWeight: "700" }}>Filtres</Text>
  </Pressable>
</View>

<View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
  <Text style={{ color: "#8f95a3", fontWeight: "700" }}>Titulaires</Text>
  <Pressable
    onPress={() => setTitulaireOnly((v) => !v)}
    style={{
      width: 44,
      height: 24,
      borderRadius: 999,
      backgroundColor: titulaireOnly ? "#1f6feb" : "#2a2d36",
      padding: 3,
      justifyContent: "center",
    }}
  >
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: "#fff",
        alignSelf: titulaireOnly ? "flex-end" : "flex-start",
      }}
    />
  </Pressable>
</View>

{filtersOpen ? (
  <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
    <Chip label={sortAsc ? "Tri: prix ↑" : "Tri: prix ↓"} active={true} onPress={() => setSortAsc((v) => !v)} />
    <Chip label={footballOnly ? "FOOTBALL: ON" : "FOOTBALL: OFF"} active={footballOnly} onPress={() => setFootballOnly((v) => !v)} />
    <Chip label={eurOnly ? "EUR: ON" : "EUR: OFF"} active={eurOnly} onPress={() => setEurOnly((v) => !v)} />
    <Chip label={showDebug ? "Debug: ON" : "Debug: OFF"} active={showDebug} onPress={() => setShowDebug((v) => !v)} />
  </View>
) : null}
{/* XS_RECRUTER_UI_V1_TOP_END */}

        {/* XS_FIX_HOOKS_GATING_UI_V1_BEGIN */}{/* public mode: no account link required */}{/* XS_FIX_HOOKS_GATING_UI_V1_END */}

        <TouchableOpacity
          onPress={() => { setMarketLoaded(true); loadOffers(true); }} /* XS_UI_MARKET_ONPRESS_SETLOADED_V1 */
          disabled={loading}
          style={{
            marginTop: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 10,
            backgroundColor: loading ? "#333" : "#1f6feb",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {loading ? "Chargement..." : "Charger les offres"}
          </Text>
        </TouchableOpacity>

        <Text style={{ marginTop: 10, color: "#bbb" }}>
          affichées: {shown.length} • EUR: {stats.eurCount}/{stats.fetched} • count={meta?.count ?? "?"} • cache={meta?.fromCache ? "oui" : "non"}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
          <Chip label={sortAsc ? "Tri: prix ↑" : "Tri: prix ↓"} active={true} onPress={() => setSortAsc(v => !v)} />
          <Chip label={footballOnly ? "FOOTBALL: ON" : "FOOTBALL: OFF"} active={footballOnly} onPress={() => setFootballOnly(v => !v)} />
          <Chip label={eurOnly ? "EUR: ON" : "EUR: OFF"} active={eurOnly} onPress={() => setEurOnly(v => !v)} />
          <Chip label={showDebug ? "Debug: ON /* XS_DEBUG_PROBE_UI_V1 */" : "Debug: OFF /* XS_DEBUG_PROBE_UI_V1 */"} active={showDebug} onPress={() => setShowDebug(v => !v)} />
        
        {/* XS_MARKET_DEBUG_COUNTS_V1_RENDER */}
        {showDebug ? (
          <View style={{ marginTop: 6, paddingHorizontal: 2 }}>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
              offers={offers.length} shown={shown.length} eurNum={debugCounts.eurNum} priceText!=null={debugCounts.ptNotNull} emptyPT={debugCounts.ptEmpty} nonEmptyPT={debugCounts.ptNonEmpty} teamSlug={debugCounts.teamSlug}
            </Text>
          </View>
        ) : null}</View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 2 }}>
          <Chip label="Rareté: ALL" active={rarity === "all"} onPress={() => setRarity("all")} />
          <Chip label="LIMITED" active={rarity === "limited"} onPress={() => setRarity("limited")} />
          <Chip label="RARE" active={rarity === "rare"} onPress={() => setRarity("rare")} />
          <Chip label="SUPER RARE" active={rarity === "super_rare"} onPress={() => setRarity("super_rare")} />
          <Chip label="UNIQUE" active={rarity === "unique"} onPress={() => setRarity("unique")} />
        </View>

        {showDebug ? (
          <>
            {lastDeviceId ? <Text style={{ marginTop: 6, color: "#777" }}>deviceId: {lastDeviceId}</Text> : null}
            {lastUrl ? <Text style={{ marginTop: 6, color: "#777" }}>url: {lastUrl}</Text> : null}
          </>
        ) : null}

        {error ? (
          <Text style={{ marginTop: 10, color: "#ff6b6b" }}>Erreur: {error}</Text>
        ) : null}
      </View>

      {loading ? (
        <View style={{ paddingTop: 20 }}>
          <ActivityIndicator />
        </View>
      ) : null}

      {/* XS_FIX_COLUMNWRAPPER_SINGLECOL_V1: remove columnWrapperStyle when numColumns=1 */}
      <FlatList
        numColumns={1} /* XS_RECRUTER_UI_V1_LIST */
        data={(loading && shown.length === 0) ? Array.from({ length: 6 }, (_, i) => ({ id: "sk-" + i } as any)) : shown}
        keyExtractor={(it, idx) => String((it as any)?.offerId || (it as any)?.slug || (it as any)?.id || idx)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={loadOffers}
      />
          {/* XS_MARKET_V3_MODAL_V1_BEGIN */
<Pressable
  style={{
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    backgroundColor: "#1f6feb",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  }}
  onPress={() => {}}
>
  <Text style={{ color: "white", fontWeight: "800" }}>Mode avancé</Text>
</Pressable>}
      <Modal visible={modalOpen} animationType="slide" transparent={true} onRequestClose={xsCloseOffer}>
        <Pressable
          onPress={xsCloseOffer}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.72)",
            padding: 14,
            justifyContent: "flex-end",
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#1d1d1f",
              backgroundColor: "#0b0b10",
            }}
          >
            {selected?.pictureUrl ? (
              <Image
                source={{ uri: selected.pictureUrl }}
                style={{ width: "100%", aspectRatio: 0.72 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: "100%", aspectRatio: 0.72, alignItems: "center", justifyContent: "center", backgroundColor: "#111" }}>
                <Text style={{ color: "#666", fontWeight: "900" }}>Image indisponible</Text>
              </View>
            )}

            <View style={{ padding: 14 }}>
              <Text style={{ color: "white", fontWeight: "900", fontSize: 18 }}>
                {selected?.cardName || selected?.cardSlug || selected?.id || "—"}
              </Text>

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <Text style={{ color: "rgba(255,255,255,0.70)", fontWeight: "800" }}>
                  Rareté: {String(selected?.rarity || "—").replace(/_/g," ").toUpperCase()}
                </Text>

                <View
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.14)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.20)",
                  }}
                >
                  <Text style={{ color: "white", fontWeight: "900", fontSize: 14 }}>{selected ? formatPrice(selected) : "—"}</Text>
                </View>
              </View>

              {selected?.cardSlug ? (
                <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.50)", fontSize: 12 }}>
                  {selected.cardSlug}
                </Text>
              ) : null}

              <Pressable
                onPress={xsCloseOffer}
                style={{
                  marginTop: 14,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: "#1f6feb",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "white", fontWeight: "900" }}>Fermer</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      {/* XS_MARKET_V3_MODAL_V1_END */}
</SafeAreaView>
  );
}










