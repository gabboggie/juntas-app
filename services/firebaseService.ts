
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Experience } from '../types';

// NOTA: Para que esto funcione, debes reemplazar estos valores con los de tu proyecto en Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCG5yMvm_rKwYrmFW_5QZOlp8Qg9RcozfM",
  authDomain: "juntas-bitacora.firebaseapp.com",
  projectId: "juntas-bitacora",
  storageBucket: "juntas-bitacora.firebasestorage.app",
  messagingSenderId: "1054570412142",
  appId: "1:1054570412142:web:3312e3c448b4f40eb0ce7f"
};

let db: any = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase no configurado. Usando modo local.");
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
  });
};

export const saveMemoryToCloud = async (memory: Omit<Experience, 'id'>) => {
  if (!db) return null;
  const docRef = await addDoc(collection(db, "memories"), memory);
  return docRef.id;
};

export const deleteMemoryFromCloud = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, "memories", id));
};
