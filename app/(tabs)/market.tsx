import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { theme } from "../../src/theme";
import { apiFetch } from "../../src/api";

type ScoutOffer = {
  offerId: string;
  slug: string;
  rarity?: string | null;
  seasonYear?: number | null;
  pictureUrl?: string | null;
  eur?: number | null;
};

type WatchItem = { slug: string; addedAt?: string };
type AlertItem = { id: string; slug: string; maxEur: number; createdAt?: string; isEnabled?: boolean };

type TabKey = "market" | "watchlist" | "alerts";

const TABS: { key: TabKey; label: string }[] = [
  { key: "market", label: "Marché" },
  { key: "watchlist", label: "Watchlist" },
  { key: "alerts", label: "Alertes" },
];

const RARITIES = ["limited", "rare", "super_rare", "unique"] as const;


function slugify(input: string) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // enlève accents
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")             // apostrophes
    .replace(/[^a-z0-9]+/g, "-")      // espaces/punct -> -
    .replace(/^-+|-+$/g, "");
}
function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? theme.accent : theme.stroke,
        backgroundColor: active ? "rgba(120,160,255,0.18)" : "transparent",
      }}
    >
      <Text style={{ color: active ? theme.text : theme.muted, fontWeight: "800", fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Segmented({ value, onChange }: { value: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: theme.panel,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.stroke,
        overflow: "hidden",
      }}
    >
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: "center",
              backgroundColor: active ? "rgba(120,160,255,0.18)" : "transparent",
              borderRightWidth: t.key !== "alerts" ? 1 : 0,
              borderRightColor: theme.stroke,
            }}
          >
            <Text style={{ color: active ? theme.text : theme.muted, fontWeight: "900" }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TileButton({
  title,
  subtitle,
  rightText,
  onPress,
}: {
  title: string;
  subtitle: string;
  rightText?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: theme.panel,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: theme.stroke,
        padding: 14,
        gap: 6,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: theme.text, fontWeight: "900", fontSize: 16, flex: 1 }}>{title}</Text>
        {!!rightText && (
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: theme.stroke,
              backgroundColor: theme.panel2,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "900", fontSize: 12 }}>{rightText}</Text>
          </View>
        )}
      </View>

      <Text style={{ color: theme.muted, fontWeight: "800" }}>{subtitle}</Text>
    </Pressable>
  );
}

