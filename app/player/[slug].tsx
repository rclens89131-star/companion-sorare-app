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
  // XS_PRICE_TEXT_SAFE_V1: no template literals
  const s = String(card?.priceText || "").trim();
  if (s) return s;
  if (typeof card?.eur === "number" && Number.isFinite(card.eur)) {
    return "€" + card.eur.toFixed(2);
  }
  return "Prix indisponible (public)";
}
// XS_RECRUTER_PLAYER_SCREEN_V1_END



