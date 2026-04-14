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

  const handleLogout = () => {
    signOut(auth);
    navigate('/auth');
  };

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
          
          {userData?.isAdmin && (
            <button className="nav-btn" onClick={() => navigate('/admin')} title="Admin" style={{ color: 'var(--accent-solid)' }}>
              <ShieldAlert size={20} />
            </button>
          )}

          {userData?.isVerified && !userData?.isAdmin && (
            <button className="nav-btn" onClick={() => navigate('/create')} title="Post Event">
              <Plus size={20} />
            </button>
          )}

          <button className="nav-btn" onClick={() => navigate('/profile')} title="Account">
            <User size={20} />
          </button>
          
          <button className="nav-btn" onClick={handleLogout} title="Sign Out" style={{ background: '#FFECEC', color: '#DC2626' }}>
            <LogOut size={20} />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;