function MiniCard({
  item,
  onPress,
}: {
  item: ScoutOffer;
  onPress: () => void;
}) {
  const eurTxt = item.eur == null ? "—" : `${item.eur}€`;
  const rar = String(item.rarity || "").toUpperCase();
  const season = item.seasonYear ? String(item.seasonYear) : "";

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 150,
        backgroundColor: theme.panel,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.stroke,
        overflow: "hidden",
      }}
    >
      <View style={{ padding: 10, gap: 8 }}>
        <View
          style={{
            backgroundColor: theme.panel2,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: theme.stroke,
            overflow: "hidden",
          }}
        >
          {item.pictureUrl ? (
            <Image source={{ uri: item.pictureUrl }} style={{ width: "100%", height: 110 }} resizeMode="contain" />
          ) : (
            <View style={{ height: 110, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: theme.muted, fontWeight: "900" }}>No image</Text>
            </View>
          )}
        </View>

        <Text numberOfLines={1} style={{ color: theme.text, fontWeight: "900" }}>
          {item.slug}
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 11 }}>
            {rar} {season}
          </Text>
          <Text style={{ color: theme.text, fontWeight: "900", fontSize: 12 }}>{eurTxt}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function MarketScreen() {
  // Dashboard -> ouvre un modal (overlay style Sorare)
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TabKey>("watchlist");

  // Search focus modal
  const searchRef = useRef<TextInput | null>(null);

  // Dashboard preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewItems, setPreviewItems] = useState<ScoutOffer[]>([]);
  const [watchCount, setWatchCount] = useState<number>(0);
  const [alertCount, setAlertCount] = useState<number>(0);

  // UI filtres (dans le modal)
  const [search, setSearch] = useState("");
  const [eurOnly, setEurOnly] = useState(true);
  const [maxEur, setMaxEur] = useState<string>("20");
  const [rarity, setRarity] = useState<Set<string>>(new Set());

  // Market data (modal)
  const [items, setItems] = useState<ScoutOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState<boolean>(true);

  // Watchlist / alerts (modal)
  const [watch, setWatch] = useState<WatchItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingSide, setLoadingSide] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<any>(null);
  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }

  const maxEurNum = useMemo(() => {
    const n = Number(String(maxEur || "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [maxEur]);

  const queryBase = useMemo(() => {
    const qs = new URLSearchParams();
    qs.set("first", "10");
    if (eurOnly) qs.set("eurOnly", "1");
    if (maxEurNum != null) qs.set("maxEur", String(maxEurNum));
    return qs;
  }, [eurOnly, maxEurNum]);

    const rarityKey = useMemo(() => Array.from(rarity).sort().join(","), [rarity]);

const filteredItems = useMemo(() => {
    const s = search.trim().toLowerCase();
    let out = items;

    if (s) out = out.filter((x) => String(x.slug || "").toLowerCase().includes(s));
    if (rarity.size) out = out.filter((x) => rarity.has(String(x.rarity || "").toLowerCase()));

    return out;
  }, [items, search, rarity]);

  async function loadPreview() {
    try {
      setPreviewLoading(true);

      // Aperçu léger (moins de requêtes)
      const qs = new URLSearchParams();
      qs.set("first", "10");
      qs.set("eurOnly", "1");
      qs.set("maxEur", "20");

      const r = await apiFetch<any>(`/scout/cards?${qs.toString()}&eurOnly=1`);
      setPreviewItems(Array.isArray(r?.items) ? r.items.slice(0, 6) : []);

      // Compteurs watchlist/alertes
      const w = await apiFetch<any>(`/scout/watchlist`);
      const a = await apiFetch<any>(`/scout/alerts`);
      setWatchCount(Array.isArray(w?.items) ? w.items.length : 0);
      setAlertCount(Array.isArray(a?.items) ? a.items.length : 0);
    } catch (e: any) {
      // pas bloquant
    } finally {
      setPreviewLoading(false);
    }
  }

  async function loadMarket(opts?: { reset?: boolean }) {
    const reset = !!opts?.reset;
    if (loading) return;

    try {
      setLoading(true);
      const qs = new URLSearchParams(queryBase.toString());
      const q2 = slugify(search);
      if (q2) qs.set("query", q2);
      if (rarity.size) qs.set("rarities", Array.from(rarity).join(","));
      if (!reset && cursor) qs.set("after", cursor);

      const r = await apiFetch<any>(`/scout/cards?${qs.toString()}&eurOnly=1`);
      const newItems: ScoutOffer[] = Array.isArray(r?.items) ? r.items : [];
      const pi = r?.pageInfo || {};
      const nextCursor = typeof pi?.endCursor === "string" ? pi.endCursor : null;
      const nextHas = !!pi?.hasNextPage;

      setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      setCursor(nextCursor);
      setHasNext(nextHas);
    } catch (e: any) {
      showToast(`Erreur marché: ${e?.message ?? "fetch KO"}`);
    } finally {
      setLoading(false);
    }
  }

  async function refreshMarket() {
    try {
      setRefreshing(true);
      setCursor(null);
      setHasNext(true);
      await loadMarket({ reset: true });
    } finally {
      setRefreshing(false);
    }
  }

  async function loadWatchlist() {
    try {
      setLoadingSide(true);
      const r = await apiFetch<any>(`/scout/watchlist`);
      const arr = Array.isArray(r?.items) ? r.items : [];
      setWatch(arr);
      setWatchCount(arr.length);
    } catch (e: any) {
      showToast(`Erreur watchlist: ${e?.message ?? "fetch KO"}`);
    } finally {
      setLoadingSide(false);
    }
  }

  async function loadAlerts() {
    try {
      setLoadingSide(true);
      const r = await apiFetch<any>(`/scout/alerts`);
      const arr = Array.isArray(r?.items) ? r.items : [];
      setAlerts(arr);
      setAlertCount(arr.length);
    } catch (e: any) {
      showToast(`Erreur alertes: ${e?.message ?? "fetch KO"}`);
    } finally {
      setLoadingSide(false);
    }
  }

  async function addToWatchlist(slug: string) {
    try {
      await apiFetch(`/scout/watchlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      showToast("Ajouté à la watchlist ⭐");
      await loadWatchlist();
    } catch (e: any) {
      showToast(`Watchlist KO: ${e?.message ?? "post KO"}`);
    }
  }

  async function createAlert(slug: string) {
    const m = maxEurNum ?? 20;
    try {
      await apiFetch(`/scout/alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, maxEur: m }),
      });
      showToast(`Alerte créée (≤ ${m}€) 🔔`);
      await loadAlerts();
    } catch (e: any) {
      showToast(`Alerte KO: ${e?.message ?? "post KO"}`);
    }
  }

  function openModal(k: TabKey, opts?: { focusSearch?: boolean }) {
    setTab(k);
    setOpen(true);

    // Sorare-like: ouvrir directement sur la recherche
    if (k === "market" && opts?.focusSearch) {
      setTimeout(() => {
        searchRef.current?.focus?.();
      }, 250);
    }
  }

  // Load dashboard preview on mount
  useEffect(() => {
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quand on ouvre le modal, charge le bon contenu
  useEffect(() => {
    if (!open) return;

    if (tab === "market") {
      setCursor(null);
      setHasNext(true);
      loadMarket({ reset: true });
      setTimeout(() => searchRef.current?.focus?.(), 250);
    }
    if (tab === "watchlist") loadWatchlist();
    if (tab === "alerts") loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  // Recharger marché quand filtres principaux changent (si modal ouvert + tab marché)
  useEffect(() => {
    if (!open) return;
    if (tab !== "market") return;
    setCursor(null);
    setHasNext(true);
    loadMarket({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eurOnly, maxEurNum]);


  function CardTile({ item }: { item: ScoutOffer }) {
    const eurTxt = item.eur == null ? "—" : `${item.eur}€`;
    const rar = String(item.rarity || "").toUpperCase();
    const season = item.seasonYear ? String(item.seasonYear) : "";

    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.panel,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.stroke,
          overflow: "hidden",
        }}
      >
        <View style={{ padding: 10, gap: 8 }}>
          <View
            style={{
              backgroundColor: theme.panel2,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: theme.stroke,
              overflow: "hidden",
            }}
          >
            {item.pictureUrl ? (
              <Image source={{ uri: item.pictureUrl }} style={{ width: "100%", height: 160 }} resizeMode="contain" />
            ) : (
              <View style={{ height: 160, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: theme.muted, fontWeight: "900" }}>No image</Text>
              </View>
            )}
          </View>

          <Text numberOfLines={1} style={{ color: theme.text, fontWeight: "900" }}>
            {item.slug}
          </Text>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 12 }}>
              {rar} {season}
            </Text>
            <Text style={{ color: theme.text, fontWeight: "900" }}>{eurTxt}</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => addToWatchlist(item.slug)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.stroke,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: "900" }}>⭐</Text>
            </Pressable>

            <Pressable
              onPress={() => createAlert(item.slug)}
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.stroke,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: "900" }}>🔔</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ---------- DASHBOARD (Scout-Marché) ----------
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Scout-Marché</Text>
        <Text style={{ color: theme.muted, fontWeight: "800" }}>
          Dashboard + aperçu. Clique pour ouvrir l’overlay (comme Sorare).
        </Text>

        <View style={{ gap: 10 }}>
          <TileButton
            title="Marché"
            subtitle="Ouvre l’overlay + recherche"
            onPress={() => openModal("market", { focusSearch: true })}
          />
          <TileButton
            title="Watchlist"
            subtitle="Tes cartes suivies"
            rightText={`${watchCount}`}
            onPress={() => openModal("watchlist")}
          />
          <TileButton
            title="Alertes"
            subtitle="Seuils de prix"
            rightText={`${alertCount}`}
            onPress={() => openModal("alerts")}
          />
        </View>

        {/* Aperçu marché (mini cartes) */}
        <View
          style={{
            marginTop: 6,
            backgroundColor: theme.panel,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.stroke,
            padding: 12,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: theme.text, fontWeight: "900", flex: 1 }}>Aperçu Marché (≤ 20€)</Text>
            <Pressable
              onPress={loadPreview}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.stroke,
                backgroundColor: theme.panel2,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: "900" }}>↻</Text>
            </Pressable>
          </View>

          {previewLoading ? (
            <View style={{ paddingVertical: 12, alignItems: "center" }}>
              <ActivityIndicator />
            </View>
          ) : (
            <FlatList
              data={previewItems}
              keyExtractor={(it) => it.offerId || it.slug}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 10 }}
              renderItem={({ item }) => (
                <MiniCard
                  item={item}
                  onPress={() => {
                    // Sorare-like: click une mini carte -> ouvre overlay + recherche pré-remplie
                    setSearch(item.slug);
                    openModal("market", { focusSearch: true });
                  }}
                />
              )}
              ListEmptyComponent={
                <Text style={{ color: theme.muted, fontWeight: "900" }}>Pas d’aperçu pour le moment.</Text>
              }
            />
          )}

          <Text style={{ color: theme.muted, fontSize: 12 }}>
            V1: API publique (rate limit). Aperçu volontairement léger.
          </Text>
        </View>
      </View>

      {/* ---------- MODAL (overlay marché/watchlist/alertes) ---------- */}
      <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
          {/* Top bar Sorare-like */}
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Pressable
                onPress={() => setOpen(false)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.stroke,
                  backgroundColor: theme.panel,
                }}
              >
                <Text style={{ color: theme.text, fontWeight: "900" }}>←</Text>
              </Pressable>
              <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>
                {tab === "market" ? "Marché" : tab === "watchlist" ? "Watchlist" : "Alertes"}
              </Text>
              <View style={{ flex: 1 }} />
            </View>

            <Segmented value={tab} onChange={setTab} />

            {tab === "market" && (
              <>
                {/* Search (focus auto) */}
                <View
                  style={{
                    backgroundColor: theme.panel,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.stroke,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: theme.muted, fontWeight: "800", marginBottom: 6 }}>Recherche</Text>
                  <TextInput
                    ref={(r) => (searchRef.current = r)}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Chercher (slug)…"
                    placeholderTextColor={theme.muted}
                    style={{ color: theme.text, fontWeight: "800" }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={refreshMarket}
                    returnKeyType="search"
                  />
                </View>

                {/* Chips */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <Chip label="Prix en €" active={eurOnly} onPress={() => setEurOnly((v) => !v)} />

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: theme.panel,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.stroke,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      gap: 10,
                      minWidth: 140,
                    }}
                  >
                    <Text style={{ color: theme.muted, fontWeight: "900" }}>Max €</Text>
                    <TextInput
                      value={maxEur}
                      onChangeText={setMaxEur}
                      placeholder="20"
                      placeholderTextColor={theme.muted}
                      keyboardType="numeric"
                      style={{ color: theme.text, fontWeight: "900", flex: 1 }}
                    />
                  </View>

                  <Pressable onPress={() => setRarity(new Set())} style={{ paddingHorizontal: 10, paddingVertical: 7 }}>
                    <Text style={{ color: theme.muted, fontWeight: "900" }}>Reset</Text>
                  </Pressable>
                </View>

                {/* Raretés */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {RARITIES.map((r) => (
                    <Chip
                      key={r}
                      label={r.replace("_", " ").toUpperCase()}
                      active={rarity.has(r)}
                      onPress={() => {
                        setRarity((prev) => {
                          const n = new Set(prev);
                          if (n.has(r)) n.delete(r);
                          else n.add(r);
                          return n;
                        });
                      }}
                    />
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Content */}
          {tab === "market" && (
            <FlatList
              data={filteredItems}
              style={{ flex: 1 }}
              keyExtractor={(it) => it.offerId || it.slug}
              numColumns={2}
              columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
              contentContainerStyle={{ paddingBottom: 140, gap: 12 }}
              renderItem={({ item }) => <CardTile item={item} />}
              onEndReached={() => {
                if (hasNext && !loading) loadMarket({ reset: false });
              }}
              onEndReachedThreshold={0.6}
              refreshing={refreshing}
              onRefresh={refreshMarket}
              ListFooterComponent={
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  {loading ? (
                    <ActivityIndicator />
                  ) : (
                    <Text style={{ color: theme.muted, fontWeight: "800" }}>{hasNext ? "Scroll pour charger…" : "Fin."}</Text>
                  )}
                  <Text style={{ color: theme.muted, marginTop: 6, fontSize: 12 }}>
                    V1: liveSingleSaleOffers (public). Attention rate limit.
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                  <Text style={{ color: theme.muted, fontWeight: "900" }}>Aucune carte trouvée.</Text>
                </View>
              }
            />
          )}

          {tab === "watchlist" && (
            <FlatList
              data={watch}
              style={{ flex: 1 }}
              keyExtractor={(it) => it.slug}
              contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 140 }}
              refreshing={loadingSide}
              onRefresh={loadWatchlist}
              renderItem={({ item }) => (
                <View
                  style={{
                    backgroundColor: theme.panel,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.stroke,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: "900" }}>{item.slug}</Text>
                  {!!item.addedAt && <Text style={{ color: theme.muted, marginTop: 6 }}>{item.addedAt}</Text>}
                </View>
              )}
              ListEmptyComponent={
                <View style={{ padding: 16 }}>
                  <Text style={{ color: theme.muted, fontWeight: "900" }}>Watchlist vide.</Text>
                </View>
              }
            />
          )}

          {tab === "alerts" && (
            <FlatList
              data={alerts}
              style={{ flex: 1 }}
              keyExtractor={(it) => it.id}
              contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 140 }}
              refreshing={loadingSide}
              onRefresh={loadAlerts}
              renderItem={({ item }) => (
                <View
                  style={{
                    backgroundColor: theme.panel,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: theme.stroke,
                    padding: 12,
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: "900" }}>{item.slug}</Text>
                  <Text style={{ color: theme.muted, marginTop: 6, fontWeight: "800" }}>Max: {item.maxEur}€</Text>
                  {!!item.createdAt && <Text style={{ color: theme.muted, marginTop: 4 }}>{item.createdAt}</Text>}
                </View>
              )}
              ListEmptyComponent={
                <View style={{ padding: 16 }}>
                  <Text style={{ color: theme.muted, fontWeight: "900" }}>Aucune alerte.</Text>
                </View>
              }
            />
          )}

          {!!toast && (
            <View
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 24,
                backgroundColor: theme.panel,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.stroke,
                paddingVertical: 12,
                paddingHorizontal: 14,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: "900", textAlign: "center" }}>{toast}</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}










