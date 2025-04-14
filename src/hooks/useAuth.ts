import { useState } from 'react';
import { useAuth as useAuthContext } from '../lib/AuthContext';
import { 
  registerUser,
  loginUser,
  logoutUser,
  createUserProfile,
  updateUserProfile
} from '../lib/firebase';

export function useAuth() {
  const auth = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const signup = async (email: string, password: string, userData = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await registerUser(email, password);
      if (result.user) {
        await createUserProfile(result.user.uid, {
          email: result.user.email,
          createdAt: new Date(),
          ...userData
        });
      }
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      return await loginUser(email, password);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      return await logoutUser();
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: any) => {
    try {
      if (!auth.currentUser) throw new Error('No authenticated user');
      setLoading(true);
      setError(null);
      return await updateUserProfile(auth.currentUser.uid, data);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    ...auth,
    authLoading: loading,
    authError: error,
    signup,
    login,
    logout,
    updateProfile
  };
} 