
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";

// --- CONFIGURACIÓN Y CONSTANTES ---
const LOGO_URL = 'https://gabboggie.com/wp-content/uploads/2026/01/psprt_beige.png';
const BASE_URL = 'https://gabboggie.com/wp-content/uploads/2026/01/';

const firebaseConfig = {
  apiKey: "AIzaSyCG5yMvm_rKwYrmFW_5QZOn8G4", 
  authDomain: "juntas-bitacora.firebaseapp.com",
  projectId: "juntas-bitacora",
  storageBucket: "juntas-bitacora.firebasestorage.app",
  messagingSenderId: "1054570412142",
  appId: "1:1054570412142:web:3312e3c4e0f4974f7620a2"
};

const ExperienceType = {
  COCINA: 'Cocina en casa',
  ASADO: 'Asado',
  JUEGOS: 'Juegos de mesa',
  CINE: 'Día de Película',
  PLAYA: 'Playa',
  ROADTRIP: 'Roadtrip',
  EVENTO: 'Evento especial',
  AVION: 'Viaje en avión'
};

const TYPE_CONFIG = {
  [ExperienceType.COCINA]: { color: '#FB923C', image: `${BASE_URL}stamp_cocina.png` },
  [ExperienceType.ASADO]: { color: '#8B4513', image: `${BASE_URL}stamp_asado.png` },
  [ExperienceType.JUEGOS]: { color: '#EF4444', image: `${BASE_URL}stamp_boardg.png` },
  [ExperienceType.CINE]: { color: '#6B7280', image: `${BASE_URL}stamp_movie.png` },
  [ExperienceType.PLAYA]: { color: '#FBBF24', image: `${BASE_URL}stamp_playa.png` },
  [ExperienceType.ROADTRIP]: { color: '#4ADE80', image: `${BASE_URL}stamp_roadtrip.png` },
  [ExperienceType.EVENTO]: { color: '#A78BFA', image: `${BASE_URL}stamp_special.png` },
  [ExperienceType.AVION]: { color: '#38BDF8', image: `${BASE_URL}stamp_viajeavion.png` },
};

