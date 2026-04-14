import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const CreateEvent = () => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [ticketLink, setTicketLink] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // ImgBB API Key
  const IMGBB_API_KEY = "f31520871bbee018759d22c5c1dc5461";

  useEffect(() => {
    const checkVerification = async () => {
      if (auth.currentUser) {
        const docSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (docSnap.exists() && docSnap.data().isVerified) {
          setUserData(docSnap.data());
        }
      }
    };
    checkVerification();
  }, []);

  // Foolproof Base64 Upload Function
  const uploadToImgBB = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file); 
      
      reader.onloadend = async () => {
        try {
          const base64data = reader.result.split(',')[1]; 
          const formData = new FormData();
          formData.append('image', base64data);

          const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
          });

          const data = await response.json();
          if (data.success) {
            resolve(data.data.url); 
          } else {
            reject(data.error.message || "ImgBB rejected the file.");
          }
        } catch (err) {
          reject(err.message);
        }
      };
      reader.onerror = () => reject("Failed to read the file locally.");
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userData) return;
    setUploading(true);

    try {
      let imageUrl = null;
      
      if (imageFile) {
        try {
          imageUrl = await uploadToImgBB(imageFile);
        } catch (uploadError) {
          alert(`Image Upload Failed: ${uploadError}`);
          setUploading(false);
          return; 
        }
      }

      await addDoc(collection(db, 'events'), {
        title, 
        date, 
        location, 
        ticketLink, 
        description,
        imageUrl: imageUrl, 
        organiser: userData.businessName || 'Verified Organiser',
        creatorId: auth.currentUser.uid,
        createdAt: new Date()
      });
      
      navigate('/'); 
    } catch (err) {
      console.error("Database Error:", err);
      alert(t("Error posting event. Please try again.", "நிகழ்வை இடுகையிடுவதில் பிழை."));
    } finally {
      setUploading(false);
    }
  };

  // RBAC Boundary
  if (!userData) {
    return (
      <div className="app-container page-content" style={{textAlign: 'center', justifyContent: 'center'}}>
        <h2 style={{color: 'var(--text-secondary)'}}>{t("Access Denied.", "அணுகல் மறுக்கப்பட்டது.")}</h2>
        <p>{t("You must be an approved business account to post events.", "நிகழ்வுகளை இடுகையிட நீங்கள் அங்கீகரிக்கப்பட்ட வணிகக் கணக்காக இருக்க வேண்டும்.")}</p>
      </div>
    );
  }

  return (
    <div className="app-container page-content">
      <h1 className="event-title" style={{ marginBottom: '1rem' }}>{t("Drop an Event.", "நிகழ்வை உருவாக்கு.")}</h1>
      
      <form onSubmit={handleSubmit} className="input-group">
        <div className="file-input-wrapper">
          <div className="file-upload-btn" style={{ 
            borderColor: imageFile ? 'var(--accent-solid)' : 'var(--border-subtle)',
            background: imageFile ? 'rgba(255, 81, 47, 0.05)' : 'var(--bg-surface)'
          }}>
            {imageFile ? `📸 ${imageFile.name}` : t("+ Upload Event Poster (Optional)", "+ நிகழ்வு சுவரொட்டியைப் பதிவேற்றவும் (விருப்பத்தேர்வு)")}
          </div>
          <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
        </div>

        <input type="text" placeholder={t("Event Title", "நிகழ்வின் தலைப்பு")} value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input type="text" placeholder={t("Location", "இடம்")} value={location} onChange={(e) => setLocation(e.target.value)} required />
        <textarea 
          placeholder={t("Event Details / Description", "நிகழ்வு விவரங்கள் / விளக்கம்")} 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          style={{ minHeight: '120px', resize: 'vertical' }}
        />
        <input type="url" placeholder={t("Ticket Link (e.g., Eventbrite URL)", "டிக்கெட் இணைப்பு (எ.கா. Eventbrite URL)")} value={ticketLink} onChange={(e) => setTicketLink(e.target.value)} required />
        
        <button type="submit" className="btn-primary" disabled={uploading} style={{ marginTop: '0.5rem' }}>
          {uploading ? t("Publishing Event...", "நிகழ்வு வெளியிடப்படுகிறது...") : t("Publish Event", "நிகழ்வை வெளியிடு")}
        </button>
      </form>
    </div>
  );
};

export default CreateEvent;