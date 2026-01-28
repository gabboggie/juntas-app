
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Experience } from '../types';

/**
 * CONFIGURACIÓN DE TU PROYECTO REAL:
 * Estos datos conectan tu app con tu base de datos en la nube.
 */
const firebaseConfig = {
  apiKey: "AIzaSyCG5yMvm_rKwYrmFW_5QZOn8G4", 
  authDomain: "juntas-bitacora.firebaseapp.com",
  projectId: "juntas-bitacora",
  storageBucket: "juntas-bitacora.firebasestorage.app",
  messagingSenderId: "1054570412142",
  appId: "1:1054570412142:web:3312e3c4e0f4974f7620a2"
};

let db: any = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("☁️ Firebase Juntas conectado correctamente");
} catch (e) {
  console.error("Error al conectar con Firebase:", e);
}

export const subscribeToMemories = (callback: (memories: Experience[]) => void) => {
  if (!db) return () => {};
  
  // Escucha cambios en tiempo real en la colección 'memories'
  const q = query(collection(db, "memories"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const memories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Experience[];
    callback(memories);
  }, (error) => {
    console.error("Error en suscripción de Firestore (¿Activaste la base de datos?):", error);
  });
};

export const saveMemoryToCloud = async (memory: Omit<Experience, 'id'>) => {
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, "memories"), memory);
    return docRef.id;
  } catch (e) {
    console.error("Error guardando en la nube:", e);
    return null;
  }
};

export const deleteMemoryFromCloud = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "memories", id));
  } catch (e) {
    console.error("Error eliminando de la nube:", e);
  }
};
