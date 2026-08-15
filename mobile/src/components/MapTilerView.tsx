import React, { useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { MAPTILER_API_KEY } from '../config/maptiler';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface MapStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  address?: string | null;
}

export interface MapTilerViewProps {
  busLocation?: MapCoordinate & { speed?: number; heading?: number; timestamp?: string } | null;
  userLocation?: MapCoordinate | null;
  stops?: MapStop[];
  assignedStop?: MapStop | null;
  busNumber?: string;
  mapStyle?: 'streets' | 'dark' | 'hybrid' | 'outdoor';
  onStopPress?: (stop: MapStop) => void;
  onBusPress?: () => void;
  style?: any;
}

export interface MapTilerViewRef {
  centerOnBus: () => void;
  centerOnUser: () => void;
  fitAllMarkers: () => void;
  setMapStyle: (style: 'streets' | 'dark' | 'hybrid' | 'outdoor') => void;
}

export const MapTilerView = forwardRef<MapTilerViewRef, MapTilerViewProps>(
  (
    {
      busLocation,
      userLocation,
      stops = [],
      assignedStop,
      busNumber = 'BUS',
      mapStyle = 'streets',
      onStopPress,
      onBusPress,
      style,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView | null>(null);
    const isReadyRef = useRef(false);

    // Initial center point (prioritize user -> assigned stop -> bus -> first stop -> campus)
    const initialLat =
      userLocation?.latitude ||
      assignedStop?.latitude ||
      busLocation?.latitude ||
      stops[0]?.latitude ||
      28.367;
    const initialLon =
      userLocation?.longitude ||
      assignedStop?.longitude ||
      busLocation?.longitude ||
      stops[0]?.longitude ||
      79.4304;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: #0f172a;
    }
    .leaflet-control-attribution {
      font-size: 8px !important;
      background: rgba(15,23,42,0.7) !important;
      color: #94a3b8 !important;
    }
    .leaflet-control-attribution a {
      color: #38bdf8 !important;
    }
    /* Custom Pulsing Bus Marker */
    .bus-marker-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bus-marker-pulse {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(14, 165, 233, 0.35);
      animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    @keyframes pulse-ring {
      0% { transform: scale(0.6); opacity: 0.9; }
      70% { transform: scale(1.4); opacity: 0; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .bus-marker-icon {
      position: relative;
      width: 32px;
      height: 32px;
      background: #0284c7;
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(2,132,199,0.5);
      font-size: 16px;
      z-index: 10;
    }
    .bus-marker-badge {
      position: absolute;
      bottom: -14px;
      background: #0f172a;
      color: #38bdf8;
      border: 1px solid #0284c7;
      font-size: 9px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 4px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    /* Student Location Marker */
    .user-marker-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-marker-pulse {
      position: absolute;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.4);
      animation: pulse-ring 2s infinite;
    }
    .user-marker-dot {
      width: 16px;
      height: 16px;
      background: #10b981;
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(16,185,129,0.6);
      z-index: 5;
    }
    /* Stop Pin */
    .stop-marker-pin {
      width: 24px;
      height: 24px;
      background: #1e293b;
      border: 2px solid #6366f1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .stop-marker-assigned {
      width: 28px;
      height: 28px;
      background: #10b981;
      border: 2.5px solid #ffffff;
      color: #ffffff;
      font-size: 11px;
      font-weight: 900;
      box-shadow: 0 4px 12px rgba(16,185,129,0.6);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const MAPTILER_KEY = '${MAPTILER_API_KEY}';
    let map;
    let tileLayer;
    let busMarker;
    let userMarker;
    let stopsLayer = L.layerGroup();
    let polylineLayer;

    const styles = {
      streets: 'https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=' + MAPTILER_KEY,
      dark: 'https://api.maptiler.com/maps/dataviz-dark/256/{z}/{x}/{y}.png?key=' + MAPTILER_KEY,
      hybrid: 'https://api.maptiler.com/maps/hybrid/256/{z}/{x}/{y}.jpg?key=' + MAPTILER_KEY,
      outdoor: 'https://api.maptiler.com/maps/outdoor-v2/256/{z}/{x}/{y}.png?key=' + MAPTILER_KEY
    };

    function initMap() {
      map = L.map('map', {
        center: [${initialLat}, ${initialLon}],
        zoom: 13,
        zoomControl: false,
        attributionControl: true
      });

      tileLayer = L.tileLayer(styles['${mapStyle}'] || styles.streets, {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; OpenStreetMap'
      }).addTo(map);

      stopsLayer.addTo(map);

      // Notify React Native that map is loaded
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_READY' }));
    }

    function setTileStyle(styleKey) {
      if (styles[styleKey] && tileLayer) {
        tileLayer.setUrl(styles[styleKey]);
      }
    }

    function updateBusMarker(data) {
      if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        if (busMarker) { map.removeLayer(busMarker); busMarker = null; }
        return;
      }

      const iconHtml = '<div class="bus-marker-container">' +
        '<div class="bus-marker-pulse"></div>' +
        '<div class="bus-marker-icon">🚌</div>' +
        '<div class="bus-marker-badge">' + (data.busNumber || 'BUS') + '</div>' +
        '</div>';

      const busIcon = L.divIcon({
        className: 'custom-bus-div',
        html: iconHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22]
      });

      if (!busMarker) {
        busMarker = L.marker([data.latitude, data.longitude], { icon: busIcon, zIndexOffset: 1000 }).addTo(map);
        busMarker.on('click', () => {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'BUS_CLICK' }));
        });
      } else {
        busMarker.setLatLng([data.latitude, data.longitude]);
        busMarker.setIcon(busIcon);
      }
    }

    function updateUserMarker(data) {
      if (!data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
        return;
      }

      const iconHtml = '<div class="user-marker-container">' +
        '<div class="user-marker-pulse"></div>' +
        '<div class="user-marker-dot"></div>' +
        '</div>';

      const userIcon = L.divIcon({
        className: 'custom-user-div',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (!userMarker) {
        userMarker = L.marker([data.latitude, data.longitude], { icon: userIcon, zIndexOffset: 500 }).addTo(map);
      } else {
        userMarker.setLatLng([data.latitude, data.longitude]);
      }
    }

    function updateStops(stopsList, assignedStopId) {
      stopsLayer.clearLayers();
      if (polylineLayer) { map.removeLayer(polylineLayer); polylineLayer = null; }

      if (!stopsList || stopsList.length === 0) return;

      const polyPoints = [];

      stopsList.forEach(s => {
        polyPoints.push([s.latitude, s.longitude]);
        const isAssigned = assignedStopId === s.id;
        const cls = isAssigned ? 'stop-marker-pin stop-marker-assigned' : 'stop-marker-pin';
        const size = isAssigned ? [28, 28] : [24, 24];
        const anchor = isAssigned ? [14, 14] : [12, 12];

        const stopIcon = L.divIcon({
          className: 'custom-stop-div',
          html: '<div class="' + cls + '">' + (s.sequence || '') + '</div>',
          iconSize: size,
          iconAnchor: anchor
        });

        const m = L.marker([s.latitude, s.longitude], { icon: stopIcon, zIndexOffset: isAssigned ? 200 : 100 });
        m.on('click', () => {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'STOP_CLICK', stop: s }));
        });
        stopsLayer.addLayer(m);
      });

      if (polyPoints.length > 1) {
        polylineLayer = L.polyline(polyPoints, {
          color: '#0ea5e9',
          weight: 4,
          opacity: 0.85,
          smoothFactor: 1
        }).addTo(map);
      }
    }

    function flyToCoords(lat, lon, zoom) {
      if (map && typeof lat === 'number' && typeof lon === 'number') {
        map.flyTo([lat, lon], zoom || 15, { animate: true, duration: 0.8 });
      }
    }

    function fitAll(busCoords, userCoords, stopsList) {
      if (!map) return;
      const bounds = [];
      if (busCoords && typeof busCoords.latitude === 'number') {
        bounds.push([busCoords.latitude, busCoords.longitude]);
      }
      if (userCoords && typeof userCoords.latitude === 'number') {
        bounds.push([userCoords.latitude, userCoords.longitude]);
      }
      if (stopsList && stopsList.length > 0) {
        stopsList.forEach(s => bounds.push([s.latitude, s.longitude]));
      }

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
      } else if (bounds.length === 1) {
        map.flyTo(bounds[0], 14, { animate: true });
      }
    }

    window.onload = initMap;
  </script>
