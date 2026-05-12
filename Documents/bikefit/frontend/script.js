// ===== API CONFIG =====
// Change this to your actual API URL when deployed on the Pi
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8001'
  : 'https://api.coachonurai.com';
const API_URL = `${API_BASE}/analyze/`;

// ===== I18N TRANSLATIONS =====
const translations = {
  en: {
    heroTitle: 'Professional <span>Bike Fit</span> Analysis<br>Powered by AI',
    heroSub: 'Real-time AI analysis of your cycling position. Optimize performance and prevent injury.',
    camTitle: 'Live Camera',
    resultsTitle: 'Analysis Results',
    placeholderText: 'Click "Start Camera" to begin',
    btnStart: 'Start Camera',
    btnAnalyze: 'Analyze Now',
    btnStop: 'Stop',
    liveModeLabel: '🔴 Live Mode — continuous analysis',
    idleText: 'Start the camera and click Analyze to see your position feedback.',
    loadingText: 'Analyzing your position…',
    labelKnee: 'Knee Angle',
    labelHip: 'Hip Angle',
    labelElbow: 'Elbow Angle',
    labelTorso: 'Torso Angle',
    labelAnkle: 'Ankle Angle',
    scoreLabel: 'Overall Score',
    f1Title: 'Real-Time AI', f1Desc: 'Computer vision analysis using MediaPipe Pose',
    f2Title: 'Instant Feedback', f2Desc: 'Know exactly what to adjust and how much',
    f3Title: '6 Languages', f3Desc: 'Available in EN, TR, ES, RU, IT and DE',
    footer: '© 2025 BikeFit AI · Powered by coachonurai.com',
    errNoPose: 'No pose detected. Make sure your full body is visible from the side.',
    errCamera: 'Camera access denied. Please allow camera permission.',
    idealPos: 'Ideal ✓',
    lowerSaddle: 'Lower Saddle',
    raiseSaddle: 'Raise Saddle',
    lowerHandlebars: 'Lower Handlebars',
    raiseHandlebars: 'Raise Handlebars',
    moveSaddleBack: 'Move Saddle Back',
    moveSaddleForward: 'Move Saddle Forward',
    bendElbows: 'Bend Elbows',
    straightenElbows: 'Straighten Elbows',
    dropHeel: 'Drop Heel',
    raiseHeel: 'Raise Heel',
  },
  tr: {
    heroTitle: 'Yapay Zeka Destekli<br>Profesyonel <span>Bisiklet Fit</span> Analizi',
    heroSub: 'Bisiklet pozisyonunuzun gerçek zamanlı yapay zeka analizi. Performansı artırın, sakatlıkları önleyin.',
    camTitle: 'Canlı Kamera',
    resultsTitle: 'Analiz Sonuçları',
    placeholderText: 'Başlamak için "Kamera Başlat"a tıklayın',
    btnStart: 'Kamera Başlat',
    btnAnalyze: 'Analiz Et',
    btnStop: 'Durdur',
    liveModeLabel: '🔴 Canlı Mod — sürekli analiz',
    idleText: 'Kamerayı başlatın ve pozisyon geri bildiriminizi görmek için Analiz Et\'e tıklayın.',
    loadingText: 'Pozisyon analiz ediliyor…',
    labelKnee: 'Diz Açısı',
    labelHip: 'Kalça Açısı',
    labelElbow: 'Dirsek Açısı',
    labelTorso: 'Gövde Açısı',
    labelAnkle: 'Ayak Bileği Açısı',
    scoreLabel: 'Genel Puan',
    f1Title: 'Gerçek Zamanlı AI', f1Desc: 'MediaPipe Pose kullanan bilgisayarlı görme analizi',
    f2Title: 'Anında Geri Bildirim', f2Desc: 'Tam olarak ne ayarlamanız gerektiğini bilin',
    f3Title: '6 Dil', f3Desc: 'TR, EN, ES, RU, IT ve DE dillerinde mevcut',
    footer: '© 2025 BikeFit AI · coachonurai.com tarafından',
    errNoPose: 'Poz tespit edilemedi. Tam vücudunuzun yandan görünür olduğundan emin olun.',
    errCamera: 'Kamera erişimi reddedildi. Lütfen izin verin.',
    idealPos: 'İdeal ✓',
    lowerSaddle: 'Seleyi Alçalt',
    raiseSaddle: 'Seleyi Yükselt',
    lowerHandlebars: 'Gidonu Alçalt',
    raiseHandlebars: 'Gidonu Yükselt',
    moveSaddleBack: 'Seleyi Geri Çek',
    moveSaddleForward: 'Seleyi İleri Al',
    bendElbows: 'Dirsekleri Bük',
    straightenElbows: 'Dirsekleri Düzelt',
    dropHeel: 'Topuğu Düşür',
    raiseHeel: 'Topuğu Kaldır',
  },
  es: {
    heroTitle: 'Análisis Profesional de <span>Bike Fit</span><br>con Inteligencia Artificial',
    heroSub: 'Análisis de posición ciclista en tiempo real con IA. Optimiza el rendimiento y previene lesiones.',
    camTitle: 'Cámara en Vivo',
    resultsTitle: 'Resultados del Análisis',
    placeholderText: 'Haz clic en "Iniciar Cámara" para comenzar',
    btnStart: 'Iniciar Cámara',
    btnAnalyze: 'Analizar',
    btnStop: 'Detener',
    liveModeLabel: '🔴 Modo Vivo — análisis continuo',
    idleText: 'Inicia la cámara y haz clic en Analizar para ver tu retroalimentación de posición.',
    loadingText: 'Analizando tu posición…',
    labelKnee: 'Ángulo de Rodilla',
    labelHip: 'Ángulo de Cadera',
    labelElbow: 'Ángulo de Codo',
    labelTorso: 'Ángulo de Torso',
    labelAnkle: 'Ángulo de Tobillo',
    scoreLabel: 'Puntuación General',
    f1Title: 'IA en Tiempo Real', f1Desc: 'Análisis de visión computacional con MediaPipe Pose',
    f2Title: 'Retroalimentación Instantánea', f2Desc: 'Sabe exactamente qué ajustar',
    f3Title: '5 Idiomas', f3Desc: 'Disponible en ES, EN, TR, RU e IT',
    footer: '© 2025 BikeFit AI · Impulsado por coachonurai.com',
    errNoPose: 'No se detectó postura. Asegúrate de que tu cuerpo completo sea visible de lado.',
    errCamera: 'Acceso a cámara denegado. Por favor permite el acceso.',
    idealPos: 'Ideal ✓',
    lowerSaddle: 'Bajar Sillín',
    raiseSaddle: 'Subir Sillín',
    lowerHandlebars: 'Bajar Manillar',
    raiseHandlebars: 'Subir Manillar',
    moveSaddleBack: 'Sillín Atrás',
    moveSaddleForward: 'Sillín Adelante',
    bendElbows: 'Doblar Codos',
    straightenElbows: 'Enderezar Codos',
    dropHeel: 'Bajar Talón',
    raiseHeel: 'Subir Talón',
  },
  ru: {
    heroTitle: 'Профессиональный анализ<br><span>посадки</span> на велосипеде с ИИ',
    heroSub: 'Анализ позиции при езде в реальном времени. Оптимизируйте производительность и предотвратите травмы.',
    camTitle: 'Прямая трансляция',
    resultsTitle: 'Результаты анализа',
    placeholderText: 'Нажмите «Включить камеру», чтобы начать',
    btnStart: 'Включить камеру',
    btnAnalyze: 'Анализировать',
    btnStop: 'Стоп',
    liveModeLabel: '🔴 Живой режим — непрерывный анализ',
    idleText: 'Включите камеру и нажмите «Анализировать», чтобы получить обратную связь.',
    loadingText: 'Анализируем вашу позицию…',
    labelKnee: 'Угол колена',
    labelHip: 'Угол бедра',
    labelElbow: 'Угол локтя',
    labelTorso: 'Угол торса',
    labelAnkle: 'Угол голеностопа',
    scoreLabel: 'Общий балл',
    f1Title: 'ИИ в реальном времени', f1Desc: 'Анализ компьютерного зрения с MediaPipe Pose',
    f2Title: 'Мгновенная обратная связь', f2Desc: 'Точно знайте, что и как нужно исправить',
    f3Title: '5 языков', f3Desc: 'Доступно на RU, EN, TR, ES и IT',
    footer: '© 2025 BikeFit AI · На базе coachonurai.com',
    errNoPose: 'Поза не обнаружена. Убедитесь, что всё тело видно сбоку.',
    errCamera: 'Доступ к камере запрещён. Пожалуйста, разрешите доступ.',
    idealPos: 'Идеально ✓',
    lowerSaddle: 'Опустить седло',
    raiseSaddle: 'Поднять седло',
    lowerHandlebars: 'Опустить руль',
    raiseHandlebars: 'Поднять руль',
    moveSaddleBack: 'Седло назад',
    moveSaddleForward: 'Седло вперед',
    bendElbows: 'Согнуть локти',
    straightenElbows: 'Выпрямить локти',
    dropHeel: 'Опустить пятку',
    raiseHeel: 'Поднять пятку',
  },
  it: {
    heroTitle: 'Analisi Professionale di <span>Bike Fit</span><br>con Intelligenza Artificiale',
    heroSub: 'Analisi in tempo reale della tua posizione in bici. Ottimizza le prestazioni e previeni gli infortuni.',
    camTitle: 'Telecamera dal Vivo',
    resultsTitle: 'Risultati dell\'Analisi',
    placeholderText: 'Clicca su "Avvia Telecamera" per iniziare',
    btnStart: 'Avvia Telecamera',
    btnAnalyze: 'Analizza',
    btnStop: 'Ferma',
    liveModeLabel: '🔴 Modalità Live — analisi continua',
    idleText: 'Avvia la telecamera e clicca Analizza per vedere il feedback sulla tua posizione.',
    loadingText: 'Analisi della posizione in corso…',
    labelKnee: 'Angolo del Ginocchio',
    labelHip: 'Angolo dell\'Anca',
    labelElbow: 'Angolo del Gomito',
    labelTorso: 'Angolo del Torso',
    labelAnkle: 'Angolo della Caviglia',
    scoreLabel: 'Punteggio Generale',
    f1Title: 'IA in Tempo Reale', f1Desc: 'Analisi con visione artificiale tramite MediaPipe Pose',
    f2Title: 'Feedback Istantaneo', f2Desc: 'Sappi esattamente cosa e quanto regolare',
    f3Title: '5 Lingue', f3Desc: 'Disponibile in IT, EN, TR, ES e RU',
    footer: '© 2025 BikeFit AI · Powered by coachonurai.com',
    errNoPose: 'Nessuna posa rilevata. Assicurati che tutto il corpo sia visibile di lato.',
    errCamera: 'Accesso alla telecamera negato. Concedi il permesso.',
    idealPos: 'Ideale ✓',
    lowerSaddle: 'Abbassa Sella',
    raiseSaddle: 'Alza Sella',
    lowerHandlebars: 'Abbassa Manubrio',
    raiseHandlebars: 'Alza Manubrio',
    moveSaddleBack: 'Sella Indietro',
    moveSaddleForward: 'Sella Avanti',
    bendElbows: 'Piega Gomiti',
    straightenElbows: 'Raddrizza Gomiti',
    dropHeel: 'Abbassa Tallone',
    raiseHeel: 'Alza Tallone',
  },
  de: {
    heroTitle: 'Professionelle <span>Bike Fit</span> Analyse<br>mit Künstlicher Intelligenz',
    heroSub: 'Echtzeit-KI-Analyse deiner Radfahrposition. Optimiere die Leistung und beuge Verletzungen vor.',
    camTitle: 'Live-Kamera',
    resultsTitle: 'Analyseergebnisse',
    placeholderText: 'Klicke auf "Kamera starten" um zu beginnen',
    btnStart: 'Kamera starten',
    btnAnalyze: 'Jetzt analysieren',
    btnStop: 'Stopp',
    liveModeLabel: '🔴 Live-Modus — kontinuierliche Analyse',
    idleText: 'Starte die Kamera und klicke Analysieren, um dein Positions-Feedback zu sehen.',
    loadingText: 'Position wird analysiert…',
    labelKnee: 'Kniewinkel',
    labelHip: 'Hüftwinkel',
    labelElbow: 'Ellbogenwinkel',
    labelTorso: 'Rumpfwinkel',
    labelAnkle: 'Knöchelwinkel',
    scoreLabel: 'Gesamtpunktzahl',
    f1Title: 'Echtzeit-KI', f1Desc: 'Computer-Vision-Analyse mit MediaPipe Pose',
    f2Title: 'Sofortiges Feedback', f2Desc: 'Wisse genau, was und wie viel du anpassen musst',
    f3Title: '6 Sprachen', f3Desc: 'Verfügbar auf DE, EN, TR, ES, RU und IT',
    footer: '© 2025 BikeFit AI · Powered by coachonurai.com',
    errNoPose: 'Keine Pose erkannt. Stelle sicher, dass dein ganzer Körper seitlich sichtbar ist.',
    errCamera: 'Kamerazugriff verweigert. Bitte erlaube den Kamerazugriff.',
    idealPos: 'Ideal ✓',
    lowerSaddle: 'Sattel tiefer',
    raiseSaddle: 'Sattel höher',
    lowerHandlebars: 'Lenker tiefer',
    raiseHandlebars: 'Lenker höher',
    moveSaddleBack: 'Sattel zurück',
    moveSaddleForward: 'Sattel vor',
    bendElbows: 'Ellbogen beugen',
    straightenElbows: 'Ellbogen strecken',
    dropHeel: 'Ferse senken',
    raiseHeel: 'Ferse heben',
  }
};

