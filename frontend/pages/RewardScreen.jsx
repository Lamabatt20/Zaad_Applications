import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import config from "../config";

export default function RewardScreen({ navigation, route }) {
  const { user_id } = route?.params || {};
  
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [certificates, setCertificates] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");

      // Fetch points
      const pointsRes = await fetch(`${config.API_URL}/donors/${user_id}/points`);
      const pointsData = await pointsRes.json();
      if (pointsData.ok) {
        setPoints(pointsData.points);
      }

      // Fetch certificates
      const certsRes = await fetch(`${config.API_URL}/donors/${user_id}/certificates`);
      const certsData = await certsRes.json();
      console.log('📜 Certificates response:', certsData);
      console.log('📜 Number of certificates:', certsData.certificates?.length);
      if (certsData.ok) {
        setCertificates(certsData.certificates);
      }
    } catch (error) {
      console.error("Error loading reward data:", error);
      Alert.alert("Error", "Failed to load reward data");
    } finally {
      setLoading(false);
    }
  };

  const showCertificate = (cert) => {
    navigation.navigate("CertificateViewerScreen", { certificate: cert });
  };

  const theme = {
    bg: darkMode ? "#1c1c1c" : "#EBE1D7",
    text: darkMode ? "#fff" : "#333",
    card: darkMode ? "#2a2a2a" : "#fff",
    border: darkMode ? "#555" : "#ddd",
    primary: "#A27571",
  };

  const nextMilestone = Math.ceil(points / 100) * 100;
  const progressToNextMilestone = points % 100;
  const progressPercentage = (progressToNextMilestone / 100) * 100;
  const pointsToNextMilestone = nextMilestone - points;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Rewards</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Points Card */}
        <View style={[styles.pointsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.pointsHeader}>
            <Ionicons name="star" size={40} color={theme.primary} />
            <View style={{ marginLeft: 16 }}>
              <Text style={[styles.pointsLabel, { color: theme.text }]}>Your Points</Text>
              <Text style={[styles.pointsValue, { color: theme.primary }]}>{points}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <Text style={[styles.progressLabel, { color: theme.text }]}>
              {pointsToNextMilestone === 0 
                ? `Milestone Achieved! Next: ${nextMilestone + 100} points`
                : `${pointsToNextMilestone} points to next certificate (${nextMilestone} points)`}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%`, backgroundColor: theme.primary }
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme.text }]}>
              {progressPercentage.toFixed(0)}% to next milestone
            </Text>
          </View>

          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: theme.bg }]}>
            <Ionicons name="information-circle" size={20} color={theme.primary} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              Earn 10 points for each accepted donation. Earn a new certificate at every 100-point milestone!
            </Text>
          </View>
        </View>

        {/* Certificates Section */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          My Certificates ({certificates.length})
        </Text>

        {certificates.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="ribbon-outline" size={60} color={theme.border} />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              No certificates yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.text }]}>
              Keep donating to earn your first certificate!
            </Text>
          </View>
        ) : (
          certificates.map((cert) => {
            const getLevelColor = (level) => {
              switch (level) {
                case 'Platinum': return '#E5E4E2';
                case 'Gold': return '#FFD700';
                case 'Silver': return '#C0C0C0';
                default: return '#A27571';
              }
            };
            
            return (
              <TouchableOpacity
                key={cert.certificate_id}
                style={[styles.certCard, { backgroundColor: theme.card, borderColor: getLevelColor(cert.certificate_data.level) }]}
                onPress={() => showCertificate(cert)}
              >
                <Ionicons name="trophy" size={40} color={getLevelColor(cert.certificate_data.level)} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.certTitle, { color: theme.text }]}>
                      {cert.certificate_data.milestone} Points
                    </Text>
                    <View style={[styles.levelBadge, { backgroundColor: getLevelColor(cert.certificate_data.level) }]}>
                      <Text style={styles.levelBadgeText}>{cert.certificate_data.level}</Text>
                    </View>
                  </View>
                  <Text style={[styles.certDate, { color: theme.text }]}>
                    {new Date(cert.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.text} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
  },
  pointsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  pointsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  pointsLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: "700",
  },
  progressSection: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    textAlign: "right",
  },
  infoBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.7,
  },
  certCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    marginBottom: 12,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  certDate: {
    fontSize: 13,
    marginTop: 4,
    opacity: 0.7,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  levelBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
