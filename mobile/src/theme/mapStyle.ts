// High-Detail Map Styles for React Native Maps
// Designed for clear visibility of small villages, rural roads, hamlets, landmarks, and street hierarchy

export const highDetailDarkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#0d1322' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e2e8f0' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#090d17' }, { weight: 3 }],
  },
  // Administrative (Districts, Cities, Towns, Villages, Gram Panchayats)
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ffffff' }, { weight: 2 }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#7dd3fc' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  // Highways & Arterial Expressways (Vibrant Blue/Cyan)
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#0284c7' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0c4a6e' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#ffffff' }, { weight: 2 }],
  },
  // Arterial & Connecting District Roads
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#2563eb' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e3a8a' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e0f2fe' }],
  },
  // Local Streets & Rural Connecting Roads (High Contrast, clearly visible)
  {
    featureType: 'road.local',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road.local',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road.local',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  // Points of Interest (Colleges, Schools, Landmarks, Bus Stands)
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
  {
    featureType: 'poi.school',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a855f7' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#064e3b' }, { opacity: 0.7 }],
  },
  // Transit & Railway
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f59e0b' }],
  },
  // Water Bodies
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0c1e36' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
];

// Alias for backwards compatibility
export const darkMapStyle = highDetailDarkMapStyle;