const LANG_LABELS = { en: '🇬🇧 EN', tr: '🇹🇷 TR', es: '🇪🇸 ES', ru: '🇷🇺 RU', it: '🇮🇹 IT', de: '🇩🇪 DE' };

// ===== STATE =====
let currentLang = 'en';
let stream = null;
let liveInterval = null;
let isAnalyzing = false;

// ===== DOM REFS =====
const video = document.getElementById('video');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const btnStart = document.getElementById('btn-start-camera');
const btnAnalyze = document.getElementById('btn-analyze');
const btnStop = document.getElementById('btn-stop');
const liveModeToggle = document.getElementById('live-mode-toggle');
const paywallModal = document.getElementById('paywall-modal');
const btnCheckout = document.getElementById('btn-checkout');
const bikeTypeSelect = document.getElementById('bike-type-select');
const videoUploadInput = document.getElementById('video-upload-input');

// BLE DOM REFS
const btnConnectSensor = document.getElementById('btn-connect-sensor');
const valPower = document.getElementById('val-power');
const valCadence = document.getElementById('val-cadence');
const valSpeed = document.getElementById('val-speed');

// ===== LANGUAGE =====
function applyLang(lang) {
  currentLang = lang;
  const t = translations[lang];
  document.documentElement.lang = lang;

  document.getElementById('hero-title').innerHTML = t.heroTitle;
  document.getElementById('hero-sub').textContent = t.heroSub;
  document.getElementById('panel-camera-title').textContent = t.camTitle;
  document.getElementById('panel-results-title').textContent = t.resultsTitle;
  document.getElementById('placeholder-text').textContent = t.placeholderText;
  document.getElementById('btn-start-text').textContent = t.btnStart;
  document.getElementById('btn-analyze-text').textContent = t.btnAnalyze;
  document.getElementById('btn-stop-text').textContent = t.btnStop;
  document.getElementById('live-mode-label').textContent = t.liveModeLabel;
  document.getElementById('idle-text').textContent = t.idleText;
  document.getElementById('loading-text').textContent = t.loadingText;
  document.getElementById('label-knee').textContent = t.labelKnee;
  document.getElementById('label-hip').textContent = t.labelHip;
  document.getElementById('label-elbow').textContent = t.labelElbow;
  document.getElementById('label-torso').textContent = t.labelTorso;
  document.getElementById('label-ankle').textContent = t.labelAnkle;
  document.getElementById('score-label').textContent = t.scoreLabel;
  document.getElementById('f1-title').textContent = t.f1Title;
  document.getElementById('f1-desc').textContent = t.f1Desc;
  document.getElementById('f2-title').textContent = t.f2Title;
  document.getElementById('f2-desc').textContent = t.f2Desc;
  document.getElementById('f3-title').textContent = t.f3Title;
  document.getElementById('f3-desc').textContent = t.f3Desc;
  document.getElementById('footer-text').textContent = t.footer;

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

function buildLangBar() {
  const bar = document.getElementById('lang-bar');
  Object.entries(LANG_LABELS).forEach(([code, label]) => {
    const btn = document.createElement('button');
    btn.className = 'lang-btn';
    btn.textContent = label;
    btn.dataset.lang = code;
    btn.onclick = () => applyLang(code);
    bar.appendChild(btn);
  });
}

// ===== CAMERA =====
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    cameraPlaceholder.classList.add('hidden');
    btnStart.style.display = 'none';
    btnStop.style.display = '';
    btnAnalyze.disabled = false;
  } catch {
    showError(translations[currentLang].errCamera);
  }
}

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  video.srcObject = null;
  video.src = "";
  cameraPlaceholder.classList.remove('hidden');
  btnStart.style.display = '';
  btnStop.style.display = 'none';
  btnAnalyze.disabled = true;
  stopLiveMode();
}

