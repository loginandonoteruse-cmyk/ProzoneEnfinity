import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Gamepad2, AlertCircle } from 'lucide-react';

export default function UserLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email !== 'karlbussnes@proton.me') {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists() && userDoc.data().isBanned) {
          await signOut(auth);
          setError('Your account has been banned by the administrator.');
          setIsLoading(false);
          return;
        }
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const generateReferralCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email,
          isBanned: false,
          referralCode: generateReferralCode(),
          points: 0,
          hasUsedReferral: false,
          createdAt: serverTimestamp()
        });
      }
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This User ID is already taken.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid User ID or Password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans text-gray-100">
      <div className="max-w-md w-full bg-gray-900 p-8 rounded-3xl shadow-2xl border border-gray-800 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center border border-gray-700 shadow-inner">
              <Gamepad2 className="w-8 h-8 text-yellow-400" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-center text-white mb-2 tracking-tight">
            {isLogin ? 'WELCOME BACK' : 'JOIN GAMERZONE'}
          </h2>
          <p className="text-center text-gray-400 mb-8 text-sm font-medium">
            {isLogin ? 'Enter your credentials to access the shop' : 'Create your account to start shopping'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                User ID (Email)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all placeholder-gray-600"
                placeholder="player@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 text-white px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all placeholder-gray-600"
                placeholder="••••••••"
              />
            </div>

            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 mt-6">
              <p className="text-yellow-400 text-sm font-medium text-center flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Never forget your ID or Pass!
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-4 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-[0_0_20px_rgba(250,204,21,0.3)] hover:shadow-[0_0_25px_rgba(250,204,21,0.5)]"
            >
              {isLoading ? 'PROCESSING...' : isLogin ? 'LOGIN NOW' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-gray-400 hover:text-yellow-400 text-sm font-medium transition-colors"
            >
              {isLogin ? "Don't have an account? Create one" : "Already have an account? Login here"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
