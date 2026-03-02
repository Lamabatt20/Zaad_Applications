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
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from "../config";

export default function ApprovedFoodScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);

  // 🔴 FEEDBACK
    const [feedbackText, setFeedbackText] = useState({});
    const [sendingFeedback, setSendingFeedback] = useState(false);
    const [feedbackSent, setFeedbackSent] = useState({});

  // Details modal
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  // Date filter
  const [selectedDate, setSelectedDate] = useState("ALL");
  const [filterVisible, setFilterVisible] = useState(false);

  const buildImageUrl = (raw) => {
    if (!raw) return null;
    const full = String(raw).startsWith("/") ? `${config.API_URL}${raw}` : raw;
    return encodeURI(full);
  };

  const getYMD = (created_at) => {
    if (!created_at) return "";
    const s = String(created_at);
    return s.includes("T") ? s.split("T")[0] : s.slice(0, 10);
  };

  // ✅ helper لعرض delivery_status بشكل مرتب
  const formatDeliveryStatus = (s) => {
    if (!s) return "—";
    if (s === "NEEDS_ASSIGNMENT") return "Needs assignment";
    if (s === "ASSIGNED") return "Assigned";
    if (s === "WAITING_FOR_DONOR") return "Waiting for donor";
    if (s === "ON_THE_WAY") return "On the way";
    if (s === "DELIVERED") return "Delivered";
    return s; // fallback
  };

  const normalizeDonation = (x) => ({
    donation_id: x.donation_id ?? x.id,
    donor_name: x.donor_name ?? x.full_name ?? "Donor",
    item_image: buildImageUrl(x.item_image ?? x.photo_url ?? null),
    note: x.note ?? x.description ?? "",
    created_at: x.created_at ?? x.createdAt ?? new Date().toISOString(),
    status: x.status ?? "approved",
    quantity: x.quantity ?? null,

    // ✅ delivery tracking (جايين من الباك اند)
    delivery_method: x.delivery_method ?? "donor",
    delivery_status: x.delivery_status ?? null,
    delivery_person_id: x.delivery_person_id ?? null,
    delivery_person_name: x.delivery_person_name ?? "",
  });

  const fetchData = async () => {
    try {
      setErrorMsg("");
      setLoading(true);

      const userDataStr = await AsyncStorage.getItem("user_data");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const associationId = userData?.association_id;

      const url = associationId
        ? `${config.API_URL}/donations/food/approved?association_id=${associationId}`
        : `${config.API_URL}/donations/food/approved`;

      const res = await axios.get(url);
      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const normalized = arr.map(normalizeDonation);

      setItems(normalized);

      const datesSet = new Set(normalized.map((d) => getYMD(d.created_at)).filter(Boolean));
      if (selectedDate !== "ALL" && !datesSet.has(selectedDate)) setSelectedDate("ALL");
    } catch (e) {
      setErrorMsg(typeof e?.message === "string" ? e.message : "Failed to load approved food donations");
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const allDates = useMemo(() => {
    const set = new Set();
    items.forEach((d) => {
      const ymd = getYMD(d.created_at);
      if (ymd) set.add(ymd);
    });
    return ["ALL", ...Array.from(set).sort().reverse()];
  }, [items]);

  const filteredItems =
    selectedDate === "ALL" ? items : items.filter((d) => getYMD(d.created_at) === selectedDate);

  const renderItem = ({ item }) => {
    const dateStr = getYMD(item.created_at);

    return (
      <View style={styles.card}>
        {item.item_image ? (
          <Image source={{ uri: item.item_image }} style={styles.itemImage} />
        ) : (
          <Image source={require("../assets/icon.png")} style={styles.itemImage} />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.donor_name}</Text>

          {!!item.quantity && (
            <Text style={styles.metaText}>
              Quantity: <Text style={{ fontWeight: "800" }}>{item.quantity}</Text>
            </Text>
          )}

          <Text numberOfLines={2} style={styles.subtitle}>
            {item.note || "No description"}
          </Text>

          <Text style={styles.deadline}>
            Date: <Text style={{ fontWeight: "700" }}>{dateStr || "-"}</Text>
          </Text>

          {/* ✅ Delivery Method */}
          <Text style={styles.deliveryInfo}>
            Delivery Method:{" "}
            <Text style={{ fontWeight: "800" }}>
              {item.delivery_method === "association" ? "Association Pickup" : "Donor will deliver"}
            </Text>
          </Text>

          {/* ✅ Delivery Status */}
          <Text style={styles.deliveryInfo}>
            Delivery Status:{" "}
            <Text style={{ fontWeight: "800" }}>{formatDeliveryStatus(item.delivery_status)}</Text>
          </Text>

          {/* ✅ Driver name (optional) */}
          {item.delivery_method === "association" && !!item.delivery_person_name && (
            <Text style={styles.deliveryInfo}>
              Driver: <Text style={{ fontWeight: "800" }}>{item.delivery_person_name}</Text>
            </Text>
          )}
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusApproved}>Approved</Text>
        </View>

        {/* 🔴 FEEDBACK (only when delivered) */}
        {item.delivery_status === "DELIVERED" &&
          !feedbackSent[item.donation_id] && (
            <View style={styles.feedbackBox}>
              <Text style={styles.feedbackTitle}>Feedback</Text>

              <TextInput
                placeholder="Write feedback..."
                multiline
                value={feedbackText[item.donation_id] || ""}
                onChangeText={(text) =>
                  setFeedbackText((prev) => ({
                    ...prev,
                    [item.donation_id]: text,
                  }))
                }
                style={styles.feedbackInput}
              />

              <TouchableOpacity
                disabled={sendingFeedback}
                onPress={async () => {
                  const msg = feedbackText[item.donation_id]?.trim();
                  if (!msg) return;

                  try {
                    setSendingFeedback(true);
                    await axios.post(`${config.API_URL}/delivery/feedback`, {
                      donation_id: item.donation_id,
                      message: msg,
                    });

                    setFeedbackText((prev) => ({
                      ...prev,
                      [item.donation_id]: "",
                    }));
                    setFeedbackSent((prev) => ({
                      ...prev,
                      [item.donation_id]: true,
                    }));
                  } finally {
                    setSendingFeedback(false);
                  }
                }}
              >
                <Text style={styles.feedbackSend}>Send</Text>
              </TouchableOpacity>
            </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.btn, styles.detailsBtn]}
            onPress={() => {
              setSelected(item);
              setDetailsVisible(true);
            }}
          >
            <Text style={styles.btnText}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* 🔴 FEEDBACK (only when delivered) - moved to before details button */}
      </View>
    );
  };

  const filterLabel = selectedDate === "ALL" ? "All Approved Dates" : selectedDate;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerLarge}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerMainTitle}>Approved Food Donations</Text>
      </View>

      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Filter */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
          <Text style={styles.filterBtnTitle}>Filter by Date</Text>
          <Text style={styles.filterBtnValue}>{filterLabel}</Text>
        </TouchableOpacity>

        {selectedDate !== "ALL" && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedDate("ALL")}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <View style={styles.content}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#8b6f69" />
            <Text style={{ marginTop: 8, color: "#8b6f69" }}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(it) => String(it.donation_id)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 30 }}>
                No approved food donations
              </Text>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterVisible(false)}>
          <Pressable style={styles.filterModalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Date</Text>

            <FlatList
              data={allDates}
              keyExtractor={(d) => d}
              style={{ maxHeight: 340 }}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              renderItem={({ item: d }) => {
                const active = selectedDate === d;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDate(d);
                      setFilterVisible(false);
                    }}
                    style={[styles.dateRow, active && styles.dateRowActive]}
                  >
                    <Text style={[styles.dateText, active && styles.dateTextActive]}>
                      {d === "ALL" ? "All Dates" : d}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <View style={{ height: 12 }} />

            <TouchableOpacity
              style={[styles.btn, styles.closeBtn, { alignSelf: "flex-end" }]}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={styles.btnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            setDetailsVisible(false);
            setSelected(null);
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Donation Details</Text>

            {selected?.item_image ? (
              <Image source={{ uri: selected.item_image }} style={styles.modalImage} />
            ) : (
              <Image source={require("../assets/icon.png")} style={styles.modalImage} />
            )}

            <Text style={styles.modalName}>{selected?.donor_name || "Donor"}</Text>

            {!!selected?.quantity && (
              <Text style={styles.modalMeta}>
                Quantity: <Text style={{ fontWeight: "800" }}>{selected.quantity}</Text>
              </Text>
            )}

            <Text style={styles.modalDesc}>
              {selected?.note?.trim() ? selected.note : "No description"}
            </Text>

            <Text style={styles.modalDate}>Date: {getYMD(selected?.created_at) || "-"}</Text>

            <Text style={styles.modalDate}>
              Delivery Method:{" "}
              <Text style={{ fontWeight: "800" }}>
                {selected?.delivery_method === "association" ? "Association Pickup" : "Donor will deliver"}
              </Text>
            </Text>

            <Text style={styles.modalDate}>
              Delivery Status:{" "}
              <Text style={{ fontWeight: "800" }}>{formatDeliveryStatus(selected?.delivery_status)}</Text>
            </Text>

            {selected?.delivery_method === "association" && !!selected?.delivery_person_name && (
              <Text style={styles.modalDate}>
                Driver: <Text style={{ fontWeight: "800" }}>{selected.delivery_person_name}</Text>
              </Text>
            )}

            <View style={styles.modalActions}>
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
  headerMainTitle: {
    fontFamily: "Times New Roman",
    fontSize: 23,
    marginTop: -75,
    marginLeft: -50,
    color: "#8b6f69",
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
  metaText: { fontSize: 13, color: "#555", marginTop: 2 },
  subtitle: { fontSize: 14, color: "#666", marginVertical: 5, width: "90%" },
  deadline: { marginTop: 5, fontSize: 14, color: "#333" },

  deliveryInfo: { fontSize: 13, color: "#333", marginTop: 2 },

  statusContainer: { position: "absolute", right: 10, top: 10 },
  statusApproved: {
    backgroundColor: "#110202ff",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
  },

  actionButtons: { flexDirection: "row", justifyContent: "flex-start", marginTop: 15 },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignItems: "center" },
  detailsBtn: { backgroundColor: "#8b6f69" },
  closeBtn: { backgroundColor: "#8b6f69" },
  btnText: { color: "#fff", fontWeight: "700" },

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
  modalName: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 6 },
  modalMeta: { fontSize: 13, color: "#555", marginBottom: 8 },
  modalDesc: { fontSize: 14, color: "#555", marginBottom: 10, lineHeight: 20 },
  modalDate: { fontSize: 13, color: "#666", marginBottom: 8 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end" },

  // Filter row
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 2,
  },
  filterBtnTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8b6f69",
    marginBottom: 4,
    fontFamily: "Times New Roman",
  },
  filterBtnValue: { fontSize: 14, fontWeight: "700", color: "#333" },
  clearBtn: {
    backgroundColor: "#8b6f69",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  clearBtnText: { color: "#fff", fontWeight: "800" },

  filterModalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    elevation: 10,
  },
  sep: { height: 10 },
  dateRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f3f3f3",
  },
  dateRowActive: { backgroundColor: "#8b6f69" },
  dateText: { fontSize: 14, fontWeight: "800", color: "#333" },
  dateTextActive: { color: "#fff" },
  // 🔴 FEEDBACK styles
feedbackBox: {
  marginTop: 10,
  backgroundColor: "#f5f5f5",
  padding: 10,
  borderRadius: 12,
},
feedbackTitle: {
  fontSize: 13,
  fontWeight: "700",
  marginBottom: 6,
},
feedbackInput: {
  minHeight: 50,
  backgroundColor: "#fff",
  borderRadius: 10,
  padding: 8,
  fontSize: 14,
},
feedbackSend: {
  marginTop: 6,
  alignSelf: "flex-end",
  fontWeight: "800",
  color: "#8b6f69",
},
});
