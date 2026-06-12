document.addEventListener('DOMContentLoaded', () => {
  /* ── 1. THEME TOGGLE ─────────────────────────────────── */
  const themeToggle = document.getElementById('themeToggle');
  const htmlEl = document.documentElement;
  
  // Check local storage or system preference
  const savedTheme = localStorage.getItem('holetec_theme');
  if (savedTheme) {
    htmlEl.setAttribute('data-theme', savedTheme);
  } else {
    // Default to dark as per design
    htmlEl.setAttribute('data-theme', 'dark');
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = htmlEl.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      htmlEl.setAttribute('data-theme', newTheme);
      localStorage.setItem('holetec_theme', newTheme);
    });
  }

  /* ── 2. SCROLL HEADER ────────────────────────────────── */
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  /* ── 3. MOBILE MENU ──────────────────────────────────── */
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('navMenu');

  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      hamburger.classList.toggle('active');
    });
  }

  /* ── 4. SCROLL ANIMATIONS (Fade Up) ──────────────────── */
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-up').forEach(el => {
    observer.observe(el);
  });

  /* ── 5. LANGUAGE SWITCHER ────────────────────────────── */
  const langBtn = document.getElementById('langBtn');
  const langDropdown = document.getElementById('langDropdown');
  const langFlag = document.getElementById('langFlag');
  const langCode = document.getElementById('langCode');
  const langOptions = document.querySelectorAll('.lang-option');

  let currentLang = localStorage.getItem('holetec_lang') || 'fi';

  // Make sure translations object is available (from translations.js)
  if (typeof translations !== 'undefined' && typeof langMeta !== 'undefined') {
    
    const applyTranslations = (lang) => {
      const dict = translations[lang];
      if (!dict) return;

      // Update text nodes
      document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
          // If it's a placeholder (for inputs)
          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            el.placeholder = dict[key];
          } else {
            el.textContent = dict[key];
          }
        }
      });

      // Update HTML nodes (if need line breaks etc.)
      document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (dict[key]) {
          el.innerHTML = dict[key].replace(/\n/g, '<br>');
        }
      });

      // Update document language
      htmlEl.setAttribute('lang', lang);

      // Update the toggle button
      if (langFlag && langCode) {
        langFlag.textContent = langMeta[lang].flag;
        langCode.textContent = langMeta[lang].code;
      }

      // Update active state in dropdown
      langOptions.forEach(opt => {
        if (opt.getAttribute('data-lang') === lang) {
          opt.classList.add('active');
        } else {
          opt.classList.remove('active');
        }
      });
    };

    // Initial apply
    applyTranslations(currentLang);

    // Toggle dropdown
    if (langBtn && langDropdown) {
      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const expanded = langBtn.getAttribute('aria-expanded') === 'true';
        langBtn.setAttribute('aria-expanded', !expanded);
        langDropdown.classList.toggle('open');
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        langBtn.setAttribute('aria-expanded', 'false');
        langDropdown.classList.remove('open');
      });
    }

    // Handle language selection
    langOptions.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selectedLang = e.target.getAttribute('data-lang');
        currentLang = selectedLang;
        localStorage.setItem('holetec_lang', selectedLang);
        applyTranslations(selectedLang);
      });
    });
  }

  /* ── 6. FORM HANDLING (Yhteystiedot) ─────────────────── */
  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // Usually you would send data to a backend here.
      // For now, just show the success message.
      
      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      
      submitBtn.textContent = 'Lähetetään...';
      submitBtn.disabled = true;

      setTimeout(() => {
        contactForm.reset();
        contactForm.style.display = 'none';
        formSuccess.style.display = 'block';
      }, 1000);
    });
  }
});