// --- SERVICIOS ---
let db = null;
try {
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (e) { console.error("Firebase Error", e); }

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const getCoordinates = async (location: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Proporciona las coordenadas lat y lng para "${location}" en formato JSON. Solo el JSON.`,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER }
          },
          required: ["lat", "lng"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (e) { return null; }
};

// --- COMPONENTES ---

const Stamp = ({ type, size = 'md', date }: any) => {
  const [error, setError] = useState(false);
  const config = TYPE_CONFIG[type as keyof typeof TYPE_CONFIG];
  if (!config) return null;

  const sizeClasses = { 
    xs: 'w-10 h-10', 
    sm: 'w-16 h-16', 
    md: 'w-28 h-28', 
    lg: 'w-48 h-48' 
  };

  return (
    <div className={`relative ${sizeClasses[size as keyof typeof sizeClasses]} flex items-center justify-center transition-transform active:scale-95`}>
      <div className="w-full h-full relative z-10 stamp-shadow">
        {!error ? (
          <img src={config.image} alt={type} className="w-full h-full object-contain" onError={() => setError(true)} />
        ) : (
          <div className="w-full h-full rounded-full border-4 border-black bg-white flex items-center justify-center p-2 text-center" style={{ borderColor: config.color }}>
             <span className="text-[9px] font-black uppercase leading-tight">{type}</span>
          </div>
        )}
      </div>
      {date && size === 'lg' && (
        <div className="absolute -bottom-2 z-20 bg-black text-white px-3 py-1 rounded border-2 border-white text-[10px] font-black uppercase rotate-[-2deg] shadow-lg">
          {new Date(date).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  );
};

const MapView = ({ experiences, onPinClick }: any) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || typeof (window as any).L === 'undefined') return;
    const L = (window as any).L;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView([20, 0], 2);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapRef.current);
    }

    const markers = L.featureGroup().addTo(mapRef.current);
    markers.clearLayers();

    experiences.forEach((exp: any) => {
      if (exp.coordinates?.lat) {
        const icon = L.divIcon({
          className: 'custom-pin',
          html: `<div style="background:${TYPE_CONFIG[exp.type as keyof typeof TYPE_CONFIG]?.color || '#000'};width:18px;height:18px;border:3px solid black;border-radius:50%;box-shadow:2px 2px 0px rgba(0,0,0,0.4)"></div>`
        });
        L.marker([exp.coordinates.lat, exp.coordinates.lng], { icon })
         .on('click', () => onPinClick(exp))
         .addTo(markers);
      }
    });

    if (experiences.some((e: any) => e.coordinates?.lat)) {
      try { mapRef.current.fitBounds(markers.getBounds(), { padding: [50, 50] }); } catch(e){}
    }
  }, [experiences, onPinClick]);

  return <div ref={containerRef} className="w-full h-full" />;
};

// --- APP PRINCIPAL ---

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [experiences, setExperiences] = useState<any[]>([]);
  const [view, setView] = useState('passport');
  const [selectedExp, setSelectedExp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newExp, setNewExp] = useState({ title: '', type: ExperienceType.COCINA, date: new Date().toISOString().split('T')[0], locationName: '', note: '' });

  useEffect(() => {
    const saved = localStorage.getItem('juntas_session');
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user && db) {
      const q = query(collection(db, "memories"), orderBy("date", "desc"));
      return onSnapshot(q, (snapshot) => {
        setExperiences(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'leo' && password === 'Bielorusia_83') {
      const session = { name: 'Leo', loginAt: Date.now() };
      setUser(session);
      localStorage.setItem('juntas_session', JSON.stringify(session));
    } else { alert("Acceso denegado"); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    try {
      const coords = await getCoordinates(newExp.locationName);
      await addDoc(collection(db, "memories"), { 
        ...newExp, 
        coordinates: coords,
        createdAt: Date.now(), 
        createdBy: user.name 
      });
      (window as any).confetti && (window as any).confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setView('passport');
      setNewExp({ title: '', type: ExperienceType.COCINA, date: new Date().toISOString().split('T')[0], locationName: '', note: '' });
    } catch (err) { alert("Error al guardar"); }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FFFDF7]">
      <div className="w-16 h-16 border-8 border-black border-t-orange-500 rounded-full animate-spin"></div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[#FFFDF7]">
        <div className="w-full max-w-sm text-center">
          <img src={LOGO_URL} className="w-24 h-24 mx-auto mb-8 rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]" />
          <h1 className="text-5xl font-black mb-10 italic">Juntas</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="Usuario" className="w-full p-4 border-4 border-black rounded-2xl font-black text-lg focus:ring-4 ring-orange-200 outline-none" value={username} onChange={e => setUsername(e.target.value)} />
            <input type="password" placeholder="Clave" className="w-full p-4 border-4 border-black rounded-2xl font-black text-lg focus:ring-4 ring-orange-200 outline-none" value={password} onChange={e => setPassword(e.target.value)} />
            <button type="submit" className="w-full bg-black text-white p-5 rounded-2xl font-black uppercase text-lg shadow-[6px_6px_0px_0px_rgba(251,146,60,1)] active:translate-y-1 active:shadow-none transition-all">Entrar</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 bg-[#FFFDF7] flex flex-col">
      <header className="p-6 bg-white border-b-4 border-black flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2" onClick={() => setView('passport')}>
           <img src={LOGO_URL} className="w-8 h-8 rounded-lg border-2 border-black" />
           <span className="text-xl font-black font-serif italic">Juntas</span>
        </div>
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full sync-icon"></div>
            <span className="text-[8px] font-black uppercase text-green-600 tracking-tighter">Sincronizado</span>
        </div>
      </header>

      <main className="flex-1 p-6">
        {view === 'passport' && (
          <div className="grid grid-cols-2 gap-4">
            {experiences.map(exp => (
              <div key={exp.id} onClick={() => setSelectedExp(exp)} className="bg-white p-4 border-4 border-black rounded-[2rem] shadow-sm text-center active:scale-95 transition-all">
                <Stamp type={exp.type} size="md" />
                <h3 className="font-black text-[10px] mt-2 uppercase tracking-tighter truncate">{exp.title}</h3>
              </div>
            ))}
            {experiences.length === 0 && (
                <div className="col-span-2 py-32 text-center opacity-20">
                    <p className="font-black uppercase tracking-widest text-xs">Sin sellos aún</p>
                </div>
            )}
          </div>
        )}

        {view === 'map' && (
          <div className="h-[70vh] rounded-[2.5rem] border-4 border-black overflow-hidden bg-gray-50">
            <MapView experiences={experiences} onPinClick={setSelectedExp} />
          </div>
        )}

        {view === 'add' && (
          <form onSubmit={handleAdd} className="space-y-4 bg-white p-8 border-4 border-black rounded-[2.5rem] shadow-[10px_10px_0px_0px_rgba(251,146,60,1)]">
            <h2 className="text-2xl font-black italic mb-4">Nuevo Sello</h2>
            <input placeholder="Título" className="w-full p-4 border-2 border-black rounded-xl font-bold" value={newExp.title} onChange={e => setNewExp({...newExp, title: e.target.value})} required />
            <select className="w-full p-4 border-2 border-black rounded-xl font-bold" value={newExp.type} onChange={e => setNewExp({...newExp, type: e.target.value})}>
              {Object.values(ExperienceType).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="date" className="w-full p-4 border-2 border-black rounded-xl font-bold" value={newExp.date} onChange={e => setNewExp({...newExp, date: e.target.value})} />
            <input placeholder="Lugar (Ciudad, Pais)" className="w-full p-4 border-2 border-black rounded-xl font-bold" value={newExp.locationName} onChange={e => setNewExp({...newExp, locationName: e.target.value})} required />
            <textarea placeholder="Nota..." className="w-full p-4 border-2 border-black rounded-xl font-bold h-24 resize-none" value={newExp.note} onChange={e => setNewExp({...newExp, note: e.target.value})} />
            <button type="submit" className="w-full bg-black text-white p-4 rounded-xl font-black uppercase">Sellar</button>
          </form>
        )}
      </main>

      {selectedExp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedExp(null)}>
          <div className="bg-white p-10 border-8 border-black rounded-[3rem] w-full max-w-sm text-center relative" onClick={e => e.stopPropagation()}>
            <Stamp type={selectedExp.type} size="lg" date={selectedExp.date} />
            <h2 className="text-3xl font-black font-serif italic mt-6 mb-4">{selectedExp.title}</h2>
            <p className="font-bold text-gray-700 italic mb-8">"{selectedExp.note || 'Un día juntas.'}"</p>
            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest border-t-2 border-gray-100 pt-4">{selectedExp.locationName}</p>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black py-4 px-6 flex justify-around items-center z-50">
        <button onClick={() => setView('add')} className={`flex flex-col items-center gap-1 ${view === 'add' ? 'text-orange-500 scale-110' : 'text-gray-300'} transition-all`}>
          <span className="text-2xl">✨</span>
          <span className="text-[9px] font-black uppercase">Nuevo</span>
        </button>
        <button onClick={() => setView('map')} className={`flex flex-col items-center gap-1 ${view === 'map' ? 'text-orange-500 scale-110' : 'text-gray-300'} transition-all`}>
          <span className="text-2xl">🗺️</span>
          <span className="text-[9px] font-black uppercase">Mapa</span>
        </button>
        <button onClick={() => setView('passport')} className={`flex flex-col items-center gap-1 ${view === 'passport' ? 'text-orange-500 scale-110' : 'text-gray-300'} transition-all`}>
          <span className="text-2xl">📖</span>
          <span className="text-[9px] font-black uppercase">Bitácora</span>
        </button>
      </nav>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