// ===== CAPTURE FRAME =====
function captureBase64() {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext('2d').drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.85);
}

// ===== ANALYZE =====
async function analyze() {
  if (isAnalyzing || (!stream && !video.src)) return;
  isAnalyzing = true;
  showLoading();

  try {
    const base64 = captureBase64();
    const token = localStorage.getItem('bikefit_token');
    if (!token) {
      showPaywall();
      isAnalyzing = false;
      return;
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'access-token': token
      },
      body: JSON.stringify({ 
        image_base64: base64,
        bike_type: bikeTypeSelect.value
      })
    });

    if (response.status === 401) {
      localStorage.removeItem('bikefit_token');
      showPaywall();
      isAnalyzing = false;
      return;
    }

    const data = await response.json();

    if (data.error) {
      showError(translations[currentLang].errNoPose);
    } else {
      showResults(data);
    }
  } catch {
    showError(translations[currentLang].errNoPose);
  } finally {
    isAnalyzing = false;
  }
}

// ===== LIVE MODE =====
liveModeToggle.addEventListener('change', () => {
  if (liveModeToggle.checked) {
    if (!stream && !video.src) { liveModeToggle.checked = false; return; }
    liveInterval = setInterval(analyze, 1500);
  } else {
    stopLiveMode();
  }
});

