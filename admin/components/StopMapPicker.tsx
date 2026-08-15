'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  searchLocations,
  reverseGeocode,
  GeocodeResult,
  MAP_PROVIDERS,
  MAPTILER_API_KEY,
} from '@/lib/geocoding';
import {
  Search, MapPin, Navigation, Layers, Compass, Loader2, X, Sparkles, Check
} from 'lucide-react';

// Fix Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const SELECTED_ICON = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;">
      <div style="background:#38bdf8;border:3px solid #ffffff;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(56,189,248,0.9);color:#070a13;font-size:12px;font-weight:900;">📍</div>
      <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #38bdf8;"></div>
    </div>
  `,
  iconSize: [26, 32],
  iconAnchor: [13, 32],
});

const EXISTING_ICON = (sequence: number) =>
  L.divIcon({
    className: '',
    html: `
      <div style="background:#10b981;border:2px solid #ffffff;border-radius:50%;width:22px;height:22px;box-shadow:0 2px 8px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;color:#ffffff;font-size:10.5px;font-weight:800;">
        ${sequence}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

interface Stop {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
  stopCode?: string;
  address?: string;
}

interface StopMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number, placeDetails?: { name?: string; address?: string }) => void;
  existingStops?: Stop[];
  editingStopId?: string;
}

const PRESETS = [
  { name: 'Invertis University, Bareilly', lat: 28.2924, lng: 79.4940 },
  { name: 'Bareilly Junction (Railway)', lat: 28.3594, lng: 79.4137 },
  { name: 'Civil Lines, Bareilly', lat: 28.3830, lng: 79.4250 },
  { name: 'Satellite Bus Stand, Bareilly', lat: 28.3490, lng: 79.4380 },
  { name: 'Badaun Junction', lat: 28.0498, lng: 79.0496 },
];

function MapController({
  onLocationSelect,
  targetPosition,
}: {
  onLocationSelect: (lat: number, lng: number) => void;
  targetPosition: [number, number] | null;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (targetPosition) {
      map.flyTo(targetPosition, Math.max(map.getZoom(), 15), { duration: 0.8 });
    }
  }, [targetPosition, map]);

  return null;
}

