import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import PersonDetail from './pages/PersonDetail';
import Events from './pages/Events';
import Tags from './pages/Tags';
import DataManagement from './pages/DataManagement';
import Settings from './pages/Settings';
import LifeTimeline from './pages/LifeTimeline';
import Statistics from './pages/Statistics';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/timeline" element={<LifeTimeline />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/people" element={<People />} />
          <Route path="/people/:id" element={<PersonDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="/data" element={<DataManagement />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
