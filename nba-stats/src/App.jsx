import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import PlayerDetails from "./pages/PlayerDetails";
import ComparePlayer from "./pages/ComparePlayer";
import TeamPage from "./pages/TeamPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/player/:playerId" element={<PlayerDetails />} />
        <Route path="/compare/:playerId" element={<ComparePlayer />} />
        <Route path="/teams/:abbr" element={<TeamPage />} />
      </Routes>
    </Router>
  );
}

export default App;
