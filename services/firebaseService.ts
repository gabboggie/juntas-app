
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Experience } from '../types';

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
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase connection error:", e);
}

export const subscribeToMemories = (callback: (memories: Experience[]) => void) => {
  if (!db) return () => {};
  
  const q = query(collection(db, "memories"), orderBy("date", "desc"));
  return onSnapshot(q, (snapshot) => {
    const memories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Experience[];
    callback(memories);
  }, (error) => {
    console.error("Firestore snapshot error:", error);
  });
};

export const saveMemoryToCloud = async (memory: Omit<Experience, 'id'>) => {
  if (!db) return null;
  try {
    const docRef = await addDoc(collection(db, "memories"), memory);
    return docRef.id;
  } catch (e) {
    console.error("Firestore save error:", e);
    return null;
  }
};

export const deleteMemoryFromCloud = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "memories", id));
  } catch (e) {
    console.error("Firestore delete error:", e);
  }
};