</body>
</html>
    `;

    const sendToWebview = useCallback((jsCode: string) => {
      if (webViewRef.current && isReadyRef.current) {
        webViewRef.current.injectJavaScript(jsCode + '; true;');
      }
    }, []);

    // Push updates to MapTiler webview
    const syncMapData = useCallback(() => {
      if (!isReadyRef.current) return;

      // Update bus
      if (busLocation) {
        sendToWebview(`updateBusMarker(${JSON.stringify({
          latitude: busLocation.latitude,
          longitude: busLocation.longitude,
          speed: busLocation.speed,
          heading: busLocation.heading,
          busNumber: busNumber,
        })})`);
      } else {
        sendToWebview('updateBusMarker(null)');
      }

      // Update user
      if (userLocation) {
        sendToWebview(`updateUserMarker(${JSON.stringify({
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        })})`);
      } else {
        sendToWebview('updateUserMarker(null)');
      }

      // Update stops & polyline
      sendToWebview(`updateStops(${JSON.stringify(stops)}, ${JSON.stringify(assignedStop?.id || null)})`);
    }, [busLocation, userLocation, stops, assignedStop, busNumber, sendToWebview]);

    useEffect(() => {
      syncMapData();
    }, [syncMapData]);

    const handleMessage = (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        if (msg.type === 'MAP_READY') {
          isReadyRef.current = true;
          syncMapData();
          // Auto-fit coordinates on initial load
          setTimeout(() => {
            sendToWebview(`fitAll(${JSON.stringify(busLocation || null)}, ${JSON.stringify(userLocation || null)}, ${JSON.stringify(stops)})`);
          }, 300);
        } else if (msg.type === 'STOP_CLICK' && onStopPress && msg.stop) {
          onStopPress(msg.stop);
        } else if (msg.type === 'BUS_CLICK' && onBusPress) {
          onBusPress();
        }
      } catch (e) {}
    };

    // Imperative Camera Controls
    useImperativeHandle(ref, () => ({
      centerOnBus: () => {
        if (busLocation) {
          sendToWebview(`flyToCoords(${busLocation.latitude}, ${busLocation.longitude}, 15)`);
        }
      },
      centerOnUser: () => {
        if (userLocation) {
          sendToWebview(`flyToCoords(${userLocation.latitude}, ${userLocation.longitude}, 15)`);
        } else if (assignedStop) {
          sendToWebview(`flyToCoords(${assignedStop.latitude}, ${assignedStop.longitude}, 15)`);
        }
      },
      fitAllMarkers: () => {
        sendToWebview(`fitAll(${JSON.stringify(busLocation || null)}, ${JSON.stringify(userLocation || null)}, ${JSON.stringify(stops)})`);
      },
      setMapStyle: (newStyle: 'streets' | 'dark' | 'hybrid' | 'outdoor') => {
        sendToWebview(`setTileStyle('${newStyle}')`);
      },
    }));

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: htmlContent }}
          style={styles.webview}
          onMessage={handleMessage}
          scrollEnabled={false}
          bounces={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
          )}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
