'use client';
import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@/lib/leaflet-fix';
import 'leaflet/dist/leaflet.css';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';
import {
  searchLocations,
  GeocodeResult,
  MAP_PROVIDERS,
  MAPTILER_API_KEY,
} from '@/lib/geocoding';
import {
  Search, MapPin, Navigation, Compass, Layers,
  Radio, Clock, Users, ArrowUpRight, RotateCcw,
  Loader2, X, CheckCircle2
} from 'lucide-react';

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const BUS_ICON = (busNumber: string, isSelected: boolean) =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
        <div style="
          background:${isSelected ? '#0284c7' : '#0ea5e9'};
          border:3px solid #ffffff;
          border-radius:12px;
          padding:3px 8px;
          display:flex;
          align-items:center;
          gap:4px;
          box-shadow:0 0 20px ${isSelected ? 'rgba(14,165,233,1)' : 'rgba(14,165,233,0.7)'};
          color:#ffffff;
          font-size:12px;
          font-weight:900;
          white-space:nowrap;
        ">
          <span>🚌</span>
          <span>${busNumber}</span>
        </div>
        <div style="
          width:0;height:0;
          border-left:5px solid transparent;
          border-right:5px solid transparent;
          border-top:6px solid #ffffff;
          margin-top:-1px;
        "></div>
      </div>
    `,
    iconSize: [80, 36],
    iconAnchor: [40, 36],
  });

const STOP_ICON = (seq: number) =>
  L.divIcon({
    className: '',
    html: `
      <div style="
        background:#10b981;
        border:2.5px solid #ffffff;
        border-radius:50%;
        width:22px;height:22px;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
        display:flex;
        align-items:center;
        justify-content:center;
        color:#ffffff;
        font-size:10.5px;
        font-weight:900;
      ">
        ${seq}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

interface BusLocation {
  busId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  tripId: string;
}

interface ActiveTrip {
  id: string;
  bus: { id: string; busNumber: string; registrationNumber?: string; capacity?: number };
  driver: { user: { name: string; phone?: string } };
  route: { name: string; stops: any[] };
  locations: any[];
}

function MapViewController({
  center,
  zoom,
  targetFly,
}: {
  center: [number, number];
  zoom: number;
  targetFly: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (targetFly) {
      map.flyTo(targetFly, Math.max(map.getZoom(), 15), { duration: 1.0 });
    }
  }, [targetFly, map]);

  return null;
}

