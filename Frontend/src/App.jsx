import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import StarCanvas from './components/StarCanvas';
import './index.css';

function App() {
  return (
    <Router>
      <StarCanvas />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
