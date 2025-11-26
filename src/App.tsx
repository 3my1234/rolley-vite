import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/page';
import DashboardPage from './pages/dashboard/page';
import DashboardLayout from './pages/dashboard/layout';
import DashboardCardsPage from './pages/dashboard/cards/page';
import DashboardReferralPage from './pages/dashboard/referral/page';
import DashboardWalletPage from './pages/dashboard/wallet/page';
import PaymentStatusPage from './pages/dashboard/wallet/payment-status/page';
import DashboardHistoryPage from './pages/dashboard/history/page';
import DashboardSettingsPage from './pages/dashboard/settings/page';
import AdminLayout from './pages/admin/layout';
import AdminLoginPage from './pages/admin/login/page';
import AdminPage from './pages/admin/page';
import CreateEventPage from './pages/admin/create-event/page';
import DailyMatchesPage from './pages/admin/daily-matches/page';
import AdminTokensPage from './pages/admin/tokens/page';
import AdminReviewPage from './pages/admin/review/page';

function App() {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || "cmh42tltm00idju0d6tkjbznm"}
      config={{
        loginMethods: ['wallet', 'email', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#3b82f6',
          logo: '/logo.png',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="cards" element={<DashboardCardsPage />} />
                <Route path="referral" element={<DashboardReferralPage />} />
                <Route path="wallet" element={<DashboardWalletPage />} />
                <Route path="wallet/payment-status" element={<PaymentStatusPage />} />
                <Route path="history" element={<DashboardHistoryPage />} />
                <Route path="settings" element={<DashboardSettingsPage />} />
              </Route>
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminPage />} />
                <Route path="create-event" element={<CreateEventPage />} />
                <Route path="daily-matches" element={<DailyMatchesPage />} />
                <Route path="tokens" element={<AdminTokensPage />} />
                <Route path="review" element={<AdminReviewPage />} />
              </Route>
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </PrivyProvider>
  );
}

export default App;