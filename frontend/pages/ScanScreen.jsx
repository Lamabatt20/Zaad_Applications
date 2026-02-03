// ScanScreen.js
import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { searchProductByBarcode } from "../utils/productDatabase";
import API from "../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ScanScreen({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [closing, setClosing] = useState(false);
  const [value, setValue] = useState(null);
  const [product, setProduct] = useState(null);
  const [foundMessage, setFoundMessage] = useState("");
  const [cameraKey, setCameraKey] = useState(0);
  const autoCloseRef = useRef(null);

  const images = useMemo(() => route?.params?.images || [], [route?.params?.images]);
  const returnTo = useMemo(() => route?.params?.returnTo || "DonateFoodScreen", [route?.params?.returnTo]);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) requestPermission();
  }, [permission, requestPermission]);

  const refreshCamera = () => {
    setCameraKey((prev) => prev + 1);
    setScanned(false);
    setValue(null);
    setProduct(null);
    setFoundMessage("");
  };

  const lookupProduct = async (barcode) => {
    const local = searchProductByBarcode(barcode);
    if (local) return local;

    try {
      const res = await fetch(`${API.API_URL}/products/${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.success && data?.product) {
          return {
            barcode,
            name: data.product.name,
            category: data.product.category || "",
          };
        }
      }
    } catch (e) {}

    // Fallback OCR using first image
    if (images && images.length > 0) {
      try {
        const form = new FormData();
        form.append("barcode", String(barcode));
        form.append("image", {
          uri: images[0],
          name: "barcode_fallback.jpg",
          type: "image/jpeg",
        });

        const ocrRes = await fetch(`${API.API_URL}/products/lookup-with-ocr`, {
          method: "POST",
          body: form,
        });

        if (ocrRes.ok) {
          const data = await ocrRes.json();
          const prod = data.product || {};
          const category = prod.category || data.category || "";
          const name = prod.name || "Scanned Item";

          if (category || name) {
            return { barcode, name, category };
          }
        }
      } catch (e) {}
    }

    return null;
  };

  const handleBarcodeScan = async (scanningResult) => {
    if (scanned || closing) return;

    setScanned(true);
    setClosing(true);
    setValue(scanningResult.data);

    const foundProduct = await lookupProduct(scanningResult.data);
    setProduct(foundProduct ?? null);
    setFoundMessage(foundProduct ? "Product found" : "Product not found – OCR failed");

    try {
      await AsyncStorage.setItem(
        "scanned_product",
        JSON.stringify(foundProduct ?? { barcode: scanningResult.data })
      );
    } catch (e) {}

    // Show results for 1.5 seconds, then auto-close
    console.log("📱 [handleBarcodeScan] Barcode scanned:", scanningResult.data);
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
    }

    autoCloseRef.current = setTimeout(() => {
      console.log("🔙 [handleBarcodeScan] Auto-closing screen");
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate(returnTo);
      }
      setClosing(false);
      autoCloseRef.current = null;
    }, 1500);
  };

  const resetScanner = () => {
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }
    setScanned(false);
    setClosing(false);
    setValue(null);
    setProduct(null);
    setFoundMessage("");
  };

  useEffect(() => {
    return () => {
      if (autoCloseRef.current) {
        clearTimeout(autoCloseRef.current);
        autoCloseRef.current = null;
      }
    };
  }, []);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 12 }}>Camera permission is blocked.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Allow Camera</Text>
        </TouchableOpacity>
        <Text style={{ marginTop: 12, textAlign: "center" }}>
          If it still refuses, open your phone Settings and allow Camera for this app.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        key={cameraKey}
        style={{ flex: 1 }}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
      />

      <TouchableOpacity style={styles.refreshBtn} onPress={refreshCamera}>
        <Text style={styles.refreshText}>🔄 Refresh Camera</Text>
      </TouchableOpacity>

      {value && (
        <View style={styles.box}>
          <Text style={styles.barcodeLabel}>Barcode:</Text>
          <Text style={styles.barcodeValue}>{value}</Text>

          {foundMessage ? (
            <Text style={[styles.foundText, product ? styles.foundOk : styles.foundFail]}>
              {foundMessage}
            </Text>
          ) : null}

          {product ? (
            <View style={styles.productInfo}>
              <Text style={styles.productLabel}>
                Product: <Text style={styles.productValue}>{product.name}</Text>
              </Text>
              <Text style={styles.productLabel}>
                Category: <Text style={styles.productValue}>{product.category}</Text>
              </Text>
            </View>
          ) : (
            <Text style={styles.notFound}>Product not found in database</Text>
          )}

          <TouchableOpacity style={styles.btn} onPress={resetScanner}>
            <Text style={styles.btnText}>Scan Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, { marginTop: 8, backgroundColor: "#4CAF50" }]}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate(returnTo);
              }
            }}
          >
            <Text style={styles.btnText}>Close Scanner</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  box: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    padding: 16,
    borderRadius: 8,
    minWidth: 250,
    alignItems: "center",
    maxWidth: 300,
  },
  barcodeLabel: {
    color: "#999",
    fontSize: 12,
    marginBottom: 4,
  },
  barcodeValue: {
    color: "#00ff00",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    fontFamily: "Courier New",
  },
  productInfo: {
    width: "100%",
    backgroundColor: "rgba(30, 144, 255, 0.2)",
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#1e90ff",
  },
  productLabel: {
    color: "#ddd",
    fontSize: 14,
    marginBottom: 8,
  },
  productValue: {
    color: "#00ff00",
    fontWeight: "bold",
  },
  foundText: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "600",
  },
  foundOk: { color: "#4CAF50" },
  foundFail: { color: "#ff6b6b" },
  notFound: {
    color: "#ff6b6b",
    fontSize: 12,
    marginBottom: 12,
    fontStyle: "italic",
  },
  btn: {
    backgroundColor: "#1e90ff",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    minWidth: 140,
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontWeight: "600",
  },
  refreshBtn: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 12,
    borderRadius: 8,
  },
  refreshText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
