'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import {
  LayoutDashboard, Users, Truck, Route,
  Navigation, History, Bell, Settings, LogOut, Bus, AlertTriangle, Activity, ClipboardList
} from 'lucide-react';
import api from '@/lib/api';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', section: 'OVERVIEW' },
  { href: '/live-tracking', icon: Navigation, label: 'Live Tracking', section: null },
  { href: '/route-monitoring', icon: Activity, label: 'Route Monitoring', section: null },
  { href: '/sos-alerts', icon: AlertTriangle, label: 'SOS Alerts', section: 'SAFETY & EMERGENCY', alertBadge: true },
  { href: '/trips', icon: History, label: 'Trips', section: 'TRANSIT FLEET' },
  { href: '/buses', icon: Bus, label: 'Buses', section: null },
  { href: '/routes', icon: Route, label: 'Routes', section: null },
  { href: '/students', icon: Users, label: 'Students', section: 'USER ACCOUNTS' },
  { href: '/registration-requests', icon: ClipboardList, label: 'Registrations', section: null },
  { href: '/drivers', icon: Truck, label: 'Drivers', section: null },
  { href: '/notifications', icon: Bell, label: 'Notifications', section: 'SYSTEM' },
  { href: '/settings', icon: Settings, label: 'Settings', section: null },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [activeSOSCount, setActiveSOSCount] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    // Check notifications for any recent emergency alerts
    if (user) {
      api.get('/notifications').then(res => {
        const emergencies = res.data.data?.filter((n: any) => 
          !n.read && (n.title.toLowerCase().includes('sos') || n.title.toLowerCase().includes('emergency'))
        );
        setActiveSOSCount(emergencies?.length || 0);
      }).catch(() => {});
    }
  }, [user, pathname]);

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
              <span>SOS Monitor</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
              <div className="status-dot green pulse-indicator" />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>API Connected</span>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
