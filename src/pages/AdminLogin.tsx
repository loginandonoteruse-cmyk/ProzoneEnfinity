import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'global'));
        if (docSnap.exists()) {
          setSettings(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching settings:", err);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email === 'karlbussnes@proton.me') {
          navigate('/admin');
        } else {
          setError('Unauthorized user. Only admin can login.');
          auth.signOut();
        }
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (email !== 'karlbussnes@proton.me' || password !== 'karl906284151703') {
      setError('Invalid credentials');
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          navigate('/admin');
        } catch (createErr: any) {
          if (createErr.code === 'auth/email-already-in-use') {
            setError('Invalid password for existing admin account.');
          } else if (createErr.code === 'auth/operation-not-allowed') {
            setError('Please enable Email/Password authentication in the Firebase Console (Authentication -> Sign-in method).');
          } else {
            setError(createErr.message);
          }
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Please enable Email/Password authentication in the Firebase Console (Authentication -> Sign-in method).');
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: `${settings.primary_color || '#b91c1c'}10` }}>
      <style>{`
        .theme-text { color: ${settings.primary_color || '#b91c1c'}; }
        .theme-text-light { color: ${settings.primary_color || '#b91c1c'}b3; }
        .theme-bg-light { background-color: ${settings.primary_color || '#b91c1c'}1a; }
        .theme-border-light { border-color: ${settings.primary_color || '#b91c1c'}33; }
        .theme-ring:focus { --tw-ring-color: ${settings.primary_color || '#b91c1c'}; border-color: ${settings.primary_color || '#b91c1c'}; }
      `}</style>
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border theme-border-light">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold theme-text">
            Admin Login
          </h2>
          <p className="mt-2 text-center text-sm theme-text-light">
            Sign in with your admin credentials
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && <div className="theme-text text-sm text-center">{error}</div>}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email Address</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none theme-ring focus:z-10 sm:text-sm"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none theme-ring focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