export default function LiveMap() {
  const [trips, setTrips] = useState<ActiveTrip[]>([]);
  const [liveLocations, setLiveLocations] = useState<Map<string, BusLocation>>(new Map());
  const [liveEtas, setLiveEtas] = useState<Map<string, any>>(new Map());
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>('maptiler_streets');
  const [targetFly, setTargetFly] = useState<[number, number] | null>(null);
  const [connected, setConnected] = useState(false);
  const [search, setSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDrop, setShowSearchDrop] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const defaultCenter: [number, number] = [28.2924, 79.4940]; // Invertis University, Bareilly
  const activeProvider = MAP_PROVIDERS[selectedProviderKey] || MAP_PROVIDERS.maptiler_streets;

  const fetchTrips = useCallback(async () => {
    try {
      const res = await api.get('/trips?status=ACTIVE');
      const activeTrips: ActiveTrip[] = res.data.data || [];
      setTrips(activeTrips);

      const locMap = new Map<string, BusLocation>();
      const etaMap = new Map<string, any>();

      await Promise.all(
        activeTrips.map(async (t) => {
          if (t.locations && t.locations.length > 0) {
            const last = t.locations[t.locations.length - 1];
            locMap.set(t.bus.id, {
              busId: t.bus.id,
              latitude: last.latitude,
              longitude: last.longitude,
              timestamp: last.timestamp || new Date().toISOString(),
              tripId: t.id,
            });
          }

          try {
            const etaRes = await api.get(`/buses/${t.bus.id}/eta`);
            if (etaRes.data.data) {
              etaMap.set(t.bus.id, etaRes.data.data);
            }
          } catch (e) {}
        })
      );

      setLiveLocations(locMap);
      setLiveEtas(etaMap);
    } catch (err) {
      console.error('Failed to load trips:', err);
    }
  }, []);

  useEffect(() => {
    fetchTrips();

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:admin');
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('location:update', (loc: BusLocation) => {
      setLiveLocations((prev) => {
        const next = new Map(prev);
        next.set(loc.busId, loc);
        return next;
      });
    });

    socket.on('eta:update', (eta: any) => {
      if (eta && eta.busId) {
        setLiveEtas((prev) => {
          const next = new Map(prev);
          next.set(eta.busId, eta);
          return next;
        });
      }
    });

    socket.on('trip:started', () => fetchTrips());
    socket.on('trip:ended', () => fetchTrips());

    return () => {
      socket.disconnect();
    };
  }, [fetchTrips]);

  const handleLocationSearch = (val: string) => {
    setLocationSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (val.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDrop(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchLocations(val);
      setSearchResults(results);
      setIsSearching(false);
      setShowSearchDrop(results.length > 0);
    }, 280);
  };

  const handleSelectSearchResult = (r: GeocodeResult) => {
    setShowSearchDrop(false);
    setLocationSearch(r.name);
    setTargetFly([r.lat, r.lng]);
  };

  const centerOnBus = (busId: string) => {
    setSelectedBusId(busId);
    const loc = liveLocations.get(busId);
    if (loc) {
      setTargetFly([loc.latitude, loc.longitude]);
    }
  };

  const filteredTrips = trips.filter(
    (t) =>
      t.bus?.busNumber.toLowerCase().includes(search.toLowerCase()) ||
      t.driver?.user?.name.toLowerCase().includes(search.toLowerCase()) ||
      t.route?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, height: 'calc(100vh - 160px)', minHeight: 600 }}>
      {/* Left Sidebar: Active Fleet */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Radio size={16} color={connected ? '#10b981' : '#f59e0b'} className="pulse-indicator" />
              Active Fleet ({trips.length})
            </h3>
            <span style={{ fontSize: 11, background: connected ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: connected ? '#10b981' : '#f59e0b', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
              {connected ? 'LIVE STREAM' : 'CONNECTING'}
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search bus, driver, route…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 12, height: 34 }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredTrips.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)' }}>
              <Navigation size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <p style={{ margin: 0, fontSize: 13 }}>No active trips in transit</p>
              <span style={{ fontSize: 11 }}>Active driver GPS broadcasts will appear automatically.</span>
            </div>
          ) : (
            filteredTrips.map((trip) => {
              const isSelected = selectedBusId === trip.bus.id;
              const loc = liveLocations.get(trip.bus.id);
              const eta = liveEtas.get(trip.bus.id);

              const statusColor =
                eta?.status === 'DELAYED'
                  ? '#ef4444'
                  : eta?.status === 'BUS_STOPPED'
                  ? '#f59e0b'
                  : eta?.status === 'SLIGHTLY_DELAYED'
                  ? '#eab308'
                  : '#10b981';

              return (
                <div
                  key={trip.id}
                  onClick={() => centerOnBus(trip.bus.id)}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? '#38bdf8' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(56,189,248,0.08)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#38bdf8' }}>
                      🚌 {trip.bus?.busNumber}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        background: `${statusColor}20`,
                        color: statusColor,
                        border: `1px solid ${statusColor}40`,
                        padding: '2px 6px',
                        borderRadius: 6,
                        fontWeight: 700,
                      }}
                    >
                      {eta?.status ? eta.status.replace(/_/g, ' ') : 'ON ROUTE'}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>
                    <strong>Driver:</strong> {trip.driver?.user?.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                    <strong>Route:</strong> {trip.route?.name}
                  </div>

                  {/* Real-time ETA Telemetry Box */}
                  <div
                    style={{
                      background: 'rgba(15,23,42,0.6)',
                      borderRadius: 6,
                      padding: '6px 8px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      marginBottom: 6,
                      fontSize: 11,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Next Stop:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{eta?.nextStopName || 'In Transit'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>ETA Arrival:</span>
                      <strong style={{ color: '#38bdf8', fontWeight: 800 }}>
                        {eta ? `${eta.etaFormatted} (${eta.distanceFormatted})` : 'Calculating...'}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Speed / Conf:</span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {eta?.currentSpeedKmh !== undefined ? `${eta.currentSpeedKmh} km/h` : '--'} ·{' '}
                        {eta?.confidence ? `${Math.round(eta.confidence * 100)}%` : 'AI Est'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                    <span>{trip.route?.stops?.length || 0} stops</span>
                    <span>{loc ? `Ping: ${new Date(loc.timestamp).toLocaleTimeString()}` : 'Awaiting GPS'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Canvas: MapTiler Live Map */}
      <div className="card" style={{ position: 'relative', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top Floating Control Bar */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 400, display: 'flex', justifyContent: 'space-between', gap: 10, pointerEvents: 'none' }}>
          {/* MapTiler Geocoding Search */}
          <div style={{ position: 'relative', width: 280, pointerEvents: 'auto' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search place via MapTiler…"
              value={locationSearch}
              onChange={(e) => handleLocationSearch(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowSearchDrop(true);
              }}
              style={{ paddingLeft: 30, paddingRight: 28, fontSize: 12, height: 34, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}
            />

            {isSearching && (
              <div style={{ position: 'absolute', right: 10, top: 10 }}>
                <Loader2 size={14} className="spinner" style={{ color: 'var(--primary)' }} />
              </div>
            )}

            {showSearchDrop && searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  maxHeight: 200,
                  overflowY: 'auto',
                }}
              >
                {searchResults.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => handleSelectSearchResult(res)}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                      📍 {res.name}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {res.fullName}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MapTiler Style Switcher */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)', padding: 4, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', pointerEvents: 'auto' }}>
            <button
              type="button"
              className={`btn btn-xs ${selectedProviderKey === 'maptiler_streets' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => setSelectedProviderKey('maptiler_streets')}
            >
              Streets
            </button>
            <button
              type="button"
              className={`btn btn-xs ${selectedProviderKey === 'maptiler_dark' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => setSelectedProviderKey('maptiler_dark')}
            >
              Dark
            </button>
            <button
              type="button"
              className={`btn btn-xs ${selectedProviderKey === 'maptiler_hybrid' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => setSelectedProviderKey('maptiler_hybrid')}
            >
              Satellite
            </button>
            <button
              type="button"
              className={`btn btn-xs ${selectedProviderKey === 'maptiler_outdoor' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => setSelectedProviderKey('maptiler_outdoor')}
            >
              Outdoor
            </button>
          </div>
        </div>

        {/* Map Container */}
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ width: '100%', height: '100%', minHeight: 550 }}
          scrollWheelZoom={true}
        >
          <TileLayer
            key={activeProvider.id}
            url={activeProvider.url}
            attribution={activeProvider.attribution}
            maxZoom={activeProvider.maxZoom}
          />

          <MapViewController
            center={defaultCenter}
            zoom={13}
            targetFly={targetFly}
          />

          {/* Route Polylines & Stops */}
          {trips.map((trip) => {
            const stops = trip.route?.stops || [];
            const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
            const polyCoords = sortedStops.map((s) => [s.latitude, s.longitude] as [number, number]);

            return (
              <div key={trip.id}>
                {polyCoords.length > 1 && (
                  <Polyline
                    positions={polyCoords}
                    pathOptions={{ color: '#38bdf8', weight: 4, opacity: 0.8 }}
                  />
                )}

                {sortedStops.map((s) => (
                  <Marker
                    key={s.id || `${s.latitude}-${s.longitude}`}
                    position={[s.latitude, s.longitude]}
                    icon={STOP_ICON(s.sequence)}
                  >
                    <Popup>
                      <div style={{ fontSize: 12 }}>
                        <strong>Stop #{s.sequence}: {s.name}</strong>
                        {s.address && <p style={{ margin: '4px 0 0', color: '#64748b' }}>{s.address}</p>}
                        <p style={{ margin: '2px 0 0', color: '#0ea5e9', fontWeight: 600 }}>Route: {trip.route?.name}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </div>
            );
          })}

          {/* Live Bus Markers */}
          {Array.from(liveLocations.entries()).map(([busId, loc]) => {
            const trip = trips.find((t) => t.bus.id === busId);
            const busNumber = trip?.bus?.busNumber || 'BUS';
            const isSelected = selectedBusId === busId;

            return (
              <div key={busId}>
                <Circle
                  center={[loc.latitude, loc.longitude]}
                  radius={80}
                  pathOptions={{
                    color: '#38bdf8',
                    fillColor: '#38bdf8',
                    fillOpacity: 0.25,
                    weight: 1.5,
                  }}
                />
                <Marker
                  position={[loc.latitude, loc.longitude]}
                  icon={BUS_ICON(busNumber, isSelected)}
                  eventHandlers={{
                    click: () => setSelectedBusId(busId),
                  }}
                >
                  <Popup>
                    <div style={{ fontSize: 12, minWidth: 200, padding: 2 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <h4 style={{ margin: 0, color: '#0284c7', fontSize: 14 }}>
                          🚌 Bus {busNumber}
                        </h4>
                        <span style={{ fontSize: 10, background: '#0ea5e920', color: '#0284c7', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                          {liveEtas.get(busId)?.status ? liveEtas.get(busId).status.replace(/_/g, ' ') : 'LIVE'}
                        </span>
                      </div>

                      <p style={{ margin: '0 0 3px' }}>
                        <strong>Driver:</strong> {trip?.driver?.user?.name || 'Assigned'}
                      </p>
                      <p style={{ margin: '0 0 3px' }}>
                        <strong>Route:</strong> {trip?.route?.name || 'Campus'}
                      </p>

                      {/* ETA Details in Popup */}
                      {liveEtas.get(busId) && (
                        <div style={{ background: '#f8fafc', padding: 6, borderRadius: 6, margin: '6px 0', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                            <span>Next Stop:</span>
                            <strong>{liveEtas.get(busId).nextStopName}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0284c7', marginTop: 2 }}>
                            <span>ETA:</span>
                            <strong>{liveEtas.get(busId).etaFormatted} ({liveEtas.get(busId).distanceFormatted})</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 10, marginTop: 2 }}>
                            <span>Speed / Conf:</span>
                            <span>{liveEtas.get(busId).currentSpeedKmh} km/h · {Math.round((liveEtas.get(busId).confidence || 0.85) * 100)}%</span>
                          </div>
                        </div>
                      )}

                      <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>
                        <strong>Ping:</strong> {new Date(loc.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
