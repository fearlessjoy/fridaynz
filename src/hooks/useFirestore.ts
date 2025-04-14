import { useState, useEffect, useCallback } from 'react';
import { 
  getCollection, 
  getDocument, 
  addDocument, 
  updateDocument, 
  deleteDocument,
  queryCollection,
  auth
} from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Utility function to ensure user is authenticated
const ensureAuthenticated = async () => {
  return new Promise((resolve, reject) => {
    // Check if already authenticated
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    // Set up a one-time auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe(); // Unsubscribe immediately after first callback
      if (user) {
        resolve(user);
      } else {
        reject(new Error('User is not authenticated'));
      }
    });

    // Set a timeout to prevent hanging
    setTimeout(() => {
      unsubscribe();
      reject(new Error('Authentication check timed out'));
    }, 5000);
  });
};

export function useCollection(collectionName: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  const fetchData = useCallback(async () => {
    if (!collectionName) return;
    
    try {
      setLoading(true);
      // Ensure we're authenticated before fetching
      await ensureAuthenticated();
      setAuthenticated(true);
      
      console.log(`Fetching collection: ${collectionName}`);
      const result = await getCollection(collectionName);
      setData(result);
      setError(null);
    } catch (err) {
      console.error(`Error in useCollection(${collectionName}):`, err);
      setError(err as Error);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  // Set up authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthenticated(!!user);
      if (user && collectionName) {
        fetchData();
      } else {
        setData([]);
      }
    });
    
    return () => unsubscribe();
  }, [collectionName, fetchData]);

  const add = async (document: any, id?: string) => {
    try {
      await ensureAuthenticated();
      const result = await addDocument(collectionName, document, id);
      await fetchData();
      return result;
    } catch (err) {
      console.error(`Error adding document to ${collectionName}:`, err);
      setError(err as Error);
      throw err;
    }
  };

  const update = async (id: string, document: any) => {
    try {
      await ensureAuthenticated();
      const result = await updateDocument(collectionName, id, document);
      await fetchData();
      return result;
    } catch (err) {
      console.error(`Error updating document in ${collectionName}:`, err);
      setError(err as Error);
      throw err;
    }
  };

  const remove = async (id: string) => {
    try {
      await ensureAuthenticated();
      const result = await deleteDocument(collectionName, id);
      await fetchData();
      return result;
    } catch (err) {
      console.error(`Error removing document from ${collectionName}:`, err);
      setError(err as Error);
      throw err;
    }
  };

  const query = async (fieldPath: string, operator: any, value: any) => {
    try {
      setLoading(true);
      await ensureAuthenticated();
      
      const result = await queryCollection(collectionName, fieldPath, operator, value);
      setData(result);
      return result;
    } catch (err) {
      console.error(`Error querying collection ${collectionName}:`, err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { 
    data, 
    loading, 
    error, 
    add, 
    update, 
    remove, 
    query, 
    refresh: fetchData,
    authenticated 
  };
}

export function useDocument(collectionName: string, id: string) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  const fetchData = useCallback(async () => {
    if (!collectionName || !id) return;
    
    try {
      setLoading(true);
      // Ensure we're authenticated before fetching
      await ensureAuthenticated();
      setAuthenticated(true);
      
      console.log(`Fetching document: ${collectionName}/${id}`);
      const result = await getDocument(collectionName, id);
      setData(result);
      setError(null);
    } catch (err) {
      console.error(`Error in useDocument(${collectionName}/${id}):`, err);
      setError(err as Error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [collectionName, id]);

  // Set up authentication state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthenticated(!!user);
      if (user && collectionName && id) {
        fetchData();
      } else {
        setData(null);
      }
    });
    
    return () => unsubscribe();
  }, [collectionName, id, fetchData]);

  const update = async (document: any) => {
    try {
      await ensureAuthenticated();
      const result = await updateDocument(collectionName, id, document);
      await fetchData();
      return result;
    } catch (err) {
      console.error(`Error updating document ${collectionName}/${id}:`, err);
      setError(err as Error);
      throw err;
    }
  };

  const remove = async () => {
    try {
      await ensureAuthenticated();
      const result = await deleteDocument(collectionName, id);
      setData(null);
      return result;
    } catch (err) {
      console.error(`Error removing document ${collectionName}/${id}:`, err);
      setError(err as Error);
      throw err;
    }
  };

  return { 
    data, 
    loading, 
    error, 
    update, 
    remove, 
    refresh: fetchData, 
    authenticated 
  };
} 