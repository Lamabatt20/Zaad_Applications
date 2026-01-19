import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, Image, TouchableOpacity,
  SafeAreaView, Dimensions, TextInput, ScrollView,
  Alert, KeyboardAvoidingView, Platform, StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SERVER_URL } from '../config';

const { width } = Dimensions.get('window');

export default function AssociationHomeFood({ route }) {
  const navigation = useNavigation();
  const username = route?.params?.username || "Association";
  const associationId = route?.params?.user_id;

  const [isFormVisible, setIsFormVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [requests, setRequests] = useState([]);

  // ===== Load Requests =====
  const loadRequests = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/assoc/request-donations/${associationId}`);
      const data = await response.json();
      if (data.ok) setRequests(data.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // ===== Handle Post Request =====
  const handlePostRequest = async () => {
    if (!description.trim()) {
      Alert.alert("Note", "Please describe the food items you need.");
      return;
    }

    // عنصر مؤقت ليظهر فورًا في القائمة
    const newRequestTemp = {
      request_id: Math.random().toString(),
      description,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    setRequests(prev => [newRequestTemp, ...prev]);
    setDescription('');
    setIsFormVisible(false);

    try {
      const response = await fetch(`${SERVER_URL}/assoc/request-donation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          association_id: associationId,
          donation_type: 'FOOD',
          description: newRequestTemp.description
        }),
      });

      const data = await response.json();
      console.log('POST response:', data);

      if (data.ok && data.data) {
        // تحديث العنصر المؤقت بالبيانات الصحيحة من السيرفر
        setRequests(prev => prev.map(r =>
          r.request_id === newRequestTemp.request_id ? data.data : r
        ));
        Alert.alert("Success ✅", "Your food request has been posted.");
      } else {
        Alert.alert("Error", "Could not post the request.");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Check your internet connection.");
    }
  };

  // ===== Handle Close Form =====
  const handleCloseForm = () => {
    setDescription('');
    setIsFormVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoCircle}>
              <Image source={require('../assets/images/image.png')} style={styles.logoIcon} resizeMode="contain" />
            </View>
            <Text style={styles.brandTitle}>ZAAD - Association Home</Text>
            <Text style={styles.welcomeText}>Welcome, {username}</Text>
          </View>

          <View style={styles.content}>
            {!isFormVisible ? (
              <>
                {/* البطاقة الرئيسية */}
                <View style={styles.cardShadowWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={styles.cardMain}
                    onPress={() => navigation.navigate("DashboardAssociationFoods", route.params)}
                  >
                    <View style={styles.imageBox}>
                      <Image source={require('../assets/images/requestfood.png')} style={styles.fullImg} resizeMode="cover" />
                    </View>
                    <View style={styles.cardFooter}>
                      <Text style={styles.cardTitle}>Food Donation</Text>
                      <View style={styles.whiteArrow}>
                        <Ionicons name="chevron-forward" size={18} color="#A27571" />
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* زر طلب جديد */}
                <TouchableOpacity activeOpacity={0.8} style={styles.mainButton} onPress={() => setIsFormVisible(true)}>
                  <View style={styles.innerCircle}>
                    <Ionicons name="add" size={22} color="#54403c" />
                  </View>
                  <Text style={styles.buttonText}>Request important new donation</Text>
                </TouchableOpacity>

                {/* قائمة الطلبات */}
                {requests.map(item => (
                  <View key={item.request_id} style={styles.requestCard}>
                    <Text style={styles.reqTitle}>Food Request</Text>
                    <Text style={styles.reqDesc}>{item.description}</Text>
                    <View style={styles.reqRow}>
                      <Text style={styles.reqDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                      <Text style={[styles.reqStatus, item.status === 'ACTIVE' ? styles.statusActive : styles.statusClosed]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            ) : (
              // الفورم
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>New Food Request</Text>
                  <TouchableOpacity onPress={handleCloseForm}>
                    <Ionicons name="close-circle" size={26} color="#A27571" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Food Details & Quantities</Text>
                <TextInput
                  style={styles.inputArea}
                  placeholder="Example: We need 30 hot meals, or 10 boxes of dry food items..."
                  placeholderTextColor="#999"
                  multiline
                  value={description}
                  onChangeText={setDescription}
                />

                <TouchableOpacity style={styles.postBtn} onPress={handlePostRequest}>
                  <Text style={styles.postBtnText}>Post Request</Text>
                  <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 10 }} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.bottomBranding}>
            <Text style={styles.zaadLettering}>Z  A  A  D</Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ===== Styles (مثل Clothes) =====
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EBE1D7' },
  header: { alignItems: 'center', marginTop: 15, marginBottom: 20 },
  logoCircle: { width: 75, height: 75, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 37.5, justifyContent: 'center', alignItems: 'center' },
  logoIcon: { width: 50, height: 50 },
  brandTitle: { fontSize: 13, color: '#54403c', letterSpacing: 1, fontFamily: 'serif', marginTop: 10, opacity: 0.6 },
  welcomeText: { fontSize: 28, fontWeight: '700', color: '#54403c', fontFamily: 'serif', marginTop: 5 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 25 },

  cardShadowWrapper: { width: '100%', shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 15, marginBottom: 35 },
  cardMain: { backgroundColor: '#fff', borderRadius: 35, overflow: 'hidden' },
  imageBox: { height: 300, width: '100%' },
  fullImg: { width: '100%', height: '100%' },
  cardFooter: { backgroundColor: '#A27571', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 20, paddingHorizontal: 25 },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', fontFamily: 'serif' },
  whiteArrow: { backgroundColor: '#fff', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },

  formCard: { width: '100%', backgroundColor: '#fff', borderRadius: 35, padding: 25, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15, marginTop: 10 },
  formHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  formTitle: { fontSize: 20, fontWeight: 'bold', color: '#54403c', fontFamily: 'serif' },
  label: { fontSize: 14, color: '#8b6f69', fontWeight: 'bold', marginBottom: 10, fontFamily: 'serif' },
  inputArea: { backgroundColor: '#f9f9f9', borderRadius: 20, padding: 15, height: 150, textAlignVertical: 'top', borderWidth: 1, borderColor: '#EBE1D7', fontSize: 16, color: '#54403c', marginBottom: 20 },
  postBtn: { backgroundColor: '#54403c', height: 60, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  postBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  mainButton: { flexDirection: 'row', backgroundColor: '#54403c', width: '100%', height: 65, borderRadius: 20, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  innerCircle: { backgroundColor: '#fff', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'serif' },

  requestCard: { width:'100%', backgroundColor:'#fff', borderRadius:25, padding:20, marginTop:20, shadowColor:"#000", shadowOpacity:0.08, shadowRadius:10, elevation:6 },
  reqTitle: { fontSize:16, fontWeight:'bold', color:'#54403c', fontFamily:'serif', marginBottom:6 },
  reqDesc: { fontSize:14, color:'#6f5b57', marginBottom:10 },
  reqRow: { flexDirection:'row', justifyContent:'space-between' },
  reqDate: { fontSize:12, color:'#999' },
  reqStatus: { fontSize:12, fontWeight:'bold', paddingHorizontal:10, paddingVertical:3, borderRadius:8, overflow:'hidden' },
  statusActive: { backgroundColor:'#D7EFE3', color:'#2E8B57' },
  statusClosed: { backgroundColor:'#F7D6D6', color:'#B22222' },

  bottomBranding: { paddingVertical: 25, alignItems: 'center' },
  zaadLettering: { fontSize: 18, color: '#8b6f69', letterSpacing: 10, fontWeight: '300' },
});
