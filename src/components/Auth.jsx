import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react'; // imported some icons for the popup bubble
import logo from '../assets/logo.png'; 

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [toast, setToast] = useState(null); 
  
  const navigate = useNavigate();

  // helper function to show the bubble and hide it automatically after 4 seconds
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAuth = async (e) => {
    e.preventDefault(); // stops the page from refreshing and wiping the state
    setIsProcessing(true);
    
    try {
      if (isLogin) {
        // standard firebase login
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // register them
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // gotta make a firestore doc too otherwise the profile page literally crashes
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email,
          isAdmin: false,
          isVerified: false, // default to false so randoms can't post events
          createdAt: new Date()
        });
      }

      // bounce them straight to the feed. 
      navigate('/');

    } catch (error) {
      // extract just the useful part of the firebase error
      const cleanError = error.message.replace('Firebase: ', '');
      showToast('error', cleanError);
      setIsProcessing(false);
    }
  };

  // forgot password logic. firebase handles the actual email sending
  const handleForgotPassword = async () => {
    if (!email) {
      showToast('error', "Please type your email address in the box first!");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showToast('success', "Password reset email sent! Check your inbox.");
    } catch (error) {
      console.error("Error sending reset email:", error);
      showToast('error', "Failed to send reset email. Are you sure you have an account?");
    }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', position: 'relative', zIndex: 10 }}>
      
      {/* NATIVE APP TOAST BUBBLE */}
      {toast && (
        <div className="animate-in" style={{
          position: 'fixed', 
          bottom: '40px', 
          left: '50%', 
          transform: 'translateX(-50%)', // centers it perfectly on mobile
          background: toast.type === 'error' ? '#FEF2F2' : '#E1FDEB',
          color: toast.type === 'error' ? '#DC2626' : '#007F3B',
          padding: '12px 20px', 
          borderRadius: '100px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', 
          zIndex: 9999, 
          fontWeight: 600, 
          width: 'max-content', 
          maxWidth: '90%', // prevents it from bleeding off the screen if the error is long
          border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#BBF7D0'}`
        }}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span style={{ fontSize: '0.9rem', lineHeight: 1.2 }}>{toast.message}</span>
        </div>
      )}

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

      {/* the box thing */}
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
            required={!isLogin} // don't require password if they are just typing email to reset it
            disabled={isProcessing}
            style={{ borderRadius: '20px' }}
          />

          {/* only show forgot password if they are on the login screen */}
          {isLogin && (
            <div style={{ textAlign: 'right', marginTop: '-0.5rem' }}>
              <button 
                type="button" // CRITICAL: type="button" stops it from submitting the login form!
                onClick={handleForgotPassword}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>
          )}
          
          <button type="submit" className="btn-primary" disabled={isProcessing} style={{ marginTop: '0.5rem', borderRadius: '100px' }}>
            {isProcessing ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
          </button>
        </form>

        {/* toggle between login and signup modes */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button 
            onClick={() => { setIsLogin(!isLogin); setPassword(''); }} // clear password when switching modes just in case
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