export default function StopMapPicker({
  latitude,
  longitude,
  onLocationSelect,
  existingStops = [],
  editingStopId,
}: StopMapPickerProps) {
  const [selectedProviderKey, setSelectedProviderKey] = useState<string>('maptiler_streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const [targetFlyPosition, setTargetFlyPosition] = useState<[number, number] | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const defaultCenter: [number, number] = [
    latitude || 28.2924,
    longitude || 79.4940,
  ];

  const activeProvider = MAP_PROVIDERS[selectedProviderKey] || MAP_PROVIDERS.maptiler_streets;

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (val.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchLocations(val);
      setSearchResults(results);
      setIsSearching(false);
      setShowDropdown(results.length > 0);
    }, 280);
  };

  const handleSearchResultClick = (result: GeocodeResult) => {
    setShowDropdown(false);
    setSearchQuery(result.name);
    setTargetFlyPosition([result.lat, result.lng]);
    setCurrentAddress(result.fullName);

    onLocationSelect(result.lat, result.lng, {
      name: result.name,
      address: result.fullName,
    });
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setIsGeocoding(true);
    const geo = await reverseGeocode(lat, lng);
    setIsGeocoding(false);

    if (geo) {
      setCurrentAddress(geo.address);
      onLocationSelect(lat, lng, { name: geo.name, address: geo.address });
    } else {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setCurrentAddress(fallback);
      onLocationSelect(lat, lng, { address: fallback });
    }
  };

  const handlePresetSelect = async (preset: { name: string; lat: number; lng: number }) => {
    setTargetFlyPosition([preset.lat, preset.lng]);
    handleMapClick(preset.lat, preset.lng);
  };

  const otherStops = useMemo(() => {
    return existingStops.filter((s) => s.id !== editingStopId && s.latitude && s.longitude);
  }, [existingStops, editingStopId]);

  const polylineCoords = useMemo(() => {
    const sorted = [...otherStops].sort((a, b) => a.sequence - b.sequence);
    return sorted.map((s) => [s.latitude, s.longitude] as [number, number]);
  }, [otherStops]);

  return (
    <div className="maptiler-stop-picker-root" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Top Search & MapTiler Layer Switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
        <div style={{ position: 'relative', flex: 1 }} ref={dropdownRef}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search town, landmark, college, or village via MapTiler…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true);
            }}
            style={{ paddingLeft: 38, paddingRight: 36, fontSize: 13, background: 'var(--bg-secondary)' }}
          />

          {isSearching && (
            <div style={{ position: 'absolute', right: 12, top: 12 }}>
              <Loader2 size={16} className="spinner" style={{ color: 'var(--primary)' }} />
            </div>
          )}

          {searchQuery && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowDropdown(false);
              }}
              style={{ position: 'absolute', right: 10, top: 10, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}

          {/* MapTiler Autocomplete Dropdown */}
          {showDropdown && searchResults.length > 0 && (
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
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                zIndex: 1000,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {searchResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => handleSearchResultClick(res)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                    📍 {res.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {res.fullName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MapTiler Style Switcher */}
        <div style={{ display: 'flex', background: 'var(--bg-secondary)', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`btn btn-sm ${selectedProviderKey === 'maptiler_streets' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setSelectedProviderKey('maptiler_streets')}
          >
            Streets
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedProviderKey === 'maptiler_dark' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setSelectedProviderKey('maptiler_dark')}
          >
            Dark
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedProviderKey === 'maptiler_hybrid' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setSelectedProviderKey('maptiler_hybrid')}
          >
            Satellite
          </button>
          <button
            type="button"
            className={`btn btn-sm ${selectedProviderKey === 'maptiler_outdoor' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '4px 10px', fontSize: 11 }}
            onClick={() => setSelectedProviderKey('maptiler_outdoor')}
          >
            Outdoor
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Sparkles size={12} color="var(--primary)" /> MapTiler Presets:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => handlePresetSelect(p)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: '3px 10px',
              fontSize: 11,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <MapPin size={10} color="var(--primary)" /> {p.name.split(',')[0]}
          </button>
        ))}
      </div>

      {/* MapTiler Leaflet Map Canvas */}
      <div style={{ position: 'relative', height: 320, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <MapContainer
          center={defaultCenter}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            key={activeProvider.id}
            url={activeProvider.url}
            attribution={activeProvider.attribution}
            maxZoom={activeProvider.maxZoom}
          />

          <MapController
            onLocationSelect={handleMapClick}
            targetPosition={targetFlyPosition}
          />

          {/* Existing Route Polyline */}
          {polylineCoords.length > 1 && (
            <Polyline
              positions={polylineCoords}
              pathOptions={{ color: '#10b981', weight: 3, opacity: 0.8 }}
            />
          )}

          {/* Existing Route Stops */}
          {otherStops.map((stop) => (
            <Marker
              key={stop.id || `${stop.latitude}-${stop.longitude}`}
              position={[stop.latitude, stop.longitude]}
              icon={EXISTING_ICON(stop.sequence)}
            >
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>#{stop.sequence} {stop.name}</strong>
                  {stop.address && <p style={{ margin: '4px 0 0', color: '#64748b' }}>{stop.address}</p>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Selected Draggable Marker */}
          {latitude !== null && longitude !== null && (
            <Marker
              position={[latitude, longitude]}
              icon={SELECTED_ICON}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target;
                  const pos = marker.getLatLng();
                  handleMapClick(pos.lat, pos.lng);
                },
              }}
            >
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>Selected Stop Position</strong>
                  <p style={{ margin: '4px 0 0' }}>{currentAddress || `${latitude}, ${longitude}`}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Tip Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            zIndex: 400,
            background: 'rgba(10,14,26,0.88)',
            backdropFilter: 'blur(4px)',
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MapPin size={12} color="#38bdf8" /> Click anywhere on map or drag the pin to set exact coordinates via MapTiler.
        </div>
      </div>

      {/* Coordinate & Geocoded Address Readout */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
          {isGeocoding ? (
            <><Loader2 size={13} className="spinner" /> Reverse geocoding via MapTiler…</>
          ) : (
            <><Check size={13} color="var(--success)" /> <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{currentAddress || 'Coordinates chosen'}</span></>
          )}
        </div>
        <div style={{ color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 600, fontSize: 11 }}>
          {latitude ? `${latitude.toFixed(6)}, ${longitude?.toFixed(6)}` : 'No point chosen'}
        </div>
      </div>
    </div>
  );
}
