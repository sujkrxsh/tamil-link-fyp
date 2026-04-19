import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// gotta wrap the whole app in this or the translation breaks everywhere
import { LanguageProvider } from './context/LanguageContext';

import Navbar from './components/Navbar';
import Auth from './components/Auth';
import Home from './components/Home';
import Profile from './components/Profile';
import CreateEvent from './components/CreateEvent';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // firebase listener to check if they are logged in or not
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    // cleanup function
    return unsubscribe;
  }, []);

  // block the whole render tree until firebase wakes up
  if (loading) return null;

  return (
    <LanguageProvider>
      <Router>
        
        {/* floating background blobs. only show on login screen so they don't distract from the feed */}
        <div className={`bg-shapes ${currentUser ? 'fade-out' : ''}`}>
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
        </div>

        {/* navbar floats above everything else */}
        <Navbar />

        {/* routing. basically if they arent logged in, force them to the /auth page. */}
        <Routes>
          <Route path="/auth" element={currentUser ? <Navigate to="/" /> : <Auth />} />
          <Route path="/" element={currentUser ? <Home /> : <Navigate to="/auth" />} />
          <Route path="/profile" element={currentUser ? <Profile /> : <Navigate to="/auth" />} />
          <Route path="/create" element={currentUser ? <CreateEvent /> : <Navigate to="/auth" />} />
          <Route path="/admin" element={currentUser ? <AdminDashboard /> : <Navigate to="/auth" />} />
        </Routes>

        {/* footer is a cutie patootie fr */}
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