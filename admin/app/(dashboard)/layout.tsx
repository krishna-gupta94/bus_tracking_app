'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, Users, Truck, Route,
  Navigation, History, Bell, Settings, LogOut, Bus, AlertTriangle, Activity, ClipboardList
} from 'lucide-react';
import api from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'Overview' },
  { href: '/live-tracking', icon: Navigation, label: 'Live Tracking', section: null },
  { href: '/route-monitoring', icon: Activity, label: 'Route Monitoring', section: null },
  { href: '/sos-alerts', icon: AlertTriangle, label: 'SOS Alerts', section: 'Safety & Emergency', alertBadge: true },
  { href: '/trips', icon: History, label: 'Trips', section: 'Transit Fleet' },
  { href: '/buses', icon: Bus, label: 'Buses', section: null },
  { href: '/routes', icon: Route, label: 'Routes', section: null },
  { href: '/students', icon: Users, label: 'Students', section: 'User Accounts' },
  { href: '/registration-requests', icon: ClipboardList, label: 'Registrations', section: null },
  { href: '/drivers', icon: Truck, label: 'Drivers', section: null },
  { href: '/notifications', icon: Bell, label: 'Notifications', section: 'System' },
  { href: '/settings', icon: Settings, label: 'Settings', section: null },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [activeSOSCount, setActiveSOSCount] = useState(0);
  const [liveEmergency, setLiveEmergency] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  // Initial load of SOS notifications
  useEffect(() => {
    if (user) {
      api.get('/notifications').then(res => {
        const emergencies = res.data.data?.filter((n: any) => 
          !n.read && (n.title.toLowerCase().includes('sos') || n.title.toLowerCase().includes('emergency'))
        );
        setActiveSOSCount(emergencies?.length || 0);
      }).catch(() => {});
    }
  }, [user, pathname]);

  // Real-time Global Socket.IO Listener for instant SOS alerts across the entire Admin Panel
  useEffect(() => {
    if (!user) return;

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token: token || '' },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join:admin', { token });
    });

    socket.on('sos:trigger', (sosData: any) => {
      console.log('🚨 [Global Admin Socket] Real-time SOS Received:', sosData);
      
      // Play emergency alert sound using Web Audio API
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch (_) {}

      // Increment badge
      setActiveSOSCount(c => c + 1);
      setLiveEmergency(sosData);

      toast.error(`🚨 EMERGENCY SOS: ${sosData.userRole || 'STUDENT'} ${sosData.userName || ''} triggered an emergency alert!`, {
        duration: 10000,
        position: 'top-center',
      });
    });

    socket.on('sos:status_update', ({ status }: { status: string }) => {
      if (status === 'RESOLVED') {
        setActiveSOSCount(c => Math.max(0, c - 1));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }
  if (!user) return null;

  const currentPage = navItems.find(n => n.href === pathname)?.label || 'Dashboard';

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Image src="/logo.png" alt="Logo" width={42} height={42} style={{ objectFit: 'cover', borderRadius: '50%' }} priority />
          <div>
            <h1>Smart<span>Bus</span></h1>
            <p>Campus Transit Console</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            const prevItem = navItems[i - 1];
            const showSection = item.section && item.section !== prevItem?.section;
            return (
              <div key={item.href}>
                {showSection && <p className="nav-section">{item.section}</p>}
                <Link
                  href={item.href}
                  className={`nav-item${isActive ? ' active' : ''}${item.alertBadge ? ' sos-alert' : ''}`}
                >
                  <Icon size={18} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.alertBadge && activeSOSCount > 0 && (
                    <span className="badge badge-red" style={{ padding: '2px 6px', fontSize: 10 }}>
                      {activeSOSCount}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <div className="sidebar-user-info">
              <p>{user.name}</p>
              <span>Transit Administrator</span>
            </div>
            <button onClick={logout} className="btn btn-ghost btn-icon" title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main">
        <header className="topbar">
          <h2 className="topbar-title">{currentPage}</h2>
          <div className="topbar-actions">
            <Link href="/sos-alerts" className="badge badge-red" style={{ gap: 6, cursor: 'pointer', padding: '6px 12px' }}>
              <AlertTriangle size={13} />
              <span>SOS Monitor ({activeSOSCount})</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              <div className="status-dot green pulse-indicator" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>API Connected</span>
            </div>
          </div>
        </header>

        {/* Global Live Emergency Banner — sticky below topbar, full-width in flow, z-index below sidebar/topbar */}
        {liveEmergency && (
          <div style={{
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            padding: '14px 22px',
            margin: '16px 24px 0 24px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--neu-surface)',
            position: 'relative',
            zIndex: 1,          /* below topbar(50) & sidebar(200) so it scrolls under them */
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--bg-primary)',
                boxShadow: 'var(--neu-inset)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--danger)'
              }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>
                  Emergency Beacon: {liveEmergency.userName} ({liveEmergency.userRole})
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Bus: {liveEmergency.busNumber || 'N/A'} • Route: {liveEmergency.routeName || 'N/A'} • Stop: {liveEmergency.stopName || 'N/A'} • {new Date(liveEmergency.timestamp || Date.now()).toLocaleTimeString()}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <Link href="/sos-alerts" className="btn btn-sm btn-danger">
                View Incident Dispatch
              </Link>
              <button
                onClick={() => setLiveEmergency(null)}
                className="btn btn-sm btn-ghost btn-icon"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
