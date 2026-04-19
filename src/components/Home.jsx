import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import EventCard from './EventCard';
import { useLanguage } from '../context/LanguageContext';
import { MapPin } from 'lucide-react';
import logo from '../assets/logo.png'; 

const Home = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState('All');
  
  const { t } = useLanguage();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const q = query(collection(db, 'events'), orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const eventsData = querySnapshot.docs.map(doc => ({
          id: doc.id, ...doc.data()
        }));
        
        const upcomingEvents = eventsData.filter(event => new Date(event.date) >= new Date());
        setEvents(upcomingEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const locations = useMemo(() => {
    const uniqueLocs = new Set(events.map(e => e.location));
    return ['All', ...Array.from(uniqueLocs)];
  }, [events]);

  const filteredEvents = selectedLocation === 'All' ? events : events.filter(e => e.location === selectedLocation);

  if (loading) {
    return <div className="app-container page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><p>{t("Loading events...", "நிகழ்வுகள் ஏற்றப்படுகின்றன...")}</p></div>;
  }

  return (
    <div className="app-container page-content">
      <h1 className="event-title" style={{ marginBottom: '1rem' }}>
        {t("Discover", "கண்டுபிடி")}
      </h1>

      <div className="filter-scroll-container" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>{`.filter-scroll-container::-webkit-scrollbar { display: none; }`}</style>
        {locations.map(loc => (
          <button
            key={loc} onClick={() => setSelectedLocation(loc)}
            className={`filter-pill ${selectedLocation === loc ? 'active' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
          >
            {loc !== 'All' && <MapPin size={14} />}
            {loc === 'All' ? t("All", "அனைத்தும்") : loc}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {filteredEvents.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem 0' }}>{t("No upcoming events found.", "எதிர்வரும் நிகழ்வுகள் ஏதுமில்லை.")}</p>
        ) : (
          filteredEvents.map(event => <EventCard key={event.id} event={event} />)
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0 5rem 0', opacity: 0.3 }}>
        <img src={logo} alt="TamilLink Mark" style={{ width: '40px', height: '40px', filter: 'grayscale(100%)', marginBottom: '8px', borderRadius: '10px' }} />
        <p style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, letterSpacing: '1px' }}>TamilLink</p>
      </div>
    </div>
  );
};

export default Home;