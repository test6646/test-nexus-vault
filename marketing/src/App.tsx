import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import FeaturesPage from './pages/FeaturesPage';
import TutorialsPage from './pages/TutorialsPage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import EventFeaturesPage from './pages/features/EventFeaturesPage';
import ClientFeaturesPage from './pages/features/ClientFeaturesPage';
import TaskFeaturesPage from './pages/features/TaskFeaturesPage';
import FinanceFeaturesPage from './pages/features/FinanceFeaturesPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/features/events" element={<EventFeaturesPage />} />
        <Route path="/features/clients" element={<ClientFeaturesPage />} />
        <Route path="/features/tasks" element={<TaskFeaturesPage />} />
        <Route path="/features/finance" element={<FinanceFeaturesPage />} />
        <Route path="/tutorials" element={<TutorialsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Routes>
    </Router>
  );
}

export default App;