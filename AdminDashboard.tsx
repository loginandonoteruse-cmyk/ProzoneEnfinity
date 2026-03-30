import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Plus, Trash2, LogOut, LayoutTemplate, ListOrdered, CheckCircle, XCircle, QrCode, MessageSquare, Star, Users } from 'lucide-react';
import { auth, db, logout } from '../firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, query, orderBy, getDocs, where, increment } from 'firebase/firestore';

export default function AdminDashboard() {
  const [settings, setSettings] = useState({ site_title: '', logo_url: '', bg_image_url: '', products_bg_image_url: '', upi_id: '', qr_image_url: '', bitcoin_id: '', bitcoin_qr_image_url: '', about_us_text: '', about_us_image_url: '', primary_color: '#b91c1c' });
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewCodes, setReviewCodes] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState({ title: '', price: '', image_url: '', payment_link: '' });
  const [newReview, setNewReview] = useState({ customer_name: '', rating: 5, comment: '' });
  const [activeTab, setActiveTab] = useState<'settings' | 'about' | 'payment' | 'products' | 'orders' | 'reviews' | 'users'>('settings');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== 'karlbussnes@proton.me') {
        navigate('/admin/login');
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(prev => ({ ...prev, ...docSnap.data() as any }));
      }
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubReviews = onSnapshot(query(collection(db, 'reviews'), orderBy('createdAt', 'desc')), (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubCodes = onSnapshot(query(collection(db, 'review_codes'), orderBy('createdAt', 'desc')), (snapshot) => {
      setReviewCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory to avoid missing index issues
      usersList.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });
      setUsers(usersList);
    }, (error) => {
      console.error("Error fetching users:", error);
    });

    return () => {
      unsubscribeAuth();
      unsubSettings();
      unsubProducts();
      unsubOrders();
      unsubReviews();
      unsubCodes();
      unsubUsers();
    };
  }, [navigate]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Remove any undefined values before saving to Firestore
      const sanitizedSettings = Object.fromEntries(
        Object.entries(settings).map(([k, v]) => [k, v === undefined ? '' : v])
      );
      
      // Check document size before saving (Firestore limit is 1MB = 1,048,576 bytes)
      // We use a safe limit of 900KB to account for metadata
      const sizeInBytes = new Blob([JSON.stringify(sanitizedSettings)]).size;
      if (sizeInBytes > 900000) {
        alert(`Error: Settings are too large (${(sizeInBytes / 1024 / 1024).toFixed(2)} MB). Please use smaller images or image URLs instead of uploading files.`);
        return;
      }

      await setDoc(doc(db, 'settings', 'global'), sanitizedSettings, { merge: true });
      setSuccessMessage('Settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings. If you uploaded large images, try using smaller ones or image URLs.');
    }
  };

  const formatPrice = (price: string) => {
    if (!price) return '';
    if (price.includes('₹')) return price;
    if (price.includes('$')) return price.replace('$', '₹');
    return `₹${price}`;
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const productToSave = {
      ...newProduct,
      price: formatPrice(newProduct.price),
      createdAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, 'products'), productToSave);
      setNewProduct({ title: '', price: '', image_url: '', payment_link: '' });
      setSuccessMessage('Product added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      setSuccessMessage('Product deleted!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStock = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'products', id), { outOfStock: !currentStatus });
      setSuccessMessage(`Product marked as ${!currentStatus ? 'Out of Stock' : 'In Stock'}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.5): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', quality));
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedBase64 = await compressImage(file, 600, 600, 0.6);
        setNewProduct({ ...newProduct, image_url: compressedBase64 });
      } catch (error) {
        console.error("Error compressing image:", error);
        setSuccessMessage("Error uploading image. Please try a smaller file.");
      }
    }
  };

  const handleBanUser = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', id), { isBanned: !currentStatus });
      setSuccessMessage(`User ${!currentStatus ? 'banned' : 'unbanned'} successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrderStatus = async (id: string, status: string) => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;

      if (status === 'confirmed' && order.usedReferralCode && !order.referralAwarded) {
        // Find user with this referral code
        const q = query(collection(db, 'users'), where('referralCode', '==', order.usedReferralCode));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const referrerDoc = snap.docs[0];
          await updateDoc(doc(db, 'users', referrerDoc.id), {
            points: increment(200)
          });
        }
        await updateDoc(doc(db, 'orders', id), { status, referralAwarded: true });
      } else if (status === 'rejected' && order.appliedPoints > 0 && !order.pointsRefunded) {
        // Refund points if rejected
        if (order.userId) {
          await updateDoc(doc(db, 'users', order.userId), {
            points: increment(order.appliedPoints)
          });
        }
        await updateDoc(doc(db, 'orders', id), { status, pointsRefunded: true });
      } else {
        await updateDoc(doc(db, 'orders', id), { status });
      }
      
      setSuccessMessage(`Order marked as ${status}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleGenerateReviewCode = async () => {
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await addDoc(collection(db, 'review_codes'), {
        code,
        is_used: false,
        createdAt: serverTimestamp()
      });
      setSuccessMessage('Review code generated!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReviewCode = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'review_codes', id));
      setSuccessMessage('Review code deleted!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'reviews'), {
        ...newReview,
        createdAt: serverTimestamp()
      });
      setNewReview({ customer_name: '', rating: 5, comment: '' });
      setSuccessMessage('Review added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reviews', id));
      setSuccessMessage('Review deleted!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'qr_image_url' | 'logo_url' | 'bg_image_url' | 'products_bg_image_url' | 'about_us_image_url' | 'bitcoin_qr_image_url') => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        let maxWidth = 600;
        let maxHeight = 600;
        let quality = 0.5;

        if (field === 'logo_url') {
          maxWidth = 150;
          maxHeight = 150;
          quality = 0.7;
        } else if (field === 'qr_image_url' || field === 'bitcoin_qr_image_url') {
          maxWidth = 300;
          maxHeight = 300;
          quality = 0.6;
        } else {
          maxWidth = 800;
          maxHeight = 800;
          quality = 0.4; // Aggressive compression for backgrounds
        }

        const compressedBase64 = await compressImage(file, maxWidth, maxHeight, quality);
        setSettings({ ...settings, [field]: compressedBase64 });
      } catch (error) {
        console.error("Error compressing image:", error);
        setSuccessMessage("Error uploading image. Please try a smaller file.");
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!auth.currentUser) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutTemplate size={24} />
            Admin Panel
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'settings' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Settings size={20} />
            Site Settings
          </button>
          <button 
            onClick={() => setActiveTab('about')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'about' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <LayoutTemplate size={20} />
            About Us Page
          </button>
          <button 
            onClick={() => setActiveTab('payment')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'payment' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <QrCode size={20} />
            Payment QR & UPI
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'products' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Plus size={20} />
            Manage Products
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'orders' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <ListOrdered size={20} />
            Payment Requests
          </button>
          <button 
            onClick={() => setActiveTab('reviews')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'reviews' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <MessageSquare size={20} />
            Manage Reviews
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition-colors ${activeTab === 'users' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Users size={20} />
            Manage Users
          </button>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto relative">
        {successMessage && (
          <div className="absolute top-8 right-8 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg border border-emerald-100 shadow-sm z-50">
            {successMessage}
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Site Settings</h2>
            <form onSubmit={handleUpdateSettings} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Title</label>
                <input 
                  type="text" 
                  value={settings.site_title}
                  onChange={e => setSettings({...settings, site_title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme Color (Primary)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={settings.primary_color || '#b91c1c'}
                    onChange={e => setSettings({...settings, primary_color: e.target.value})}
                    className="w-12 h-12 p-1 rounded cursor-pointer border border-gray-300"
                  />
                  <span className="text-sm text-gray-500">Choose the main color for headings and accents (default is red).</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Image</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo_url')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">OR enter URL:</span>
                    <input 
                      type="text" 
                      value={settings.logo_url}
                      onChange={e => setSettings({...settings, logo_url: e.target.value})}
                      placeholder="URL to your logo"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    />
                  </div>
                  {settings.logo_url && (
                    <div className="mt-4 p-4 border border-gray-100 rounded-xl bg-gray-50 inline-block">
                      <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Logo Preview</p>
                      <img src={settings.logo_url} alt="Logo Preview" className="w-16 h-16 rounded-full object-cover border border-gray-200 shadow-sm" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Image</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'bg_image_url')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">OR enter URL:</span>
                    <input 
                      type="text" 
                      value={settings.bg_image_url}
                      onChange={e => setSettings({...settings, bg_image_url: e.target.value})}
                      placeholder="URL to your background image"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    />
                  </div>
                  {settings.bg_image_url && (
                    <div className="mt-4 p-4 border border-gray-100 rounded-xl bg-gray-50 inline-block">
                      <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Background Preview</p>
                      <img src={settings.bg_image_url} alt="BG Preview" className="w-32 h-20 rounded object-cover border border-gray-200 shadow-sm" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Products Area Background Image</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'products_bg_image_url')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">OR enter URL:</span>
                    <input 
                      type="text" 
                      value={settings.products_bg_image_url}
                      onChange={e => setSettings({...settings, products_bg_image_url: e.target.value})}
                      placeholder="URL to products background image"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    />
                  </div>
                  {settings.products_bg_image_url && (
                    <div className="mt-4 p-4 border border-gray-100 rounded-xl bg-gray-50 inline-block">
                      <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Products BG Preview</p>
                      <img src={settings.products_bg_image_url} alt="Products BG Preview" className="w-32 h-20 rounded object-cover border border-gray-200 shadow-sm" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
                Save Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">About Us Page</h2>
            <form onSubmit={handleUpdateSettings} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">About Us Text / Description</label>
                <textarea 
                  value={settings.about_us_text || ''}
                  onChange={e => setSettings({...settings, about_us_text: e.target.value})}
                  placeholder="Write something about your shop here..."
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">About Us Image</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'about_us_image_url')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">OR enter URL:</span>
                    <input 
                      type="text" 
                      value={settings.about_us_image_url || ''}
                      onChange={e => setSettings({...settings, about_us_image_url: e.target.value})}
                      placeholder="URL to your about us image"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    />
                  </div>
                  {settings.about_us_image_url && (
                    <div className="mt-4 p-4 border border-gray-100 rounded-xl bg-gray-50 inline-block">
                      <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Image Preview</p>
                      <img src={settings.about_us_image_url} alt="About Us Preview" className="w-32 h-20 rounded object-cover border border-gray-200 shadow-sm" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
                Save About Us
              </button>
            </form>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment QR & UPI Settings</h2>
            <form onSubmit={handleUpdateSettings} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your UPI ID</label>
                <input 
                  type="text" 
                  value={settings.upi_id || ''}
                  onChange={e => setSettings({...settings, upi_id: e.target.value})}
                  placeholder="e.g., yourname@upi"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">QR Code Image</label>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'qr_image_url')}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">OR enter URL:</span>
                    <input 
                      type="text" 
                      value={settings.qr_image_url || ''}
                      onChange={e => setSettings({...settings, qr_image_url: e.target.value})}
                      placeholder="URL to your payment QR code"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    />
                  </div>
                  {settings.qr_image_url && (
                    <div className="mt-4 p-4 border border-gray-100 rounded-xl bg-gray-50 inline-block">
                      <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">QR Code Preview</p>
                      <img src={settings.qr_image_url} alt="QR Preview" className="w-32 h-32 rounded-lg object-cover border border-gray-200 shadow-sm" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
              <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Bitcoin Payment Details</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bitcoin Wallet Address</label>
                    <input 
                      type="text" 
                      value={settings.bitcoin_id || ''}
                      onChange={e => setSettings({...settings, bitcoin_id: e.target.value})}
                      placeholder="e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bitcoin QR Code Image</label>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, 'bitcoin_qr_image_url')}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 transition-colors"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">OR enter URL:</span>
                        <input 
                          type="text" 
                          value={settings.bitcoin_qr_image_url || ''}
                          onChange={e => setSettings({...settings, bitcoin_qr_image_url: e.target.value})}
                          placeholder="URL to your Bitcoin QR code"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none transition-all"
                        />
                      </div>
                      {settings.bitcoin_qr_image_url && (
                        <div className="mt-4 p-4 border border-gray-100 rounded-xl bg-gray-50 inline-block">
                          <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Bitcoin QR Preview</p>
                          <img src={settings.bitcoin_qr_image_url} alt="Bitcoin QR Preview" className="w-32 h-32 rounded-lg object-cover border border-gray-200 shadow-sm" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
                Save Payment Settings
              </button>
            </form>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="max-w-5xl mx-auto space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h2>
              <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Title</label>
                  <input 
                    type="text" required
                    value={newProduct.title}
                    onChange={e => setNewProduct({...newProduct, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price (e.g., 999)</label>
                  <input 
                    type="text" required
                    value={newProduct.price}
                    onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                    placeholder="999"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Image</label>
                  <div className="space-y-3">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleProductImageUpload}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 transition-colors"
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">OR URL:</span>
                      <input 
                        type="text"
                        value={newProduct.image_url}
                        onChange={e => setNewProduct({...newProduct, image_url: e.target.value})}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                      />
                    </div>
                    {newProduct.image_url && (
                      <img src={newProduct.image_url} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-gray-200" referrerPolicy="no-referrer" />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Link (Optional)</label>
                  <input 
                    type="url"
                    value={newProduct.payment_link}
                    onChange={e => setNewProduct({...newProduct, payment_link: e.target.value})}
                    placeholder="Leave empty to use QR/UPI"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
                    Add Product
                  </button>
                </div>
              </form>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Existing Products</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 font-medium text-gray-600">Image</th>
                      <th className="p-4 font-medium text-gray-600">Title</th>
                      <th className="p-4 font-medium text-gray-600">Price</th>
                      <th className="p-4 font-medium text-gray-600">Payment Link</th>
                      <th className="p-4 font-medium text-gray-600">Status</th>
                      <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4">
                          <img src={product.image_url} alt={product.title} className="w-12 h-12 rounded-lg object-cover" referrerPolicy="no-referrer" />
                        </td>
                        <td className="p-4 font-medium text-gray-900">{product.title}</td>
                        <td className="p-4 text-emerald-600 font-medium">{formatPrice(product.price)}</td>
                        <td className="p-4">
                          <a href={product.payment_link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm truncate max-w-xs block">
                            {product.payment_link}
                          </a>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.outOfStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {product.outOfStock ? 'Out of Stock' : 'In Stock'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleToggleStock(product.id, !!product.outOfStock)}
                            className={`p-2 rounded-lg transition-colors mr-2 ${product.outOfStock ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}
                            title={product.outOfStock ? "Mark In Stock" : "Mark Out of Stock"}
                          >
                            {product.outOfStock ? <CheckCircle size={18} /> : <XCircle size={18} />}
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">No products found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Requests</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 font-medium text-gray-600">Date</th>
                    <th className="p-4 font-medium text-gray-600">Product</th>
                    <th className="p-4 font-medium text-gray-600">Customer Details</th>
                    <th className="p-4 font-medium text-gray-600">Discount/Referral</th>
                    <th className="p-4 font-medium text-gray-600">Status</th>
                    <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{order.product_title}</div>
                        <div className="text-sm text-gray-500 line-through">{formatPrice(order.product_price)}</div>
                        <div className="text-sm text-emerald-600 font-bold">Paid: {formatPrice(order.finalPrice?.toString() || order.product_price)}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-sm text-gray-900 break-all">
                          {order.payment_method === 'bitcoin' ? 'BTC Txn: ' : 'UPI: '} {order.customer_upi_id}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 capitalize">Method: {order.payment_method || 'upi'}</div>
                        <div className="text-sm text-gray-500 mt-1">Email: {order.email || 'N/A'}</div>
                        {order.userEmail && <div className="text-xs text-blue-600 mt-1">User ID: {order.userEmail}</div>}
                      </td>
                      <td className="p-4">
                        {order.appliedPoints > 0 && (
                          <div className="text-xs text-blue-600 font-medium mb-1">
                            Points Used: {order.appliedPoints}
                          </div>
                        )}
                        {order.usedReferralCode && (
                          <div className="text-xs text-emerald-600 font-medium">
                            Referral: {order.usedReferralCode}
                            {order.referralAwarded && <span className="text-gray-500 ml-1">(Awarded)</span>}
                          </div>
                        )}
                        {!order.appliedPoints && !order.usedReferralCode && (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            order.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 
                            'bg-red-100 text-red-800'}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {order.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => handleUpdateOrderStatus(order.id, 'confirmed')}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Confirm Payment"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button 
                              onClick={() => handleUpdateOrderStatus(order.id, 'rejected')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject Payment"
                            >
                              <XCircle size={18} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">No payment requests found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'users' && (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Registered Users</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-4 font-medium text-gray-600">User ID (Email)</th>
                    <th className="p-4 font-medium text-gray-600">Referral / Points</th>
                    <th className="p-4 font-medium text-gray-600">Registered At</th>
                    <th className="p-4 font-medium text-gray-600">Status</th>
                    <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">{user.email || 'N/A'}</td>
                      <td className="p-4">
                        <div className="text-sm font-mono text-emerald-600 font-bold">{user.referralCode || 'N/A'}</div>
                        <div className="text-xs text-blue-600 font-medium">Points: {user.points || 0}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">
                        {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleString() : 'N/A'}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${user.isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {user.isBanned ? 'Banned' : 'Active'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleBanUser(user.id, user.isBanned)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${user.isBanned ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                        >
                          {user.isBanned ? 'Unban' : 'Ban User'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">No users found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* Review Codes Section */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Review Codes</h2>
                <button 
                  onClick={handleGenerateReviewCode}
                  className="bg-gray-900 text-white px-4 py-2 rounded-xl font-medium hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Generate New Code
                </button>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 font-medium text-gray-600">Code</th>
                      <th className="p-4 font-medium text-gray-600">Status</th>
                      <th className="p-4 font-medium text-gray-600">Created At</th>
                      <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewCodes.map(code => (
                      <tr key={code.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 font-mono font-bold text-lg text-gray-900">{code.code}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${code.is_used ? 'bg-gray-100 text-gray-800' : 'bg-emerald-100 text-emerald-800'}`}
                          >
                            {code.is_used ? 'Used' : 'Unused'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-500">
                          {new Date(code.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteReviewCode(code.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Code"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reviewCodes.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500">No review codes generated yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Add Review Manually */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Review Manually</h2>
              <form onSubmit={handleAddReview} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                  <input 
                    type="text" required
                    value={newReview.customer_name}
                    onChange={e => setNewReview({...newReview, customer_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating (1-5)</label>
                  <div className="flex items-center gap-2 pt-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewReview({...newReview, rating: star})}
                        className="focus:outline-none"
                      >
                        <Star 
                          size={24} 
                          className={star <= newReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} 
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Comment</label>
                  <textarea 
                    required
                    value={newReview.comment}
                    onChange={e => setNewReview({...newReview, comment: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black outline-none resize-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <button type="submit" className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors">
                    Add Review
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Reviews */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Existing Reviews</h2>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="p-4 font-medium text-gray-600">Date</th>
                      <th className="p-4 font-medium text-gray-600">Customer</th>
                      <th className="p-4 font-medium text-gray-600">Rating</th>
                      <th className="p-4 font-medium text-gray-600">Comment</th>
                      <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviews.map(review => (
                      <tr key={review.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 font-medium text-gray-900">{review.customer_name}</td>
                        <td className="p-4">
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star 
                                key={star} 
                                size={14} 
                                className={star <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} 
                              />
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-gray-600 max-w-xs truncate" title={review.comment}>
                          {review.comment}
                        </td>
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => handleDeleteReview(review.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Review"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {reviews.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">No reviews found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
