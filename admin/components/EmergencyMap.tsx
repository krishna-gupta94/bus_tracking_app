'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, ExternalLink, ShieldAlert, User, Bus as BusIcon, AlertTriangle } from 'lucide-react';

// Fix Leaflet default icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Student SOS Custom Marker
const createStudentSOSIcon = (name: string, studentCode?: string | null) =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <!-- Pulsing Radar Rings -->
        <div style="
          position:absolute;
          top:-8px;
          left:50%;
          transform:translateX(-50%);
          width:52px;
          height:52px;
          border-radius:50%;
          background:rgba(239, 68, 68, 0.35);
          animation:sosPulse 1.5s infinite ease-out;
          pointer-events:none;
        "></div>
        <div style="
          position:absolute;
          top:-16px;
          left:50%;
          transform:translateX(-50%);
          width:68px;
          height:68px;
          border-radius:50%;
          background:rgba(239, 68, 68, 0.15);
          animation:sosPulse 1.5s infinite ease-out 0.4s;
          pointer-events:none;
        "></div>

        <!-- Student SOS Badge -->
        <div style="
          background:#dc2626;
          border:2.5px solid #ffffff;
          border-radius:20px;
          padding:5px 12px;
          display:flex;
          align-items:center;
          gap:6px;
          box-shadow:0 4px 20px rgba(220, 38, 38, 0.85);
          color:#ffffff;
          font-size:12px;
          font-weight:900;
          white-space:nowrap;
          z-index:10;
        ">
          <span style="font-size:14px;">👤🚨</span>
          <span>${name}</span>
          ${studentCode ? `<span style="opacity:0.85;font-size:10px;font-weight:700;">(${studentCode})</span>` : ''}
        </div>
        <div style="
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:8px solid #dc2626;
          margin-top:-1px;
          z-index:10;
        "></div>
      </div>
      <style>
        @keyframes sosPulse {
          0% { transform:translateX(-50%) scale(0.6); opacity:1; }
          100% { transform:translateX(-50%) scale(1.6); opacity:0; }
        }
      </style>
    `,
    iconSize: [140, 48],
    iconAnchor: [70, 44],
  });

// Driver SOS Custom Marker
const createDriverSOSIcon = (name: string, busNumber?: string | null) =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <!-- Pulsing Radar Rings -->
        <div style="
          position:absolute;
          top:-8px;
          left:50%;
          transform:translateX(-50%);
          width:52px;
          height:52px;
          border-radius:50%;
          background:rgba(245, 158, 11, 0.35);
          animation:sosPulse 1.5s infinite ease-out;
          pointer-events:none;
        "></div>

        <!-- Driver SOS Badge -->
        <div style="
          background:#ea580c;
          border:2.5px solid #ffffff;
          border-radius:20px;
          padding:5px 12px;
          display:flex;
          align-items:center;
          gap:6px;
          box-shadow:0 4px 20px rgba(234, 88, 12, 0.85);
          color:#ffffff;
          font-size:12px;
          font-weight:900;
          white-space:nowrap;
          z-index:10;
        ">
          <span style="font-size:14px;">🚌🚨</span>
          <span>${busNumber ? `BUS ${busNumber}` : 'DRIVER'}: ${name}</span>
        </div>
        <div style="
          width:0;height:0;
          border-left:6px solid transparent;
          border-right:6px solid transparent;
          border-top:8px solid #ea580c;
          margin-top:-1px;
          z-index:10;
        "></div>
      </div>
    `,
    iconSize: [160, 48],
    iconAnchor: [80, 44],
  });

// Helper component to center map on coordinates
function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 16, { animate: true, duration: 1.2 });
  }, [lat, lon, map]);
  return null;
}

export interface EmergencyMapProps {
  alertId: string;
  userId: string;
  userName: string;
  userRole: 'STUDENT' | 'DRIVER' | string;
  studentCode?: string | null;
  driverCode?: string | null;
  busNumber?: string | null;
  routeName?: string | null;
  stopName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAddress?: string | null;
  status: string;
  severity: string;
  timestamp: string;
  note?: string | null;
}

