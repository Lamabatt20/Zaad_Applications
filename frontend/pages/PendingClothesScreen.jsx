import React, { useEffect, useMemo, useState } from "react";
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
  Modal,
  Pressable,
} from "react-native";
import axios from "axios";
import config from "../config";
import { Picker } from "@react-native-picker/picker";

export default function PendingClothesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingDonations, setPendingDonations] = useState([]);
  const [submitting, setSubmitting] = useState({}); // { [id]: 'accept' | 'reject' }
  // ✅ details modal
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  // ✅ Date filter (Dropdown)
  const [selectedDate, setSelectedDate] = useState("ALL");


  const normalizeSlash = (base, path) => {
    if (!base) return path;
    if (base.endsWith("/") && path.startsWith("/")) return base + path.slice(1);
    if (!base.endsWith("/") && !path.startsWith("/")) return `${base}/${path}`;
    return base + path;
  };

  const normalizeDonation = (x) => ({
    donation_id: x.donation_id ?? x.id,
    donor_name: x.donor_name ?? x.full_name ?? "Donor",
    item_image: buildImageUrl(x.item_image ?? x.photo_url ?? null),
    note: x.note ?? x.description ?? "",
    created_at: x.created_at ?? x.createdAt ?? new Date().toISOString(),
    status: x.status ?? "pending",
  });

  const getYMD = (created_at) => {
    if (typeof created_at === "string" && created_at.includes("T")) {
      return created_at.split("T")[0];
    }
    return String(created_at || "").slice(0, 10);
  };

  const buildImageUrl = (raw) => {
    if (!raw) return null;
    const full = raw.startsWith("/") ? `${config.API_URL}${raw}` : raw;
    return encodeURI(full);
  };

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

      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setPendingDonations(arr.map(normalizeDonation));
    } catch (error) {
      console.error("[FETCH ERROR]", error?.response?.data || error?.message || error);
      setErrorMsg(
        typeof error?.message === "string"
          ? error.message
          : "Failed to load pending donations"
      );
      setPendingDonations([]);
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
    setPendingDonations((prev) =>
      prev.filter((d) => String(d.donation_id) !== String(id))
    );
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
      removeFromUI(id); // optimistic
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

  // ✅ All dates that exist in pending (dropdown options)
  const allDates = useMemo(() => {
    const set = new Set();
    pendingDonations.forEach((d) => {
      const ymd = getYMD(d.created_at);
      if (ymd) set.add(ymd);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [pendingDonations]);

  // default to most recent date (if any) instead of ALL
  useEffect(() => {
    if (allDates.length > 1 && selectedDate === "ALL") {
      setSelectedDate(allDates[allDates.length - 1]);
    }
  }, [allDates]);

  // ✅ Filtered data
  const filteredPending =
    selectedDate === "ALL"
      ? pendingDonations
      : pendingDonations.filter((d) => getYMD(d.created_at) === selectedDate);

  const renderItem = ({ item }) => {
    const dateStr = getYMD(item.created_at);
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

          {/* ✅ DETAILS: open modal */}
          <TouchableOpacity
            style={[styles.btn, styles.detailsBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => {
              setSelected(item);
              setDetailsVisible(true);
            }}
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
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerMainTitle}>Pending Donations</Text>
        </View>
      </View>

      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* ✅ FILTER BY DATE */}
      <View style={styles.filterBox}>
        <Text style={styles.filterTitle}>Filter Pending by Date</Text>
        <View style={styles.pickerWrap}>
          <Picker
            mode="dropdown"
            selectedValue={selectedDate}
            onValueChange={(v) => setSelectedDate(v)}
            style={{ width: "100%" }}
          >
            {allDates.map((d) => (
              <Picker.Item key={d} label={d === "ALL" ? "All Pending Dates" : d} value={d} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#8b6f69" />
            <Text style={{ marginTop: 8, color: "#8b6f69" }}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPending}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 30 }}>
                No pending donations
              </Text>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>

      {/* ✅ DETAILS MODAL */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDetailsVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Donation Details</Text>

            {selected?.item_image ? (
              <Image source={{ uri: selected.item_image }} style={styles.modalImage} />
            ) : (
              <Image source={require("../assets/icon.png")} style={styles.modalImage} />
            )}

            <Text style={styles.modalName}>{selected?.donor_name || "Donor"}</Text>

            <Text style={styles.modalDesc}>
              {selected?.note?.trim() ? selected.note : "No description"}
            </Text>

            <Text style={styles.modalDate}>
              Date: {getYMD(selected?.created_at) || "-"}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.acceptBtn]}
                onPress={() => {
                  const id = selected?.donation_id;
                  setDetailsVisible(false);
                  setSelected(null);
                  if (id) acceptDonation(id);
                }}
              >
                <Text style={styles.btnText}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.rejectBtn]}
                onPress={() => {
                  const id = selected?.donation_id;
                  setDetailsVisible(false);
                  setSelected(null);
                  if (id) rejectDonation(id);
                }}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.closeBtn]}
                onPress={() => {
                  setDetailsVisible(false);
                  setSelected(null);
                }}
              >
                <Text style={styles.btnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    fontFamily: "Times New Roman",
    fontSize: 23,
    marginTop: -50,
    marginLeft: -50,
    color: "#8b6f69",
  },

  errorBar: { backgroundColor: "#ffefef", padding: 10 },
  errorText: { color: "#9b1c1c", textAlign: "center" },

  filterBox: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },

  filterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8b6f69",
    marginBottom: 6,
  },

  pickerWrap: {
    backgroundColor: "#f3f3f3",
    borderRadius: 10,
    width: 340,
    height: 44,
    justifyContent: "center",
  },

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
  detailsBtn: { backgroundColor: "#A27571" },
  closeBtn: { backgroundColor: "#8b6f69" },
  btnText: { color: "#fff", fontWeight: "700" },

  // ✅ Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#8b6f69",
    marginBottom: 12,
    textAlign: "center",
    fontFamily: "Times New Roman",
  },
  modalImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#f2f2f2",
  },
  modalName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 14,
    color: "#555",
    marginBottom: 10,
    lineHeight: 20,
  },
  modalDate: {
    fontSize: 13,
    color: "#666",
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
});
