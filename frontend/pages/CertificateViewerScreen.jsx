import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function CertificateViewerScreen({ navigation, route }) {
  const { certificate } = route?.params || {};
  const certData = certificate?.certificate_data || {};
  
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      const saved = await AsyncStorage.getItem("dark_mode");
      if (saved !== null) setDarkMode(saved === "true");
    };
    loadTheme();
  }, []);

  const getLevelColor = (level) => {
    switch (level) {
      case 'Platinum':
        return '#E5E4E2';
      case 'Gold':
        return '#FFD700';
      case 'Silver':
        return '#C0C0C0';
      default:
        return '#CD7F32'; // Bronze
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'Platinum':
        return 'medal';
      case 'Gold':
        return 'trophy';
      case 'Silver':
        return 'star';
      default:
        return 'ribbon';
    }
  };

  const shareCertificate = async () => {
    try {
      const message = `🎉 I earned a ${certData.level} certificate from Zaad!\n\n` +
                      `Certificate #${certData.certificate_number}\n` +
                      `${certData.milestone} Points Milestone\n\n` +
                      `${certData.message}`;
      
      await Share.share({
        message: message,
        title: 'My Zaad Certificate',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const bg = darkMode ? "#1c1c1c" : "#EBE1D7";
  const text = darkMode ? "#fff" : "#333";
  const levelColor = getLevelColor(certData.level);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: darkMode ? "#555" : "#ddd" }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: text }]}>Certificate</Text>
        <TouchableOpacity onPress={shareCertificate}>
          <Ionicons name="share-social" size={24} color={text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Certificate Card */}
        <View style={styles.certificateContainer}>
          <View style={[styles.certificate, { borderColor: levelColor }]}>
            {/* Decorative corners */}
            <View style={[styles.corner, styles.cornerTL, { borderColor: levelColor }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: levelColor }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: levelColor }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: levelColor }]} />

            {/* Header */}
            <View style={styles.certHeader}>
              <Ionicons name={getLevelIcon(certData.level)} size={60} color={levelColor} />
              <Text style={[styles.certTitle, { color: levelColor }]}>
                Certificate of Appreciation
              </Text>
              <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
                <Text style={styles.levelText}>{certData.level}</Text>
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: levelColor }]} />

            {/* Content */}
            <View style={styles.certContent}>
              <Text style={styles.presentedText}>This certificate is proudly presented to</Text>
              
              <Text style={[styles.donorName, { color: levelColor }]}>
                {certData.donor_name}
              </Text>

              <Text style={styles.recognitionText}>
                In recognition of achieving
              </Text>

              <View style={styles.milestoneContainer}>
                <Text style={[styles.milestoneNumber, { color: levelColor }]}>
                  {certData.milestone}
                </Text>
                <Text style={styles.pointsLabel}>Points</Text>
              </View>

              <Text style={styles.messageText}>
                {certData.message}
              </Text>

              {/* Date and Certificate Number */}
              <View style={styles.footer}>
                <View style={styles.footerItem}>
                  <Ionicons name="calendar" size={16} color="#999" />
                  <Text style={styles.footerText}>
                    {new Date(certData.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
                <View style={styles.footerItem}>
                  <Ionicons name="document-text" size={16} color="#999" />
                  <Text style={styles.footerText}>
                    {certData.certificate_number}
                  </Text>
                </View>
              </View>

              {/* Zaad Logo/Signature */}
              <View style={styles.signature}>
                <View style={[styles.signatureLine, { backgroundColor: levelColor }]} />
                <Text style={[styles.signatureText, { color: levelColor }]}>
                  Zaad Platform
                </Text>
                <Text style={styles.signatureSubtext}>
                  Community Giving Initiative
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: levelColor }]}
            onPress={shareCertificate}
          >
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>Share Certificate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  certificateContainer: {
    marginBottom: 20,
  },
  certificate: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 30,
    borderWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderWidth: 3,
  },
  cornerTL: {
    top: 10,
    left: 10,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 10,
    right: 10,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 10,
    left: 10,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 10,
    right: 10,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  certHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  certTitle: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: 12,
    textAlign: "center",
    fontFamily: "serif",
  },
  levelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },
  levelText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  divider: {
    height: 2,
    marginVertical: 20,
    opacity: 0.3,
  },
  certContent: {
    alignItems: "center",
  },
  presentedText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    fontStyle: "italic",
  },
  donorName: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    fontFamily: "serif",
  },
  recognitionText: {
    fontSize: 15,
    color: "#666",
    marginBottom: 16,
  },
  milestoneContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  milestoneNumber: {
    fontSize: 48,
    fontWeight: "700",
    fontFamily: "serif",
  },
  pointsLabel: {
    fontSize: 16,
    color: "#999",
    marginTop: 4,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  messageText: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 20,
    marginBottom: 30,
    fontStyle: "italic",
    paddingHorizontal: 20,
  },
  footer: {
    width: "100%",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    color: "#999",
  },
  signature: {
    alignItems: "center",
    marginTop: 30,
  },
  signatureLine: {
    width: 120,
    height: 2,
    marginBottom: 8,
  },
  signatureText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "serif",
  },
  signatureSubtext: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
