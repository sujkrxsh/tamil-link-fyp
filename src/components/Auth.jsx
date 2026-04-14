// src/components/Auth.jsx
import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: userCredential.user.email,
          isVerified: false, 
          createdAt: new Date()
        });
      }
      navigate('/'); 
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="app-container">
      <div className="auth-wrapper animate-in">
        
        <div className="auth-header">
          <h1>{isLogin ? 'Log in.' : 'Join up.'}</h1>
          <p>{isLogin ? 'Discover the culture.' : 'Find your next event.'}</p>
        </div>

        <form onSubmit={handleAuth} className="input-group">
          {error && <p style={{ color: '#FF007A', fontWeight: '500' }}>{error}</p>}
          
          <input 
            type="email" 
            placeholder="Email address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-primary">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-btn">
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in"}
        </button>
        
      </div>
    </div>
  );
};

export default Auth;