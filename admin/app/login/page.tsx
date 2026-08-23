'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome to SmartBus Console');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <Image src="/logo.png" alt="College Bus Tracker" width={180} height={180} style={{ objectFit: 'contain' }} priority />
          <p>Campus Transit & Fleet Safety Console</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Administrator Email</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                className="form-input"
                style={{ paddingLeft: 38 }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter administrator email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Secure Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="form-input"
                style={{ paddingLeft: 38 }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 12 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Authenticating…
              </>
            ) : (
              <>
                <span>Sign In to Command Center</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