export default function EmergencyMap({ alert }: { alert: EmergencyMapProps }) {
  const hasValidLocation =
    typeof alert.latitude === 'number' &&
    typeof alert.longitude === 'number' &&
    alert.latitude !== 0 &&
    alert.longitude !== 0;

  const lat = alert.latitude || 28.367;
  const lon = alert.longitude || 79.4304;

  const isStudent = alert.userRole === 'STUDENT';
  const markerIcon = isStudent
    ? createStudentSOSIcon(alert.userName, alert.studentCode)
    : createDriverSOSIcon(alert.userName, alert.busNumber);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* MAP CANVAS */}
      <div
        style={{
          position: 'relative',
          height: 380,
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          border: '1.5px solid var(--border)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
        }}
      >
        {hasValidLocation ? (
          <MapContainer
            center={[lat, lon]}
            zoom={16}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <RecenterMap lat={lat} lon={lon} />

            {/* Radar Radius Zone */}
            <Circle
              center={[lat, lon]}
              radius={80}
              pathOptions={{
                color: isStudent ? '#ef4444' : '#f97316',
                fillColor: isStudent ? '#ef4444' : '#f97316',
                fillOpacity: 0.18,
                weight: 2,
                dashArray: '4, 6',
              }}
            />

            {/* Live Distress Marker */}
            <Marker position={[lat, lon]} icon={markerIcon}>
              <Popup>
                <div style={{ padding: 4, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>{isStudent ? '👤🚨' : '🚌🚨'}</span>
                    <strong style={{ color: isStudent ? '#dc2626' : '#ea580c', fontSize: 13 }}>
                      {isStudent ? 'STUDENT EMERGENCY' : 'DRIVER EMERGENCY'}
                    </strong>
                  </div>

                  <div style={{ fontSize: 12, marginBottom: 3 }}>
                    <strong>Caller:</strong> {alert.userName} {alert.studentCode ? `(${alert.studentCode})` : ''}
                  </div>
                  {alert.busNumber && (
                    <div style={{ fontSize: 12, marginBottom: 3 }}>
                      <strong>Bus:</strong> BUS {alert.busNumber}
                    </div>
                  )}
                  {alert.routeName && (
                    <div style={{ fontSize: 12, marginBottom: 3 }}>
                      <strong>Route:</strong> {alert.routeName}
                    </div>
                  )}
                  {alert.stopName && (
                    <div style={{ fontSize: 12, marginBottom: 3 }}>
                      <strong>Designated Stop:</strong> {alert.stopName}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    <strong>GPS Coordinates:</strong> {lat.toFixed(5)}, {lon.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        ) : (
          /* Location Unavailable State */
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-secondary)',
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                color: 'var(--warning)',
              }}
            >
              <AlertTriangle size={28} />
            </div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
              {isStudent ? 'Student Location Unavailable' : 'Driver Location Unavailable'}
            </h4>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--text-secondary)', maxWidth: 360 }}>
              The caller’s device did not provide GPS coordinates at the time of the distress trigger (location permission denied or offline).
            </p>
          </div>
        )}

        {/* Floating SOS Badge in Top Corner of Map */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 1000,
            background: isStudent ? 'rgba(220, 38, 38, 0.95)' : 'rgba(234, 88, 12, 0.95)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: 20,
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          <span>{isStudent ? '👤' : '🚌'}</span>
          <span>{isStudent ? '🚨 STUDENT SOS INCIDENT' : '🚨 DRIVER SOS INCIDENT'}</span>
        </div>
      </div>

      {/* LOCATION ADDRESS & DISPATCH NAVIGATION BAR */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          border: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <MapPin size={15} color={hasValidLocation ? 'var(--danger)' : 'var(--warning)'} />
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
              EMERGENCY LOCATION
            </span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
            {alert.locationAddress || (hasValidLocation ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : 'Student location unavailable')}
          </div>
          {hasValidLocation && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Coordinates: {lat.toFixed(5)}, {lon.toFixed(5)} • Recorded at: {new Date(alert.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {hasValidLocation && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px' }}
          >
            <Navigation size={14} /> Open Navigation
            <ExternalLink size={12} style={{ opacity: 0.7 }} />
          </a>
        )}
      </div>
    </div>
  );
}
