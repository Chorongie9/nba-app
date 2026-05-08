import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import PlayerDetails from "./pages/PlayerDetails";
import ComparePlayer from "./pages/ComparePlayer";
import TeamPage from "./pages/TeamPage";
import TeamSeasonPage from "./pages/TeamSeasonPage";
import GamePage from "./pages/GamePage";

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/player/:playerId" element={<PlayerDetails />} />
          <Route path="/compare/:playerId" element={<ComparePlayer />} />
          <Route path="/teams/:abbr" element={<TeamPage />} />
          <Route path="/teams/:abbr/:season" element={<TeamSeasonPage />} />
          <Route path="/games/:gameId" element={<GamePage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
