import React, { createContext, useState, useContext, ReactNode } from 'react';

type Language = 'en' | 'ru';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    'nav.about': 'About Us',
    'nav.reviews': 'Reviews',
    'nav.cart': 'Cart',
    'nav.admin': 'Admin Login',
    'shop.title': 'Our Products',
    'shop.noproducts': 'No products available yet.',
    'shop.buynow': 'Buy Now',
    'modal.title': 'Complete Payment',
    'modal.success.title': 'Request Sent!',
    'modal.success.desc': 'Your payment request has been sent to the admin. We will process your order once the payment is confirmed.',
    'modal.success.btn': 'Continue Shopping',
    'modal.pay.desc': 'Please pay using the details below:',
    'modal.form.email': 'Your Gmail / Email (Required)',
    'modal.form.upi': 'Your UPI ID / Payment Ref (Required)',
    'modal.form.upi.desc': 'Please enter the UPI ID from which you made the payment so we can verify it.',
    'modal.form.submit': 'I have made the payment',
    'modal.form.submitting': 'Submitting...',
    'about.back': 'Back to Shop',
    'about.title': 'About Us',
    'reviews.title': 'Customer Reviews',
    'reviews.back': 'Back to Shop',
    'reviews.write': 'Write a Review',
    'reviews.form.code': 'Review Code',
    'reviews.form.code.desc': 'You need a valid code to submit a review.',
    'reviews.form.name': 'Your Name',
    'reviews.form.rating': 'Rating',
    'reviews.form.comment': 'Comment',
    'reviews.form.submit': 'Submit Review',
    'reviews.form.submitting': 'Submitting...',
    'reviews.recent': 'Recent Reviews',
    'reviews.noreviews': 'No reviews yet. Be the first to leave one!',
    'reviews.success': 'Thank you! Your review has been submitted.',
    'reviews.error.fields': 'All fields are required.',
    'reviews.error.code': 'Invalid or already used review code.',
    'reviews.error.general': 'An error occurred. Please try again.'
  },
  ru: {
    'nav.about': 'О нас',
    'nav.reviews': 'Отзывы',
    'nav.cart': 'Корзина',
    'nav.admin': 'Вход для админа',
    'shop.title': 'Наши продукты',
    'shop.noproducts': 'Пока нет доступных продуктов.',
    'shop.buynow': 'Купить сейчас',
    'modal.title': 'Завершить оплату',
    'modal.success.title': 'Запрос отправлен!',
    'modal.success.desc': 'Ваш запрос на оплату отправлен администратору. Мы обработаем ваш заказ после подтверждения оплаты.',
    'modal.success.btn': 'Продолжить покупки',
    'modal.pay.desc': 'Пожалуйста, оплатите по реквизитам ниже:',
    'modal.form.email': 'Ваш Gmail / Email (Обязательно)',
    'modal.form.upi': 'Ваш UPI ID / Номер платежа (Обязательно)',
    'modal.form.upi.desc': 'Пожалуйста, введите UPI ID, с которого вы произвели оплату, чтобы мы могли ее проверить.',
    'modal.form.submit': 'Я произвел оплату',
    'modal.form.submitting': 'Отправка...',
    'about.back': 'Вернуться в магазин',
    'about.title': 'О нас',
    'reviews.title': 'Отзывы клиентов',
    'reviews.back': 'Вернуться в магазин',
    'reviews.write': 'Написать отзыв',
    'reviews.form.code': 'Код отзыва',
    'reviews.form.code.desc': 'Вам нужен действительный код, чтобы оставить отзыв.',
    'reviews.form.name': 'Ваше имя',
    'reviews.form.rating': 'Оценка',
    'reviews.form.comment': 'Комментарий',
    'reviews.form.submit': 'Отправить отзыв',
    'reviews.form.submitting': 'Отправка...',
    'reviews.recent': 'Последние отзывы',
    'reviews.noreviews': 'Пока нет отзывов. Будьте первым!',
    'reviews.success': 'Спасибо! Ваш отзыв был отправлен.',
    'reviews.error.fields': 'Все поля обязательны для заполнения.',
    'reviews.error.code': 'Недействительный или уже использованный код отзыва.',
    'reviews.error.general': 'Произошла ошибка. Пожалуйста, попробуйте еще раз.'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
