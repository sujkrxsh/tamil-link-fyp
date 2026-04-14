import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { AlertCircle } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { t } = useLanguage();

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
          isAdmin: false,
          createdAt: new Date()
        });
      }
      // Firebase auth state listener in App.jsx will automatically handle the routing 
      // the moment this promise resolves successfully.
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="auth-wrapper animate-in">
      {/* The new Glassmorphism Bubble */}
      <div className="auth-panel">
        
        <div className="auth-header">
          <h1>TamilLink</h1>
          <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {isLogin ? t("Welcome back. Discover the culture.", "மீண்டும் வருக. கலாச்சாரத்தைக் கண்டறியவும்.") : t("Join the community.", "சமூகத்தில் இணையுங்கள்.")}
          </p>
        </div>

        <form onSubmit={handleAuth} className="input-group">
          {error && (
            <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, textAlign: 'left' }}>
              <AlertCircle size={18} flexShrink={0} /> <span>{error}</span>
            </div>
          )}
          
          <input 
            type="email" 
            placeholder={t("Email address", "மின்னஞ்சல் முகவரி")}
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder={t("Password", "கடவுச்சொல்")}
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
            {isLogin ? t("Sign In", "உள்நுழைய") : t("Create Account", "கணக்கை உருவாக்கு")}
          </button>
        </form>

        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-btn">
          {isLogin 
            ? t("Don't have an account? Sign up", "கணக்கு இல்லையா? பதிவு செய்யவும்") 
            : t("Already have an account? Log in", "ஏற்கனவே கணக்கு உள்ளதா? உள்நுழையவும்")}
        </button>

      </div>
    </div>
  );
};

export default Auth;