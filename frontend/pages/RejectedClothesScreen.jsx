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
  RefreshControl,
  Alert
} from "react-native";
import axios from "axios";
import { useNavigation } from "@react-navigation/native";
import config from "../config";

export default function RejectedClothesScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState({}); // { [id]: true }

  const normalizeSlash = (base, path) => {
    if (!base) return path;
    if (base.endsWith("/") && path.startsWith("/")) return base + path.slice(1);
    if (!base.endsWith("/") && !path.startsWith("/")) return `${base}/${path}`;
    return base + path;
  };

 const buildImageUrl = (raw) => {
   if (!raw) return null;
 
   const fullUrl = raw.startsWith("/")
     ? `${config.API_URL}${raw}`
     : raw;
 
   return encodeURI(fullUrl); 
 };

  const normalizeDonation = (x) => ({
    donation_id: x.donation_id ?? x.id,
    donor_name: x.donor_name ?? x.full_name ?? "Donor",
    item_image: buildImageUrl(x.item_image ?? x.photo_url ?? null),
    note: x.note ?? x.description ?? "",
    created_at: x.created_at ?? x.createdAt ?? new Date().toISOString(),
    status: x.status ?? "rejected",
  });

  const fetchData = async () => {
    try {
      setErrorMsg("");
      setLoading(true);
      const res = await axios.get(
        `${config.API_URL}/donations/clothes/rejected`
      );
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setItems(arr.map(normalizeDonation));
    } catch (e) {
      setErrorMsg(
        typeof e?.message === "string"
          ? e.message
          : "Failed to load rejected donations"
      );
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const removeFromUI = (id) => {
    setItems(prev => prev.filter(d => String(d.donation_id) !== String(id)));
  };

  const restoreDonation = async (id) => {
    try {
      setSubmitting(s => ({ ...s, [id]: true }));
      // optimistic: remove from Rejected list (it will reappear in Pending screen)
      removeFromUI(id);
      await axios.post(`${config.API_URL}/assoc/donations/${id}/restore`);
      // Optional: Alert.alert("Done", "Donation restored to pending.");
    } catch (e) {
      Alert.alert("Error", "Could not restore. Restoring item in list.");
      fetchData(); // rollback by refetch
    } finally {
      setSubmitting(s => {
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

    const isSubmitting = !!submitting[item.donation_id];

    return (
      <View style={styles.card}>
        {item.item_image ? (
          <Image source={{ uri: item.item_image }} style={styles.itemImage} />
        ) : (
          <Image
            source={require("../assets/icon.png")}
            style={styles.itemImage}
          />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.donor_name}</Text>
          <Text numberOfLines={2} style={styles.subtitle}>
            {item.note || "No description"}
          </Text>
          <Text style={styles.deadline}>
            Date: <Text style={{ fontWeight: "700" }}>{dateStr || "-"}</Text>
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusRejected}>Rejected</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btn, styles.detailsBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => navigation.navigate("RequestDetails", { id: item.donation_id })}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Details</Text>
          </TouchableOpacity>

          {/* NEW: Restore button */}
          <TouchableOpacity
            style={[styles.btn, styles.restoreBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => restoreDonation(item.donation_id)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Restore</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerLarge}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerMainTitle}>Rejected Donations</Text>
        </View>
      </View>

      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <View style={styles.content}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8 }}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => String(it.donation_id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 30 }}>
                No rejected donations
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
    backgroundColor: "#EBE1D7",
    paddingVertical: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  welcomeLogo: {
    width: 135,
    height: 135,
    marginRight: 10,
    marginLeft: -35,
    marginTop: -50,
  },

  headerTextContainer: { flex: 1 },

  headerMainTitle: {
    fontFamily: 'Times New Roman',
    fontSize: 23,
    marginTop: -50,
    marginLeft: -50,
    color: '#8b6f69'
  },

  errorBar: { backgroundColor: "#ffefef", padding: 10 },
  errorText: { color: "#9b1c1c", textAlign: "center" },

  content: { flex: 1, backgroundColor: "#EBE1D7" },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3,
  },

  itemImage: { width: 70, height: 70, borderRadius: 10, marginBottom: 10 },

  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  subtitle: { fontSize: 14, color: "#666", marginVertical: 5, width: "90%" },
  deadline: { marginTop: 5, fontSize: 14, color: "#333" },

  statusContainer: { position: "absolute", right: 10, top: 10 },

  statusRejected: {
    backgroundColor: "#ef4444",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
  },

  actionButtons: { flexDirection: "row", marginTop: 15 },

  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 },
  detailsBtn: { backgroundColor: "#8b6f69" },
  restoreBtn: { backgroundColor: "#fea86eff" }, 
  btnText: { color: "#fff", fontWeight: "700" },
});
