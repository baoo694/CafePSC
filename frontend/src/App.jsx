import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Analytics } from '@vercel/analytics/react';
import { SocketProvider } from './context/SocketContext';
import CustomerPage from './pages/CustomerPage';
import AdminPage from './pages/AdminPage';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/order" element={<CustomerPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#FDF8F3',
            color: '#2C1810',
            border: '1px solid #F5E6D3',
            boxShadow: '0 12px 32px rgba(44, 24, 16, 0.16)',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            iconTheme: {
              primary: '#6B9E4D',
              secondary: '#FDF8F3',
            },
          },
          error: {
            iconTheme: {
              primary: '#C75A5A',
              secondary: '#FDF8F3',
            },
          },
        }}
      />
      <Analytics />
    </SocketProvider>
  );
}

export default App;

