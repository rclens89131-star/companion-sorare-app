import React from "react";
import { SafeAreaView, Text, View } from "react-native";
import { theme } from "../../src/theme";
import { CopilotFAB } from "../../src/components/CopilotFAB";
import { CopilotSheet } from "../../src/components/CopilotSheet";

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Accueil</Text>

        <View style={{ backgroundColor: theme.panel, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>Résultats Gameweek</Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>
            Placeholder V1. V2: scores, rewards, ranking, résumé perf, alertes et priorités.
          </Text>
        </View>

        <View style={{ backgroundColor: theme.panel, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.stroke }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: "800" }}>Prochaines priorités</Text>
          <Text style={{ color: theme.muted, marginTop: 6 }}>
            • 1 compo recommandée • 2 joueurs à surveiller • 1 achat/vente potentiel (via Copilot)
          </Text>
        </View>
      </View>

      <CopilotSheet />
      <CopilotFAB />
    </SafeAreaView>
  );
}
