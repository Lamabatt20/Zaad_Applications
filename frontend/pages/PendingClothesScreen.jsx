
    import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  RefreshControl,
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import config from "../config";

export default function PendingClothesScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingDonations, setPendingDonations] = useState([]);
  const [submitting, setSubmitting] = useState({}); // { [id]: 'accept' | 'reject' }

  // --- helpers ---
  const normalizeSlash = (base, path) => {
    if (!base) return path;
    if (base.endsWith("/") && path.startsWith("/")) return base + path.slice(1);
    if (!base.endsWith("/") && !path.startsWith("/")) return `${base}/${path}`;
    return base + path;
  };

  const buildImageUrl = (raw) => {
    if (raw == null || raw === "null" || raw === "undefined") return null;
    if (typeof raw === "string" && raw.startsWith("/")) return normalizeSlash(config.API_URL, raw);
    return raw;
  };

  const normalizeDonation = (x) => ({
    donation_id: x.donation_id ?? x.id,
    donor_name: x.donor_name ?? x.full_name ?? "Donor",
    item_image: buildImageUrl(x.item_image ?? x.photo_url ?? null),
    note: x.note ?? x.description ?? "",
    created_at: x.created_at ?? x.createdAt ?? new Date().toISOString(),
    status: x.status ?? "pending",
  });

  const assertConfig = () => {
    if (!config?.API_URL) {
      const msg = "config.API_URL is missing. Set it in ../config.";
      console.warn(msg);
      setErrorMsg(msg);
      setLoading(false);
      return false;
    }
    return true;
  };

  // --- data ---
  const fetchPending = async () => {
    if (!assertConfig()) return;
    try {
      setErrorMsg("");
      setLoading(true);
      console.log("[FETCH] GET", `${config.API_URL}/donations/clothes/pending`);
      const res = await axios.get(`${config.API_URL}/donations/clothes/pending`);
      console.log("[FETCH] status", res.status);
      console.log("[FETCH] payload", res.data);
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const normalized = arr.map(normalizeDonation);
      setPendingDonations(normalized);
    } catch (error) {
      console.error("[FETCH ERROR]", error?.response?.data || error?.message || error);
      setErrorMsg(
        typeof error?.message === "string"
          ? error.message
          : "Failed to load pending donations"
      );
      setPendingDonations([]);
      // Optional: Alert so you notice instantly
      // Alert.alert("Error", "Failed to load pending donations");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPending();
  };

  const removeFromUI = (id) => {
    setPendingDonations((prev) => prev.filter((d) => String(d.donation_id) !== String(id)));
  };

  const acceptDonation = async (id) => {
    try {
      setSubmitting((s) => ({ ...s, [id]: "accept" }));
      removeFromUI(id); // optimistic
      await axios.post(`${config.API_URL}/assoc/donations/${id}/accept`);
    } catch (e) {
      Alert.alert("Error", "Could not accept. Restoring item.");
      fetchPending();
    } finally {
      setSubmitting((s) => {
        const c = { ...s };
        delete c[id];
        return c;
      });
    }
  };

  const rejectDonation = async (id) => {
    try {
      setSubmitting((s) => ({ ...s, [id]: "reject" }));
      removeFromUI(id);
      await axios.post(`${config.API_URL}/assoc/donations/${id}/reject`);
    } catch (e) {
      Alert.alert("Error", "Could not reject. Restoring item.");
      fetchPending();
    } finally {
      setSubmitting((s) => {
        const c = { ...s };
        delete c[id];
        return c;
      });
    }
  };

  const renderItem = ({ item }) => {
    const dateStr =
      typeof item.created_at === "string" && item.created_at.includes("T")
        ? item.created_at.split("T")[0]
        : (item.created_at || "").toString().slice(0, 10);

    const isSubmitting = Boolean(submitting[item.donation_id]);

    return (
      <View style={styles.card}>
        {/* image */}
        {item.item_image ? (
          <Image source={{ uri: item.item_image }} style={styles.itemImage} />
        ) : (
          <Image source={require("../assets/icon.png")} style={styles.itemImage} />
        )}

        {/* texts */}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.donor_name}</Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            {item.note || "No description"}
          </Text>
          <Text style={styles.deadline}>
            Date: <Text style={{ fontWeight: "700" }}>{dateStr || "-"}</Text>
          </Text>
        </View>

        {/* badge */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusPending}>Pending</Text>
        </View>

        {/* actions */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btn, styles.acceptBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => acceptDonation(item.donation_id)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Accept</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.rejectBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => rejectDonation(item.donation_id)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.detailsBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => navigation.navigate("RequestDetails", { id: item.donation_id })}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const keyExtractor = (item) => String(item.donation_id);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerLarge}>
        <View style={styles.headerIconWrapper}>
          <Image source={require("../assets/icon.png")} style={styles.headerIcon} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerMainTitle}>Pending Donations</Text>
        </View>
      </View>

      {/* show an error banner if something failed */}
      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <View style={styles.content}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#8b6f69" />
            <Text style={{ marginTop: 8, color: "#8b6f69" }}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={pendingDonations}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 30 }}>
                No pending donations
              </Text>
            }
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#EBE1D7" },
  headerLarge: {
    backgroundColor: "#8b6f69",
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: { width: 36, height: 36, marginRight: 12, tintColor: "#8b6f69" },
  headerIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  headerTextContainer: { flex: 1 },
  headerMainTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },

  errorBar: { backgroundColor: "#ffefef", padding: 10 },
  errorText: { color: "#9b1c1c", textAlign: "center" },

  content: { flex: 1, backgroundColor: "#EBE1D7" },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    flexDirection: "column",
    marginBottom: 20,
    elevation: 3,
  },
  itemImage: { width: 70, height: 70, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  subtitle: { fontSize: 14, color: "#666", marginVertical: 5, width: "90%" },
  deadline: { marginTop: 5, fontSize: 14, color: "#333" },

  statusContainer: { position: "absolute", right: 10, top: 10 },
  statusPending: {
    backgroundColor: "#6ea8fe",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
  },

  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  acceptBtn: { backgroundColor: "#4CAF50" },
  rejectBtn: { backgroundColor: "#f44336" },
  detailsBtn: { backgroundColor: "#8b6f69" },
  btnText: { color: "#fff", fontWeight: "700" },
});
