import React, { useEffect, useState } from 'react';
import { ShoppingCart, ShoppingBag, X, LogOut, Package, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { db, auth } from '../firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, serverTimestamp, query, where, orderBy, increment } from 'firebase/firestore';
import { signOut, onAuthStateChanged } from 'firebase/auth';

export default function Shop() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'bitcoin'>('upi');
  const [customerUpiId, setCustomerUpiId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMyOrders, setShowMyOrders] = useState(false);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [referralInput, setReferralInput] = useState('');
  const [usePoints, setUsePoints] = useState(false);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      } else {
        setSettings({ site_title: 'My Shop', logo_url: '', bg_image_url: '' });
      }
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prods: any[] = [];
      snapshot.forEach(doc => {
        prods.push({ id: doc.id, ...doc.data() });
      });
      setProducts(prods);
    });

    let unsubOrders = () => {};
    let unsubUser = () => {};
    
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.isBanned) {
              signOut(auth);
              // We don't use alert() here due to iframe restrictions, 
              // the user will just be logged out automatically.
            } else {
              setCurrentUserData(data);
            }
          }
        });

        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        unsubOrders = onSnapshot(q, (snapshot) => {
          setMyOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
      } else {
        setMyOrders([]);
        unsubOrders();
        unsubUser();
      }
    });

    return () => {
      unsubSettings();
      unsubProducts();
      unsubOrders();
      unsubUser();
      unsubscribeAuth();
    };
  }, []);

  const handleBuyClick = (product: any, e: React.MouseEvent) => {
    e.preventDefault();
    if (settings.upi_id || settings.qr_image_url) {
      setSelectedProduct(product);
      setOrderSuccess(false);
      setCustomerUpiId('');
      setCustomerEmail(auth.currentUser?.email || '');
      setReferralInput('');
      setUsePoints(false);
    } else if (product.payment_link) {
      window.open(product.payment_link, '_blank');
    } else {
      window.open('https://checkout.pay4.work/pay/8225ce9ae788a702fa5b59717c8e3f81be3ec967c12083442f64affee27aa860', '_blank');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerUpiId.trim() || !customerEmail.trim() || !selectedProduct) return;
    
    setIsSubmitting(true);
    try {
      const productPriceNum = parseFloat(selectedProduct.price.replace(/[^0-9.]/g, '')) || 0;
      const discount = usePoints ? Math.min(currentUserData?.points || 0, productPriceNum) : 0;
      const finalPrice = productPriceNum - discount;
      
      const appliedPoints = usePoints ? discount : 0;
      const usedReferralCode = (!currentUserData?.hasUsedReferral && referralInput.trim()) ? referralInput.trim().toUpperCase() : null;

      if (usedReferralCode && currentUserData?.referralCode && usedReferralCode === currentUserData.referralCode) {
        alert("You cannot use your own referral code.");
        setIsSubmitting(false);
        return;
      }

      // Update user doc if using points or referral
      const userUpdates: any = {};
      if (appliedPoints > 0) userUpdates.points = increment(-appliedPoints);
      if (usedReferralCode) userUpdates.hasUsedReferral = true;

      if (Object.keys(userUpdates).length > 0 && auth.currentUser) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), userUpdates);
      }

      await addDoc(collection(db, 'orders'), {
        product_id: selectedProduct.id,
        product_title: selectedProduct.title,
        product_price: selectedProduct.price,
        originalPrice: productPriceNum,
        finalPrice: finalPrice,
        appliedPoints: appliedPoints,
        usedReferralCode: usedReferralCode,
        customer_upi_id: customerUpiId,
        payment_method: paymentMethod,
        email: customerEmail,
        userId: auth.currentUser?.uid || null,
        userEmail: auth.currentUser?.email || null,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setOrderSuccess(true);
    } catch (err) {
      console.error('Failed to submit order', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: string) => {
    if (!price) return '';
    if (price.includes('₹')) return price;
    if (price.includes('$')) return price.replace('$', '₹');
    return `₹${price}`;
  };

  if (!settings) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: `${settings.primary_color || '#b91c1c'}10` }}>
      <style>{`
        .theme-text { color: ${settings.primary_color || '#b91c1c'}; }
        .theme-text-light { color: ${settings.primary_color || '#b91c1c'}b3; }
        .theme-bg { background-color: ${settings.primary_color || '#b91c1c'}; }
        .theme-bg-light { background-color: ${settings.primary_color || '#b91c1c'}1a; }
        .theme-bg-lighter { background-color: ${settings.primary_color || '#b91c1c'}0d; }
        .theme-border { border-color: ${settings.primary_color || '#b91c1c'}; }
        .theme-border-light { border-color: ${settings.primary_color || '#b91c1c'}33; }
        .theme-ring:focus { --tw-ring-color: ${settings.primary_color || '#b91c1c'}; border-color: ${settings.primary_color || '#b91c1c'}; }
      `}</style>
      {/* Hero Section with Background */}
      <div 
        className="relative h-80 bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: `url(${settings.bg_image_url})` }}
      >
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative z-10 text-center text-white flex flex-col items-center">
          {settings.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="w-24 h-24 rounded-full border-4 border-white mb-4 object-cover" referrerPolicy="no-referrer" />
          )}
          <h1 className="text-5xl font-bold tracking-tight">{settings.site_title}</h1>
        </div>
      </div>

      {/* Products Grid */}
      <div 
        className="relative min-h-[calc(100vh-20rem)] bg-cover bg-center bg-fixed"
        style={settings.products_bg_image_url ? { backgroundImage: `url(${settings.products_bg_image_url})` } : {}}
      >
        {settings.products_bg_image_url && <div className="absolute inset-0 bg-black/80"></div>}
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8">
            <h2 className="text-3xl font-bold" style={{ color: settings?.primary_color || '#b91c1c' }}>{t('shop.title')}</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <LanguageSwitcher />
              <Link to="/about" className="text-xs sm:text-sm font-medium text-white hover:text-gray-200 transition-colors px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-900 hover:bg-gray-800 backdrop-blur-sm rounded-xl shadow-sm border border-gray-800">
                {t('nav.about')}
              </Link>
              <Link to="/reviews" className="text-xs sm:text-sm font-medium text-white hover:text-gray-200 transition-colors px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-900 hover:bg-gray-800 backdrop-blur-sm rounded-xl shadow-sm border border-gray-800">
                {t('nav.reviews')}
              </Link>
              <button 
                onClick={() => setShowMyOrders(true)}
                className="text-xs sm:text-sm font-medium text-white hover:text-gray-200 transition-colors px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-900 hover:bg-gray-800 backdrop-blur-sm rounded-xl shadow-sm border border-gray-800 flex items-center gap-2"
              >
                <Package size={16} />
                My Orders
              </button>
              <button 
                onClick={() => setShowProfile(true)}
                className="text-xs sm:text-sm font-medium text-white hover:text-gray-200 transition-colors px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-900 hover:bg-gray-800 backdrop-blur-sm rounded-xl shadow-sm border border-gray-800 flex items-center gap-2"
              >
                <User size={16} />
                Profile
              </button>
              <button 
                onClick={() => signOut(auth)}
                className="p-1.5 sm:p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 hover:text-red-300 rounded-full transition-colors shadow-sm border border-red-900/30" 
                title="Logout"
              >
                <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center theme-text-light py-12">{t('shop.noproducts')}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.map(product => (
                <div key={product.id} className="bg-gray-900 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-800 flex flex-col">
                  <div className="aspect-w-1 aspect-h-1 w-full bg-gray-800 relative">
                    <img 
                      src={product.image_url} 
                      alt={product.title} 
                      className={`w-full h-64 object-cover ${product.outOfStock ? 'opacity-50 grayscale' : ''}`}
                      referrerPolicy="no-referrer"
                    />
                    {product.outOfStock && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-red-600/90 text-white px-6 py-2 rounded-xl font-black text-xl tracking-widest transform -rotate-12 border-4 border-white shadow-2xl backdrop-blur-sm">
                          OUT OF STOCK
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-lg font-semibold text-white mb-2">{product.title}</h3>
                    <p className="text-xl font-bold text-emerald-600 mb-6">{formatPrice(product.price)}</p>
                    <div className="mt-auto">
                      <button 
                        onClick={(e) => handleBuyClick(product, e)}
                        disabled={product.outOfStock}
                        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-colors font-medium border ${product.outOfStock ? 'bg-gray-700 text-gray-400 border-gray-700 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700 border-green-600'}`}
                      >
                        <ShoppingCart size={18} />
                        {product.outOfStock ? 'Out of Stock' : t('shop.buynow')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border theme-border-light">
            <button 
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold theme-text mb-6 flex items-center gap-2">
              <User size={24} />
              My Profile
            </h2>
            
            {currentUserData ? (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-sm text-gray-500 mb-1">Email / User ID</p>
                  <p className="font-medium text-gray-900">{currentUserData.email}</p>
                </div>
                
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <p className="text-sm text-emerald-600 mb-1">Your Referral Code</p>
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold font-mono tracking-wider text-emerald-700">
                      {currentUserData.referralCode || 'N/A'}
                    </p>
                  </div>
                  <p className="text-xs text-emerald-600 mt-2">Share this code with friends. When they use it on their first purchase, you earn 200 points!</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-blue-600 mb-1">Points Balance</p>
                  <p className="text-3xl font-bold text-blue-700">{currentUserData.points || 0}</p>
                  <p className="text-xs text-blue-600 mt-1">1 Point = ₹1 Discount on your next purchase.</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">Loading profile data...</div>
            )}
          </div>
        </div>
      )}

      {/* My Orders Modal */}
      {showMyOrders && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl relative border theme-border-light">
            <button 
              onClick={() => setShowMyOrders(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold theme-text mb-6 flex items-center gap-2">
              <Package size={24} />
              My Orders
            </h2>
            
            {myOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">You haven't placed any orders yet.</div>
            ) : (
              <div className="space-y-4">
                {myOrders.map(order => (
                  <div key={order.id} className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{order.product_title}</h3>
                      <p className="text-sm text-gray-500">Price: {formatPrice(order.product_price)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-700 border border-green-200' : 
                        order.status === 'rejected' ? 'bg-red-100 text-red-700 border border-red-200' : 
                        'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      }`}>
                        {order.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b theme-border-light flex justify-between items-center theme-bg-lighter">
              <h3 className="text-xl font-bold theme-text">{t('modal.title')}</h3>
              <button 
                onClick={() => setSelectedProduct(null)}
                className="p-2 theme-text-light hover:theme-text hover:theme-bg-light rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {orderSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingCart size={32} />
                  </div>
                  <h4 className="text-2xl font-bold theme-text mb-2">{t('modal.success.title')}</h4>
                  <p className="theme-text-light mb-4">
                    {t('modal.success.desc')}
                  </p>
                  
                  {auth.currentUser?.email && (
                    <div className="bg-blue-50 text-blue-800 p-3 rounded-xl border border-blue-100 text-sm mb-8">
                      Your request is linked to User ID: <strong>{auth.currentUser.email}</strong>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => {
                        setSelectedProduct(null);
                        setShowMyOrders(true);
                      }}
                      className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors border border-gray-900 flex items-center justify-center gap-2"
                    >
                      <Package size={18} />
                      View My Orders
                    </button>
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors border border-green-600"
                    >
                      {t('modal.success.btn')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Order Summary */}
                  <div className="theme-bg-light p-4 rounded-2xl border theme-border-light flex items-center gap-4">
                    <img src={selectedProduct.image_url} alt={selectedProduct.title} className="w-16 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                    <div>
                      <div className="font-medium theme-text">{selectedProduct.title}</div>
                      <div className="text-emerald-600 font-bold">{formatPrice(selectedProduct.price)}</div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="text-center space-y-4">
                    <p className="text-sm theme-text-light">{t('modal.pay.desc')}</p>
                    
                    <div className="theme-bg-light border theme-border-light theme-text p-3 rounded-xl text-sm font-medium text-left leading-relaxed space-y-2">
                      <p>⚠️ <strong>Important:</strong> Please send the exact amount. If the paid amount does not match the product price, your payment will not be confirmed.</p>
                      <p>⚠️ <strong>Внимание:</strong> Пожалуйста, отправьте точную сумму. Если оплаченная сумма не совпадает с ценой товара, ваш платеж не будет подтвержден.</p>
                    </div>

                    {/* Payment Method Tabs */}
                    <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${paymentMethod === 'upi' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                        UPI
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bitcoin')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${paymentMethod === 'bitcoin' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                      >
                        Bitcoin
                      </button>
                    </div>
                    
                    {paymentMethod === 'upi' ? (
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Scan QR to pay via UPI</p>
                        {settings.qr_image_url ? (
                          <img src={settings.qr_image_url} alt="UPI QR Code" className="w-48 h-48 rounded-2xl border-2 theme-border-light shadow-sm bg-white p-2 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400">No QR</div>
                        )}
                        {settings.upi_id && (
                          <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-800 font-mono text-sm font-medium break-all">
                            {settings.upi_id}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Scan QR to pay via Bitcoin</p>
                        {settings.bitcoin_qr_image_url ? (
                          <img src={settings.bitcoin_qr_image_url} alt="Bitcoin QR Code" className="w-48 h-48 rounded-2xl border-2 theme-border-light shadow-sm bg-white p-2 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center text-gray-400">No QR</div>
                        )}
                        {settings.bitcoin_id && (
                          <div className="mt-4 bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-4 py-2 rounded-xl border border-orange-100 dark:border-orange-800 font-mono text-xs font-medium break-all">
                            {settings.bitcoin_id}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Discount & Referral */}
                  <div className="space-y-4 pt-4 border-t theme-border-light">
                    {(currentUserData?.points || 0) > 0 && (
                      <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <input 
                          type="checkbox" 
                          id="usePoints" 
                          checked={usePoints}
                          onChange={(e) => setUsePoints(e.target.checked)}
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="usePoints" className="text-sm font-medium text-blue-800 cursor-pointer">
                          Use Points Balance ({currentUserData.points} available)
                        </label>
                      </div>
                    )}

                    {!currentUserData?.hasUsedReferral && (
                      <div>
                        <label className="block text-sm font-medium theme-text mb-2">
                          Referral Code (Optional)
                        </label>
                        <input 
                          type="text" 
                          value={referralInput}
                          onChange={(e) => setReferralInput(e.target.value)}
                          placeholder="Enter code here"
                          className="w-full px-4 py-3 border theme-border-light rounded-xl theme-ring outline-none transition-all theme-text uppercase font-mono"
                        />
                        <p className="text-xs theme-text-light mt-1">Can only be used once per account.</p>
                      </div>
                    )}

                    {usePoints && (
                      <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex justify-between items-center">
                        <span className="text-sm font-medium text-green-800">Final Price to Pay:</span>
                        <span className="text-lg font-bold text-green-700">
                          {formatPrice(Math.max(0, (parseFloat(selectedProduct.price.replace(/[^0-9.]/g, '')) || 0) - (currentUserData?.points || 0)).toString())}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Confirmation Form */}
                  <form onSubmit={handlePaymentSubmit} className="pt-4 border-t theme-border-light space-y-4">
                    <div>
                      <label className="block text-sm font-medium theme-text mb-2">
                        {t('modal.form.email')}
                      </label>
                      <input 
                        type="email" 
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="e.g., yourname@gmail.com"
                        className="w-full px-4 py-3 border theme-border-light rounded-xl theme-ring outline-none transition-all theme-text"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium theme-text mb-2">
                        {paymentMethod === 'upi' ? t('modal.form.upi') : 'Bitcoin Transaction Hash / Sender Address'}
                      </label>
                      <input 
                        type="text" 
                        required
                        value={customerUpiId}
                        onChange={(e) => setCustomerUpiId(e.target.value)}
                        placeholder={paymentMethod === 'upi' ? "e.g., yourname@upi" : "e.g., 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"}
                        className="w-full px-4 py-3 border theme-border-light rounded-xl theme-ring outline-none transition-all theme-text"
                      />
                      <p className="text-xs theme-text-light mt-2">
                        {paymentMethod === 'upi' ? t('modal.form.upi.desc') : 'Enter the transaction hash or your wallet address to verify payment.'}
                      </p>
                    </div>
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !customerUpiId.trim() || !customerEmail.trim()}
                      className="w-full bg-green-600 text-white py-3.5 rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2 border border-green-600"
                    >
                      {isSubmitting ? t('modal.form.submitting') : t('modal.form.submit')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
