import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import config from "../config";
import { Ionicons } from "@expo/vector-icons";

export default function NotificationsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);

  const API = axios.create({ baseURL: config.API_URL, timeout: 15000 });

 const parseNotificationMessage = (raw) => {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;

    return {
      _text: obj.text || "",
      _kind: obj.kind || "default",
      _donation_id: obj.donation_id || null,
      association_id: obj.association_id || null,
      request_id: obj.request_id || null,
      donation_type: obj.donation_type || null,
      description: obj.description || null,
    };
  } catch {
    return {
      _text: String(raw),
      _kind: "default",
      _donation_id: null,
    };
  }
};

  const fetchNotifications = async () => {
    try {
      const userData = await AsyncStorage.getItem("user_data");
      if (!userData) {
        setItems([]);
        return;
      }

      const user = JSON.parse(userData);
      const userId = user.user_id;
      if (!userId) {
        setItems([]);
        return;
      }

      const res = await API.get(`/notifications/${userId}`);

      const mapped = res.data.map((n) => {
        const parsed = parseNotificationMessage(n.message);
        return { ...n, ...parsed };
      });

      setItems(mapped);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, []);

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US");
  };

  const openNotification = async (item) => {
  if (item.notification_id) {
    await API.post(`/notifications/read/${item.notification_id}`);
  }

 
  if (item._kind === "feedback") {
    Alert.alert("💬 Feedback", item._text || "—", [{ text: "OK" }]);
    return;
  }

  if (item._kind === "association_request") {
  navigation.navigate("AssociationInfo", {
    association_id: item.association_id,   
    request: {
      donationType: item.donation_type,
      description: item.description,
    },
    fromNotification: true,
  });
  return;
}
  if (item._donation_id) {
    navigation.navigate("DonationHistoryScreen", {
      focusDonationId: item._donation_id,
    });
    return;
  }

  Alert.alert("🔔 Notification", item._text || "—");
};

  const renderItem = ({ item }) => {
    const unread = item.is_read === false || item.is_read === 0;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => openNotification(item)}
        style={[styles.card, unread ? styles.cardUnread : null]}
      >
        <View style={styles.rowTop}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications" size={18} color="#A27571" />
          </View>

          <View style={styles.textWrap}>
            <Text style={styles.typeText}>
              {item.type ? String(item.type) : "Notification"}
            </Text>

            <Text style={styles.messageText} numberOfLines={2}>
              {item._text || "—"}
            </Text>

            {!!item.created_at && (
              <Text style={styles.dateText}>
                {formatDate(item.created_at)}
              </Text>
            )}
          </View>

          {item._donation_id && item._kind !== "feedback" ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Track</Text>
          </View>
        ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#A27571" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) =>
          String(item.notification_id || item.id || Math.random())
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 ? { flex: 1 } : null,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="notifications-off" size={44} color="#A27571" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySub}>
              When you receive a notification from an association or a delivery
              update, it will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EBE1D7",
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#000",
    fontSize: 14,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#000",
  },
  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EBE1D7",
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  card: {
    backgroundColor: "#EBE1D7",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  cardUnread: {
    borderWidth: 2,
  },

  rowTop: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 10,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EBE1D7",
  },

  textWrap: {
    flex: 1,
    alignItems: "flex-end",
  },

  typeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#A27571",
    marginBottom: 6,
    textAlign: "right",
  },

  messageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    textAlign: "right",
    lineHeight: 20,
  },

  dateText: {
    marginTop: 8,
    fontSize: 11,
    color: "#333",
    textAlign: "right",
  },

  badge: {
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#EBE1D7",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#000",
  },

  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: "#333",
    textAlign: "center",
    lineHeight: 18,
  },
});
