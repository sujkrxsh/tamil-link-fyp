import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Context
import { LanguageProvider } from './context/LanguageContext';

// Components
import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Home from './components/Home';
import Profile from './components/Profile';
import CreateEvent from './components/CreateEvent';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return null;

  return (
    <LanguageProvider>
      <Router>
        
        {/* Dynamic Background Shapes: Fades out upon successful authentication */}
        <div className={`bg-shapes ${currentUser ? 'fade-out' : ''}`}>
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
        </div>

        <Navbar />

        <Routes>
          <Route path="/auth" element={currentUser ? <Navigate to="/" /> : <Auth />} />
          <Route path="/" element={currentUser ? <Home /> : <Navigate to="/auth" />} />
          <Route path="/profile" element={currentUser ? <Profile /> : <Navigate to="/auth" />} />
          <Route path="/create" element={currentUser ? <CreateEvent /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={currentUser ? <AdminDashboard /> : <Navigate to="/auth" />} />
        </Routes>

        {currentUser && (
          <footer className="global-footer">
            © TamilLink '26. Fostering Community.
          </footer>
        )}
        
      </Router>
    </LanguageProvider>
  );
}

export default App;