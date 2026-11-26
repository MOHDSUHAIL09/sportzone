import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ArenaProvider } from './context/ArenaContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LiveScoresPage from './pages/LiveScoresPage';
import AllSportsPage from './pages/AllSportsPage';
import SportHubPage from './pages/SportHubPage';
import FixturesPage from './pages/FixturesPage';
import MatchDetailsPage from './pages/MatchDetailsPage';
import { LeaguesDirectoryPage, LeagueDetailPage } from './pages/LeaguesPage';
import RankingsPage from './pages/RankingsPage';
import { TeamsDirectoryPage, TeamDetailPage } from './pages/TeamsPage';
import { PlayersDirectoryPage, PlayerDetailPage } from './pages/PlayersPage';
import {
  ManagerDetailPage,
  RaceDetailPage,
  RefereeDetailPage,
  VenueDetailPage,
} from './pages/EntityProfilesPage';
import PredictionArenaPage from './pages/PredictionArenaPage';
import VirtualCoinsPage from './pages/VirtualCoinsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import {
  PredictionHistoryPage,
  UserDashboardPage,
} from './pages/DashboardHistoryPages';
import CasinoPage from './pages/CasinoPage';
import {
  AccountStatementPage,
  CasinoResultsPage,
  CurrentBetPage,
  SetButtonValuesPage,
} from './pages/AccountExchangePages';
import {
  UserChangePasswordPage,
  UserFundTransferPage,
  UserTransferHistoryPage,
} from './pages/UserAccountPages';
import LoginPage from './pages/LoginPage';
import { useAuth } from './context/AuthContext';

// Completely Separate Admin Dashboard Module
import AdminRouteGuard from './components/admin/AdminRouteGuard';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminCreateUserPage from './pages/admin/AdminCreateUserPage';
import {
  AdminFundManagementPage,
  AdminFundTransferPage,
} from './pages/admin/AdminFundPages';
import {
  AdminAccountStatementPage,
  AdminActivityLogsPage,
  AdminTransactionsPage,
  AdminTransferHistoryPage,
} from './pages/admin/AdminHistoryPages';
import {
  AdminCasinoResultsPage,
  AdminCurrentBetPage,
} from './pages/admin/AdminReadOnlyPages';
import {
  AdminButtonValuesPage,
  AdminChangePasswordPage,
  AdminGeneralSettingsPage,
  AdminPermissionsPage,
  AdminWithdrawalSettingsPage,
} from './pages/admin/AdminConfigPages';

function WebsiteSessionGuard({ children }) {
  const { hasWebsiteSession, loading } = useAuth();

  if (hasWebsiteSession) {
    return children;
  }

  if (loading) {
    return <div className="sz-login-screen" aria-hidden="true" />;
  }

  return <Navigate to="/login" replace />;
}

function PublicWebsiteRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/casino" element={<CasinoPage />} />
        <Route path="/live" element={<LiveScoresPage />} />
        <Route path="/sports" element={<AllSportsPage />} />

        {/* Dedicated Sport Hubs */}
        <Route path="/football" element={<SportHubPage defaultSport="football" />} />
        <Route path="/cricket" element={<SportHubPage defaultSport="cricket" />} />
        <Route path="/tennis" element={<SportHubPage defaultSport="tennis" />} />
        <Route path="/basketball" element={<SportHubPage defaultSport="basketball" />} />
        <Route path="/sport/:sportSlug" element={<SportHubPage />} />

        {/* Schedule, Results & Match Details */}
        <Route path="/fixtures" element={<FixturesPage mode="fixtures" />} />
        <Route path="/results" element={<FixturesPage mode="results" />} />
        <Route path="/match/:id" element={<MatchDetailsPage />} />
        <Route path="/game-details/:sportId/:id" element={<MatchDetailsPage />} />

        {/* Entities & Competitions */}
        <Route path="/teams" element={<TeamsDirectoryPage />} />
        <Route path="/team/:id" element={<TeamDetailPage />} />
        <Route path="/players" element={<PlayersDirectoryPage />} />
        <Route path="/player/:id" element={<PlayerDetailPage />} />
        <Route path="/leagues" element={<LeaguesDirectoryPage />} />
        <Route path="/league/:id" element={<LeagueDetailPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/search" element={<Navigate to="/home" replace />} />
        <Route path="/venue/:id" element={<VenueDetailPage />} />
        <Route path="/referee/:id" element={<RefereeDetailPage />} />
        <Route path="/manager/:id" element={<ManagerDetailPage />} />
        <Route path="/race/:id" element={<RaceDetailPage />} />

        {/* Prediction Arena & Gaming Ecosystem */}
        <Route path="/arena" element={<PredictionArenaPage />} />
        <Route path="/wallet" element={<VirtualCoinsPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/dashboard" element={<UserDashboardPage />} />
        <Route path="/history" element={<PredictionHistoryPage />} />

        {/* User Profile Dropdown Account & Virtual Transfer Pages */}
        <Route path="/account-statement" element={<AccountStatementPage />} />
        <Route path="/current-bet" element={<CurrentBetPage />} />
        <Route path="/casino-results" element={<CasinoResultsPage />} />
        <Route path="/set-button-values" element={<SetButtonValuesPage />} />
        <Route path="/fund-transfer" element={<UserFundTransferPage />} />
        <Route path="/transfer-history" element={<UserTransferHistoryPage />} />
        <Route path="/change-password" element={<UserChangePasswordPage />} />

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ArenaProvider>
          <Routes>
            {/* Public Login Page (First screen for visitors without a session) */}
            <Route path="/login" element={<LoginPage />} />

            {/* Completely Separate Protected Admin Dashboard (NO sports header or sidebar) */}
            <Route
              path="/admin"
              element={
                <AdminRouteGuard>
                  <AdminLayout />
                </AdminRouteGuard>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage defaultStatus="all" />} />
              <Route path="create-user" element={<AdminCreateUserPage />} />
              <Route path="active-users" element={<AdminUsersPage defaultStatus="active" />} />
              <Route path="blocked-users" element={<AdminUsersPage defaultStatus="blocked" />} />
              <Route path="fund-management" element={<AdminFundManagementPage />} />
              <Route path="fund-transfer" element={<AdminFundTransferPage />} />
              <Route path="transfer-history" element={<AdminTransferHistoryPage />} />
              <Route path="withdrawal-settings" element={<AdminWithdrawalSettingsPage />} />
              <Route path="account-statement" element={<AdminAccountStatementPage />} />
              <Route path="current-bet" element={<AdminCurrentBetPage />} />
              <Route path="casino-results" element={<AdminCasinoResultsPage />} />
              <Route path="button-values" element={<AdminButtonValuesPage />} />
              <Route path="transactions" element={<AdminTransactionsPage />} />
              <Route path="permissions" element={<AdminPermissionsPage />} />
              <Route path="activity-logs" element={<AdminActivityLogsPage />} />
              <Route path="settings" element={<AdminGeneralSettingsPage />} />
              <Route path="change-password" element={<AdminChangePasswordPage />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>

            {/* Protected Existing SportZone Website */}
            <Route
              path="/*"
              element={
                <WebsiteSessionGuard>
                  <PublicWebsiteRoutes />
                </WebsiteSessionGuard>
              }
            />
          </Routes>
        </ArenaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
