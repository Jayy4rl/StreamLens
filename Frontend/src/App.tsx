/**
 * StreamLens Application
 * Main routing component for the StreamLens frontend
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Activity from "./pages/Activity";
import Create from "./pages/Create";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/activity" element={<Activity />} />
        <Route path="/create" element={<Create />} />
      </Routes>
    </Router>
  );
};

export default App;
