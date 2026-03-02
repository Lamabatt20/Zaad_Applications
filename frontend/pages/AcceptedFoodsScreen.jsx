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
  Alert,
  Modal,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from "../config";
import { useNavigation } from "@react-navigation/native";

export default function AcceptedFoodScreen() {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState({}); // { [id]: true }

  // Details modal
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  // Image viewer (full-screen zoom)
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Date filter (modal)
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

  const normalizeDonation = (x) => ({
    donation_id: x.donation_id ?? x.id,
    donor_name: x.donor_name ?? x.full_name ?? "Donor",
    item_image: buildImageUrl(x.item_image ?? x.photo_url ?? null),
    note: x.note ?? x.description ?? "",
    created_at: x.created_at ?? x.createdAt ?? new Date().toISOString(),
    status: x.status ?? "accepted",

    food_type: x.food_type ?? null,
    expiration_date: x.expiration_date ?? null,

    // ✅ delivery tracking (from backend)
    delivery_method: x.delivery_method ?? "donor",
    delivery_status: x.delivery_status ?? null,
    delivery_person_id: x.delivery_person_id ?? null,
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

  const fetchData = async () => {
    if (!assertConfig()) return;

    try {
      setErrorMsg("");
      setLoading(true);

      // ✅ Get association_id from AsyncStorage
      const userDataStr = await AsyncStorage.getItem("user_data");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const associationId = userData?.association_id;

      const url = associationId
        ? `${config.API_URL}/donations/food/accepted?association_id=${associationId}`
        : `${config.API_URL}/donations/food/accepted`;

      const res = await axios.get(url);

      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const normalized = arr.map(normalizeDonation);
      setItems(normalized);

      // لو التاريخ المختار اختفى بعد refresh رجّعه ALL
      const datesSet = new Set(
        normalized.map((d) => getYMD(d.created_at)).filter(Boolean)
      );
      if (selectedDate !== "ALL" && !datesSet.has(selectedDate)) {
        setSelectedDate("ALL");
      }
    } catch (e) {
      setErrorMsg(
        typeof e?.message === "string"
          ? e.message
          : "Failed to load accepted food donations"
      );
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

  const removeFromUI = (id) => {
    setItems((prev) => prev.filter((d) => String(d.donation_id) !== String(id)));
  };

  const approveDonation = async (id) => {
    try {
      setSubmitting((s) => ({ ...s, [id]: true }));
      removeFromUI(id); // optimistic (رح يظهر في Approved)
      await axios.post(`${config.API_URL}/assoc/donations/${id}/approve`);
    } catch (e) {
      Alert.alert("Error", "Could not approve. Restoring item.");
      fetchData();
    } finally {
      setSubmitting((s) => {
        const c = { ...s };
        delete c[id];
        return c;
      });
    }
  };

  const goAssign = (donation_id) => {
    navigation.navigate("AssignDeliveryPerson", { donation_id });
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
    selectedDate === "ALL"
      ? items
      : items.filter((d) => getYMD(d.created_at) === selectedDate);

  const renderDeliveryStatus = (st) => {
    if (!st) return "pending";
    if (st === "NEEDS_ASSIGNMENT") return "Needs Assignment";
    if (st === "WAITING_FOR_DONOR") return "Waiting for Donor";
    if (st === "ASSIGNED") return "Assigned";
    if (st === "ON_THE_WAY" || st === "on_the_way") return "On the way";
    if (st === "DELIVERED" || st === "delivered") return "Delivered";
    return st;
  };



  const renderItem = ({ item }) => {
    const dateStr = getYMD(item.created_at);
    const isSubmitting = !!submitting[item.donation_id];

    const showAssign =
      item.delivery_method === "association" &&
      (!item.delivery_status || item.delivery_status === "NEEDS_ASSIGNMENT");

    return (
      <View style={styles.card}>
        {item.item_image ? (
          <Image source={{ uri: item.item_image }} style={styles.itemImage} />
        ) : (
          <Image source={require("../assets/icon.png")} style={styles.itemImage} />
        )}

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.donor_name}</Text>

          {!!item.food_type && (
            <Text style={styles.metaText}>
              Food Type: <Text style={{ fontWeight: "800" }}>{item.food_type}</Text>
            </Text>
          )}

          {!!item.expiration_date && (
            <Text style={styles.metaText}>
              Expiration:{" "}
              <Text style={{ fontWeight: "800" }}>{String(item.expiration_date).slice(0, 10)}</Text>
            </Text>
          )}

          <Text numberOfLines={2} style={styles.subtitle}>
            {item.note || "No description"}
          </Text>

          <Text style={styles.deadline}>
            Date: <Text style={{ fontWeight: "700" }}>{dateStr || "-"}</Text>
          </Text>

          {/* ✅ Delivery info */}
          <Text style={styles.deliveryInfo}>
            Delivery Method:{" "}
            {item.delivery_method === "donor" ? "Donor will deliver" : "Association Pickup"}
          </Text>

          <Text style={styles.deliveryInfo}>
            Delivery Status: {renderDeliveryStatus(item.delivery_status)}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusAccepted}>Accepted</Text>
        </View>

        <View style={styles.actionButtons}>
          {/* Details */}
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

          {/* Assign (only if association pickup & needs assignment) */}
          {showAssign && (
            <TouchableOpacity
              style={[styles.btn, styles.assignBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={() => goAssign(item.donation_id)}
              disabled={isSubmitting}
            >
              <Text style={styles.btnText}>Assign</Text>
            </TouchableOpacity>
          )}

          {/* Approve */}
          <TouchableOpacity
            style={[styles.btn, styles.approveBtn, isSubmitting && { opacity: 0.6 }]}
            onPress={() => approveDonation(item.donation_id)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const filterLabel = selectedDate === "ALL" ? "All Accepted Dates" : selectedDate;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerLarge}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <Text style={styles.headerMainTitle}>Accepted Food Donations</Text>
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
                No accepted food donations
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

            {/* Clickable Image */}
            <TouchableOpacity
              onPress={() => {
                setSelectedImage(selected.item_image);
                setImageViewerVisible(true);
              }}
            >
              {selected?.item_image ? (
                <Image source={{ uri: selected.item_image }} style={styles.modalImage} />
              ) : (
                <Image source={require("../assets/icon.png")} style={styles.modalImage} />
              )}
              <Text style={{ fontSize: 12, color: "#8b6f69", marginBottom: 8, fontWeight: "600", textAlign: "center" }}>👆 Tap to zoom</Text>
            </TouchableOpacity>

            <Text style={styles.modalName}>{selected?.donor_name || "Donor"}</Text>

            {!!selected?.food_type && (
              <Text style={styles.modalMeta}>
                Food Type: <Text style={{ fontWeight: "800" }}>{selected.food_type}</Text>
              </Text>
            )}

            {!!selected?.expiration_date && (
              <Text style={styles.modalMeta}>
                Expiration:{" "}
                <Text style={{ fontWeight: "800" }}>
                  {String(selected.expiration_date).slice(0, 10)}
                </Text>
              </Text>
            )}

            <Text style={styles.modalDesc}>
              {selected?.note?.trim() ? selected.note : "No description"}
            </Text>

            <Text style={styles.modalDate}>Date: {getYMD(selected?.created_at) || "-"}</Text>

            <Text style={styles.modalMeta}>
              Delivery Method:{" "}
              <Text style={{ fontWeight: "800" }}>
                {selected?.delivery_method === "donor"
                  ? "Donor will deliver"
                  : "Association Pickup"}
              </Text>
            </Text>

            <Text style={styles.modalMeta}>
              Delivery Status:{" "}
              <Text style={{ fontWeight: "800" }}>
                {renderDeliveryStatus(selected?.delivery_status)}
              </Text>
            </Text>

            <View style={styles.modalActions}>
              {/* Assign (only if needs assignment) */}
              {selected?.delivery_method === "association" &&
                (!selected?.delivery_status ||
                  selected?.delivery_status === "NEEDS_ASSIGNMENT") && (
                  <TouchableOpacity
                    style={[styles.btn, styles.assignBtn]}
                    onPress={() => {
                      const id = selected?.donation_id;
                      setDetailsVisible(false);
                      setSelected(null);
                      if (id) goAssign(id);
                    }}
                  >
                    <Text style={styles.btnText}>Assign</Text>
                  </TouchableOpacity>
                )}

              <TouchableOpacity
                style={[styles.btn, styles.approveBtn]}
                onPress={() => {
                  const id = selected?.donation_id;
                  setDetailsVisible(false);
                  setSelected(null);
                  if (id) approveDonation(id);
                }}
              >
                <Text style={styles.btnText}>Approve</Text>
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

      {/* Full-Screen Image Viewer */}
      <Modal visible={imageViewerVisible} transparent animationType="fade" onRequestClose={() => setImageViewerVisible(false)}>
        <Pressable
          style={styles.imageViewerOverlay}
          onPress={() => setImageViewerVisible(false)}
        >
          <View style={styles.imageViewerContent}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.imageViewerImage} resizeMode="contain" />
            ) : (
              <Image source={require("../assets/icon.png")} style={styles.imageViewerImage} resizeMode="contain" />
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.imageCloseBtn}
              onPress={() => setImageViewerVisible(false)}
            >
              <Text style={styles.imageCloseBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>
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
  statusAccepted: {
    backgroundColor: "#22c55e",
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "700",
  },

  actionButtons: { flexDirection: "row", gap: 10, marginTop: 15, flexWrap: "wrap" },
  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignItems: "center" },
  detailsBtn: { backgroundColor: "#8b6f69" },
  approveBtn: { backgroundColor: "#3b82f6" },
  assignBtn: { backgroundColor: "#8b6f69" },
  closeBtn: { backgroundColor: "#8b6f69" },
  btnText: { color: "#fff", fontWeight: "700" },

  // filter row
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
  modalDate: { fontSize: 13, color: "#666", marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  // Image Viewer Styles
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imageViewerContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageViewerImage: {
    width: "100%",
    height: "80%",
  },
  imageCloseBtn: {
    backgroundColor: "#8b6f69",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  imageCloseBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