function stopLiveMode() {
  if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
  liveModeToggle.checked = false;
}

// ===== UI STATES =====
function showLoading() {
  document.getElementById('idle-state').style.display = 'none';
  document.getElementById('results-list').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
  document.getElementById('loading-state').style.display = '';
}

function showError(msg) {
  document.getElementById('idle-state').style.display = 'none';
  document.getElementById('results-list').style.display = 'none';
  document.getElementById('loading-state').style.display = 'none';
  const el = document.getElementById('error-state');
  el.style.display = '';
  document.getElementById('error-text').textContent = msg;
}

function showPaywall() {
  stopCamera();
  paywallModal.style.display = 'flex';
}

function hidePaywall() {
  paywallModal.style.display = 'none';
}

// ===== RENDER RESULTS =====
function feedbackClass(feedback) {
  if (!feedback) return 'warn';
  const lower = feedback.toLowerCase();
  if (lower.includes('ideal') || lower.includes('ideale') || lower.includes('идеал')) return 'good';
  return 'warn';
}

function angleToPercent(angle, min = 0, max = 180) {
  return Math.min(100, Math.max(0, ((angle - min) / (max - min)) * 100));
}

function translateFeedback(text) {
  const t = translations[currentLang];
  if (!text) return '—';
  const lower = text.toLowerCase();
  
  if (lower === 'ideal') return t.idealPos;
  if (lower === 'lower_saddle') return t.lowerSaddle;
  if (lower === 'raise_saddle') return t.raiseSaddle;
  if (lower === 'lower_handlebars') return t.lowerHandlebars;
  if (lower === 'raise_handlebars') return t.raiseHandlebars;
  if (lower === 'move_saddle_back') return t.moveSaddleBack;
  if (lower === 'move_saddle_forward') return t.moveSaddleForward;
  if (lower === 'bend_elbows') return t.bendElbows;
  if (lower === 'straighten_elbows') return t.straightenElbows;
  if (lower === 'drop_heel') return t.dropHeel;
  if (lower === 'raise_heel') return t.raiseHeel;

  // Fallback for old feedback if any
  if (lower.includes('ideal')) return t.idealPos;
  return text;
}

