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
import { Picker } from "@react-native-picker/picker";

export default function ApprovedClothesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [items, setItems] = useState([]);
  // 🔴 FEEDBACK
const [feedbackText, setFeedbackText] = useState({});
const [sendingFeedback, setSendingFeedback] = useState(false);
const [feedbackSent, setFeedbackSent] = useState({}); 

  // ✅ Details modal
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selected, setSelected] = useState(null);

  // ✅ Image viewer (full-screen zoom)
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // ✅ Date filter (same as pending)
  const [selectedDate, setSelectedDate] = useState("ALL");
  const [filterVisible, setFilterVisible] = useState(false);

  const buildImageUrl = (raw) => {
    if (!raw) return null;
    const fullUrl = String(raw).startsWith("/") ? `${config.API_URL}${raw}` : raw;
    return encodeURI(fullUrl);
  };

  const getYMD = (created_at) => {
    if (typeof created_at === "string" && created_at.includes("T")) {
      return created_at.split("T")[0];
    }
    return String(created_at || "").slice(0, 10);
  };

  
  const formatDeliveryStatus = (method, st) => {
    if (!st) return "Not started";

    if (method === "association") {
      const map = {
        NEEDS_ASSIGNMENT: "Needs driver",
        ASSIGNED: "Driver assigned",
        PICKED_UP: "Picked up",
        IN_TRANSIT: "In transit",
        DELIVERED: "Delivered",
      };
      return map[st] ?? st;
    }

    const map = {
      WAITING_FOR_DONOR: "Waiting for donor",
      DONOR_ON_THE_WAY: "Donor on the way",
      IN_TRANSIT: "On the way",
      DELIVERED: "Delivered",
    };
    return map[st] ?? st;
  };

  const normalizeDonation = (x) => ({
    donation_id: x.donation_id ?? x.id,
    donor_id: x.donor_id,
    donor_name: x.donor_name ?? x.full_name ?? "Donor",
    item_image: buildImageUrl(x.item_image ?? x.photo_url ?? null),
    note: x.note ?? x.description ?? "",
    created_at: x.created_at ?? x.createdAt ?? new Date().toISOString(),
    status: x.status ?? "approved",

   
    delivery_method: x.delivery_method ?? "donor",
    delivery_status: x.delivery_status ?? null,
    delivery_person_id: x.delivery_person_id ?? null,
    delivery_person_name: x.delivery_person_name ?? "", 
  });

  const fetchData = async () => {
    try {
      setErrorMsg("");
      setLoading(true);

      // ✅ Get association_id from AsyncStorage
      const userDataStr = await AsyncStorage.getItem("user_data");
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const associationId = userData?.association_id;

      // ✅ CLOTHES approved endpoint
      const url = associationId
        ? `${config.API_URL}/donations/clothes/approved?association_id=${associationId}`
        : `${config.API_URL}/donations/clothes/approved`;

      const res = await axios.get(url);

      const arr = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      const normalized = arr.map(normalizeDonation);
      setItems(normalized);

     
      const dates = new Set(normalized.map((d) => getYMD(d.created_at)).filter(Boolean));
      if (selectedDate !== "ALL" && !dates.has(selectedDate)) setSelectedDate("ALL");
    } catch (e) {
      setErrorMsg(typeof e?.message === "string" ? e.message : "Failed to load approved donations");
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

  // ✅ Dropdown options (existing dates only)
  const allDates = useMemo(() => {
    const set = new Set();
    items.forEach((d) => {
      const ymd = getYMD(d.created_at);
      if (ymd) set.add(ymd);
    });
    return ["ALL", ...Array.from(set).sort()]; // same as pending
  }, [items]);

  // ✅ filtered list (same as pending)
  const filteredItems =
    selectedDate === "ALL" ? items : items.filter((d) => getYMD(d.created_at) === selectedDate);

  // ✅ Group donations by donor_id and time
  const groupDonations = (donations) => {
    // Group by donor_id first
    const byDonor = {};
    donations.forEach((d) => {
      if (!byDonor[d.donor_id]) {
        byDonor[d.donor_id] = [];
      }
      byDonor[d.donor_id].push(d);
    });

    // Within each donor, group by time (5 minute windows)
    const groups = [];
    Object.values(byDonor).forEach((donorDonations) => {
      const sorted = donorDonations.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      let currentGroup = [sorted[0]];
      for (let i = 1; i < sorted.length; i++) {
        const prev = new Date(sorted[i - 1].created_at).getTime();
        const curr = new Date(sorted[i].created_at).getTime();
        const diffMinutes = (curr - prev) / (1000 * 60);

        if (diffMinutes <= 5) {
          currentGroup.push(sorted[i]);
        } else {
          groups.push(currentGroup);
          currentGroup = [sorted[i]];
        }
      }
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
    });

    return groups;
  };

  // ✅ Group the filtered items
  const groupedItems = useMemo(() => {
    return groupDonations(filteredItems);
  }, [filteredItems]);

  const renderItem = ({ item: group }) => {
    const firstDonation = group[0];

    return (
      <View style={styles.card}>
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{firstDonation.donor_name}</Text>
            <Text style={styles.itemCount}>
              {group.length} item{group.length > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusApproved}>Approved</Text>
          </View>
        </View>

        {/* Items in Group */}
        <View style={styles.itemsContainer}>
          {group.map((item, idx) => {
            const dateStr = getYMD(item.created_at);

            return (
              <View key={item.donation_id} style={[styles.groupItem, idx > 0 && styles.groupItemBorder]}>
                <View style={styles.itemContent}>
                  {item.item_image ? (
                    <Image source={{ uri: item.item_image }} style={styles.itemImage} />
                  ) : (
                    <Image source={require("../assets/icon.png")} style={styles.itemImage} />
                  )}

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text numberOfLines={2} style={styles.subtitle}>
                      {item.note || "No description"}
                    </Text>

                    <Text style={styles.deadline}>
                      Date: <Text style={{ fontWeight: "700" }}>{dateStr || "-"}</Text>
                    </Text>

                    {/* ✅ Delivery info */}
                    <Text style={styles.deliveryInfo}>
                      Method:{" "}
                      <Text style={{ fontWeight: "700" }}>
                        {item.delivery_method === "association" ? "Association Pickup" : "Donor will deliver"}
                      </Text>
                    </Text>

                    <Text style={styles.deliveryInfo}>
                      Status:{" "}
                      <Text style={{ fontWeight: "700" }}>
                        {formatDeliveryStatus(item.delivery_method, item.delivery_status)}
                      </Text>
                    </Text>
                    {item.delivery_method === "association" && !!item.delivery_person_name && (
                      <Text style={styles.deliveryInfo}>
                        Driver: <Text style={{ fontWeight: "700" }}>{item.delivery_person_name}</Text>
                      </Text>
                    )}
                  </View>
                </View>

                {/* 🔴 FEEDBACK (only when delivered) */}
                {item.delivery_status === "DELIVERED" && !feedbackSent[item.donation_id] && (
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

                {/* Item Details Button */}
                <View style={styles.itemActionButtons}>
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
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const modalDate = getYMD(selected?.created_at);
  const filterLabel = selectedDate === "ALL" ? "All Approved Dates" : selectedDate;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerLarge}>
        <Image
          source={require("../assets/images/image.png")}
          style={styles.welcomeLogo}
          resizeMode="contain"
        />
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerMainTitle}>Approved Donations</Text>
        </View>
      </View>

      {/* Filter Modal (same as Pending) */}
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
                      {d === "ALL" ? "All Approved Dates" : d}
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

      {!!errorMsg && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* Filter (button + modal like Pending) */}
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

      <View style={styles.content}>
        {loading ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 8 }}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={groupedItems}
            keyExtractor={(it, idx) => `group-${idx}`}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 30 }}>No approved donations</Text>
            }
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        )}
      </View>

      {/* ✅ Details Modal */}
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
            <Text style={styles.modalDesc}>
              {selected?.note?.trim() ? selected.note : "No description"}
            </Text>

            <Text style={styles.modalDate}>Date: {modalDate || "-"}</Text>

            <Text style={styles.modalDate}>
              Delivery Method:{" "}
              <Text style={{ fontWeight: "800" }}>
                {selected?.delivery_method === "association"
                  ? "Association Pickup"
                  : "Donor will deliver"}
              </Text>
            </Text>

            <Text style={styles.modalDate}>
              Delivery Status:{" "}
              <Text style={{ fontWeight: "800" }}>
                {formatDeliveryStatus(selected?.delivery_method, selected?.delivery_status)}
              </Text>
            </Text>

            {selected?.delivery_method === "association" && !!selected?.delivery_person_name && (
              <Text style={styles.modalDate}>
                Driver: <Text style={{ fontWeight: "800" }}>{selected.delivery_person_name}</Text>
              </Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.detailsBtn]}
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

  content: { flex: 1, backgroundColor: "#EBE1D7" },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 15,
    flexDirection: "column",
    marginBottom: 20,
    elevation: 3,
  },
  groupHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  itemCount: { fontSize: 12, color: "#666", marginTop: 3 },
  itemsContainer: { marginBottom: 15 },
  groupItem: { paddingVertical: 10 },
  groupItemBorder: { borderTopWidth: 1, borderTopColor: "#e0e0e0" },
  itemContent: { flexDirection: "row", alignItems: "flex-start" },
  itemImage: { width: 70, height: 70, borderRadius: 10 },
  itemActionButtons: { flexDirection: "row", justifyContent: "flex-start", marginTop: 10 },
  title: { fontSize: 18, fontWeight: "700", color: "#333" },
  subtitle: { fontSize: 14, color: "#666", marginVertical: 5, width: "90%" },
  deadline: { marginTop: 5, fontSize: 14, color: "#333" },

  // ✅ added
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

  btn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, alignItems: "center", flex: 1 },
  detailsBtn: { backgroundColor: "#8b6f69" },
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
  modalName: { fontSize: 16, fontWeight: "700", color: "#333", marginBottom: 6 },
  modalDesc: { fontSize: 14, color: "#555", marginBottom: 10, lineHeight: 20 },
  modalDate: { fontSize: 13, color: "#666", marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end" },

  // filter row (copied from Pending)
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
  filterBtnValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
  },
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
