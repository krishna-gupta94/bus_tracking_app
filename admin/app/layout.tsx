import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'College Bus Tracker — Admin',
  description: 'Real-time college bus tracking and fleet management system',
  icons: {
    icon: '/favicon.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a2235',
                color: '#f1f5f9',
                border: '1px solid #1e2d45',
                borderRadius: '10px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