function renderAngle(key, angle, feedback) {
  const val = document.getElementById(`val-${key}`);
  const fb = document.getElementById(`fb-${key}`);
  const bar = document.getElementById(`bar-${key}`);
  const item = document.getElementById(`r-${key}`);
  const cls = feedbackClass(feedback);

  val.textContent = `${Math.round(angle)}°`;
  fb.textContent = translateFeedback(feedback);
  bar.style.width = angleToPercent(angle) + '%';
  bar.className = `result-bar ${cls}`;
  item.className = `result-item ${cls}`;
}

function showResults(data) {
  document.getElementById('idle-state').style.display = 'none';
  document.getElementById('loading-state').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
  document.getElementById('results-list').style.display = '';

  renderAngle('knee',  data.knee_angle,  data.knee_feedback);
  renderAngle('hip',   data.hip_angle,   data.hip_feedback);
  renderAngle('elbow', data.elbow_angle, data.elbow_feedback);
  renderAngle('torso', data.torso_angle, data.torso_feedback);
  renderAngle('ankle', data.ankle_angle, data.ankle_feedback);

  // Calculate score: count how many joints are "ideal"
  const feedbacks = [data.knee_feedback, data.hip_feedback, data.elbow_feedback, data.torso_feedback, data.ankle_feedback];
  const idealCount = feedbacks.filter(f => f && f.toLowerCase().includes('ideal')).length;
  const score = Math.round((idealCount / feedbacks.length) * 100);
  document.getElementById('score-value').textContent = `${score}%`;
}

