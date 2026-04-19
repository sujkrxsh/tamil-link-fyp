import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Home, Plus, User, ShieldAlert, LogOut } from 'lucide-react';

const Navbar = () => {
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // grab the user's role every time the url changes so the buttons don't get stuck
  // on the wrong state if an admin just verified them in the background
  useEffect(() => {
    const fetchRole = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setUserData(docSnap.data());
      }
    };
    fetchRole();
  }, [location.pathname]);

  // bye
  const handleLogout = () => {
    signOut(auth);
    navigate('/auth');
  };

  // if they aren't logged in just render absolutely nothing so it doesn't float over the login screen
  if (!auth.currentUser) return null;

  return (
    <div className="floating-nav-wrapper">
      <nav className="floating-nav">
        <div className="nav-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          TamilLink
        </div>
        
        <div className="nav-actions">
          <button className="nav-btn" onClick={() => navigate('/')} title="Home">
            <Home size={20} />
          </button>
          
          {/* only show the scary admin button if they actually have admin rights in firestore */}
          {userData?.isAdmin && (
            <button className="nav-btn" onClick={() => navigate('/admin')} title="Admin" style={{ color: 'var(--accent-solid)' }}>
              <ShieldAlert size={20} />
            </button>
          )}

          {/* normal users can't post events, only verified businesses (and hide it from admins so they don't clutter the feed) */}
          {userData?.isVerified && !userData?.isAdmin && (
            <button className="nav-btn" onClick={() => navigate('/create')} title="Post Event">
              <Plus size={20} />
            </button>
          )}

          <button className="nav-btn" onClick={() => navigate('/profile')} title="Account">
            <User size={20} />
          </button>
          
          {/* hardcoded the red colors here */}
          <button className="nav-btn" onClick={handleLogout} title="Sign Out" style={{ background: '#FFECEC', color: '#DC2626' }}>
            <LogOut size={20} />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;