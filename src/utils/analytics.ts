
// Google Analytics utility functions
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Initialize Google Analytics
export const initGA = (measurementId: string) => {
  if (typeof window === 'undefined' || !measurementId || measurementId === 'GA_MEASUREMENT_ID') {
    return;
  }

  // Create script tag for gtag
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: true,
  });
};

// Track page views
export const trackPageView = (path: string, title?: string) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('config', import.meta.env.VITE_GOOGLE_ANALYTICS_ID, {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.origin + path,
  });
};

// Track custom events
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Track music mixing events
export const trackMixingEvent = (action: 'project_created' | 'stems_uploaded' | 'mix_completed' | 'mix_downloaded', projectId?: string) => {
  trackEvent(action, 'Music Mixing', projectId);
};

// Track user registration
export const trackRegistration = (method: string = 'email') => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'sign_up', {
    method: method,
  });
};

// Track user login
export const trackLogin = (method: string = 'email') => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'login', {
    method: method,
  });
};

// Track purchases/subscriptions
export const trackPurchase = (transactionId: string, value: number, currency: string = 'USD', items?: any[]) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    items: items || [],
  });
};

// Track subscription events
export const trackSubscription = (planName: string, value: number, currency: string = 'USD') => {
  trackEvent('subscribe', 'Subscription', planName, value);
  
  // Also track as purchase for e-commerce tracking
  trackPurchase(`sub_${Date.now()}`, value, currency, [
    {
      item_id: planName.toLowerCase().replace(/\s+/g, '_'),
      item_name: planName,
      category: 'Subscription',
      quantity: 1,
      price: value,
    },
  ]);
};

// Track form submissions
export const trackFormSubmission = (formName: string) => {
  trackEvent('form_submit', 'Form', formName);
};

// Track file uploads
export const trackFileUpload = (fileType: string, fileCount: number) => {
  trackEvent('file_upload', 'Audio', fileType, fileCount);
};

// Track audio playback
export const trackAudioPlay = (trackName: string, duration?: number) => {
  trackEvent('audio_play', 'Media', trackName, duration);
};

// Track feature usage
export const trackFeatureUsage = (featureName: string, action: string) => {
  trackEvent(action, 'Feature', featureName);
};

// Track errors
export const trackError = (errorType: string, errorMessage: string) => {
  trackEvent('exception', 'Error', `${errorType}: ${errorMessage}`);
};

// Track performance metrics
export const trackPerformance = (metricName: string, value: number) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'timing_complete', {
    name: metricName,
    value: Math.round(value),
  });
};

// Track user engagement
export const trackEngagement = (engagementTime: number) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'user_engagement', {
    engagement_time_msec: engagementTime,
  });
};

// Track search queries
export const trackSearch = (searchTerm: string, resultsCount?: number) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'search', {
    search_term: searchTerm,
    ...(resultsCount !== undefined && { results_count: resultsCount }),
  });
};

// Track social sharing
export const trackShare = (contentType: string, contentId: string, method: string) => {
  if (typeof window === 'undefined' || !window.gtag) {
    return;
  }

  window.gtag('event', 'share', {
    content_type: contentType,
    content_id: contentId,
    method: method,
  });
};
