import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png'; 

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      if (isLogin) {
        // Log In Existing User
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Register New User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Create baseline user document in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email,
          isAdmin: false,
          isVerified: false,
          createdAt: new Date()
        });
      }

      // Navigate instantly on success without any artificial delay
      navigate('/');

    } catch (error) {
      alert("Authentication failed: " + error.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', position: 'relative', zIndex: 10 }}>
      
      {/* Static Logo */}
      <img 
        src={logo} 
        alt="TamilLink Logo" 
        style={{ 
          width: '90px', 
          height: '90px', 
          marginBottom: '2rem', 
          borderRadius: '22px', 
          boxShadow: '0 10px 25px rgba(255, 81, 47, 0.3)', 
          objectFit: 'cover' 
        }} 
      />

      {/* Auth Form Card */}
      <div style={{ width: '90%', maxWidth: '400px', padding: '2rem', background: 'var(--bg-surface)', borderRadius: '32px', boxShadow: 'var(--shadow-soft)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '1.6rem', color: 'var(--text-primary)' }}>
          {isLogin ? "Welcome Back" : "Join TamilLink"}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {isLogin ? "Sign in to discover community events." : "Create an account to save events and follow societies."}
        </p>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            disabled={isProcessing}
            style={{ borderRadius: '20px' }}
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            disabled={isProcessing}
            style={{ borderRadius: '20px' }}
          />
          
          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ marginTop: '0.5rem', borderRadius: '100px' }}>
            {isProcessing ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            disabled={isProcessing}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-solid)', fontWeight: 600, cursor: 'pointer' }}
          >
            {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>

    </div>
  );
};

export default Auth;