// ===== EVENT LISTENERS =====
btnStart.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);
btnAnalyze.addEventListener('click', analyze);

// Handle Video Upload
if (videoUploadInput) {
  videoUploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (stream) stopCamera(); // Stop camera if running
      const url = URL.createObjectURL(file);
      video.src = url;
      video.loop = true;
      video.play();
      
      cameraPlaceholder.classList.add('hidden');
      btnStart.style.display = 'none';
      btnStop.style.display = '';
      btnAnalyze.disabled = false;
    }
  });
}

btnCheckout.addEventListener('click', async () => {
  btnCheckout.disabled = true;
  btnCheckout.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:auto"></div>';
  try {
    const res = await fetch(`${API_BASE}/create-checkout-session`, { method: 'POST' });
    const data = await res.json();
    if (data.checkout_url) {
      window.location.href = data.checkout_url;
    } else {
      alert("Error initiating checkout");
      btnCheckout.disabled = false;
      btnCheckout.textContent = "Unlock Now ($4.99)";
    }
  } catch (e) {
    alert("Payment system offline");
    btnCheckout.disabled = false;
    btnCheckout.textContent = "Unlock Now ($4.99)";
  }
});

// ===== INIT & TOKEN CHECK =====
async function initApp() {
  buildLangBar();
  applyLang('en');

  // Check URL for session_id from Stripe redirect
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  if (sessionId) {
    try {
      const res = await fetch(`${API_BASE}/verify-session/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('bikefit_token', data.access_token);
        alert("Payment successful! Premium features unlocked.");
      }
    } catch(e) {}
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

initApp();

// ===== BLUETOOTH SENSORS =====
let powerCharacteristic = null;
let cscCharacteristic = null;
let lastCscData = null;

if (btnConnectSensor) {
  btnConnectSensor.addEventListener('click', async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['cycling_power'] }, { services: ['cycling_speed_and_cadence'] }],
        optionalServices: ['cycling_power', 'cycling_speed_and_cadence']
      });

      btnConnectSensor.textContent = 'Connecting...';
      const server = await device.gatt.connect();

      try {
        const powerService = await server.getPrimaryService('cycling_power');
        powerCharacteristic = await powerService.getCharacteristic('cycling_power_measurement');
        powerCharacteristic.addEventListener('characteristicvaluechanged', handlePowerData);
        await powerCharacteristic.startNotifications();
      } catch(e) { console.log('No power service', e); }

      try {
        const cscService = await server.getPrimaryService('cycling_speed_and_cadence');
        cscCharacteristic = await cscService.getCharacteristic('csc_measurement');
        cscCharacteristic.addEventListener('characteristicvaluechanged', handleCscData);
        await cscCharacteristic.startNotifications();
      } catch(e) { console.log('No CSC service', e); }

      btnConnectSensor.textContent = 'Connected ✓';
      btnConnectSensor.classList.add('btn-success');
      btnConnectSensor.classList.remove('btn-primary');
    } catch (error) {
      console.error('BLE Connection error', error);
      alert('Could not connect to sensor. Please ensure Bluetooth is enabled.');
      btnConnectSensor.textContent = 'Connect BLE';
    }
  });
}

function handlePowerData(event) {
  const value = event.target.value;
  // Cycling Power Measurement format: Flags (16bit), Power (16bit sint)
  const power = value.getInt16(2, true);
  if (valPower) valPower.innerHTML = `${power}<span class="unit">W</span>`;
}

function handleCscData(event) {
  const value = event.target.value;
  const flags = value.getUint8(0);
  const hasWheel = flags & 0x01;
  const hasCrank = flags & 0x02;
  
  let offset = 1;
  let wheelRevs = 0, wheelTime = 0, crankRevs = 0, crankTime = 0;
  
  if (hasWheel) {
    wheelRevs = value.getUint32(offset, true); offset += 4;
    wheelTime = value.getUint16(offset, true); offset += 2;
  }
  if (hasCrank) {
    crankRevs = value.getUint16(offset, true); offset += 2;
    crankTime = value.getUint16(offset, true);
  }

  if (lastCscData) {
    if (hasCrank) {
      let timeDiff = crankTime - lastCscData.crankTime;
      if (timeDiff < 0) timeDiff += 65536;
      let revDiff = crankRevs - lastCscData.crankRevs;
      if (revDiff < 0) revDiff += 65536;
      
      if (timeDiff > 0) {
        const rpm = Math.round((revDiff / timeDiff) * 1024 * 60);
        if (rpm >= 0 && rpm < 250 && valCadence) {
           valCadence.innerHTML = `${rpm}<span class="unit">RPM</span>`;
        }
      }
    }
    
    if (hasWheel) {
       let timeDiff = wheelTime - lastCscData.wheelTime;
       if (timeDiff < 0) timeDiff += 65536;
       let revDiff = wheelRevs - lastCscData.wheelRevs;
       if (revDiff < 0) revDiff += 4294967296;
       
       if (timeDiff > 0) {
          const CIRCUMFERENCE = 2.1; // meters
          const speedMpS = (revDiff * CIRCUMFERENCE) / (timeDiff / 1024);
          const speedKph = Math.round(speedMpS * 3.6 * 10) / 10;
          if (speedKph >= 0 && speedKph < 120 && valSpeed) {
             valSpeed.innerHTML = `${speedKph}<span class="unit">km/h</span>`;
          }
       }
    }
  }
  
  lastCscData = { wheelRevs, wheelTime, crankRevs, crankTime };
}
