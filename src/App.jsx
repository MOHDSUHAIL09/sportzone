import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
      <ArenaProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/casino" element={<CasinoPage />} />
            <Route path="/live" element={<LiveScoresPage />} />
            <Route path="/sports" element={<AllSportsPage />} />

            {/* Dedicated Sport Hubs (Football, Cricket, Tennis, Basketball + all 25 sports) */}
            <Route path="/football" element={<SportHubPage defaultSport="football" />} />
            <Route path="/cricket" element={<SportHubPage defaultSport="cricket" />} />
            <Route path="/tennis" element={<SportHubPage defaultSport="tennis" />} />
            <Route path="/basketball" element={<SportHubPage defaultSport="basketball" />} />
            <Route path="/sport/:sportSlug" element={<SportHubPage />} />

            {/* Schedule, Results & Match Details */}
            <Route path="/fixtures" element={<FixturesPage mode="fixtures" />} />
            <Route path="/results" element={<FixturesPage mode="results" />} />
            <Route path="/match/:id" element={<MatchDetailsPage />} />

            {/* Entities & Competitions */}
            <Route path="/teams" element={<TeamsDirectoryPage />} />
            <Route path="/team/:id" element={<TeamDetailPage />} />
            <Route path="/players" element={<PlayersDirectoryPage />} />
            <Route path="/player/:id" element={<PlayerDetailPage />} />
            <Route path="/leagues" element={<LeaguesDirectoryPage />} />
            <Route path="/league/:id" element={<LeagueDetailPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/search" element={<Navigate to="/" replace />} />
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

            {/* Demo Dropdown Exchange Account Pages */}
            <Route path="/account-statement" element={<AccountStatementPage />} />
            <Route path="/current-bet" element={<CurrentBetPage />} />
            <Route path="/casino-results" element={<CasinoResultsPage />} />
            <Route path="/set-button-values" element={<SetButtonValuesPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ArenaProvider>
    </BrowserRouter>
  );
}
