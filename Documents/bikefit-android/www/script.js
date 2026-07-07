// Reverting to relative path for maximum stability via tunnel, but for Android we use absolute URL
const API_BASE = window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'https://bikefit.coachonurai.com/bikefit-api' 
    : '/bikefit-api';
const API_URL = `${API_BASE}/analyze/`;
console.log("System Initialized. Auto-Session Bridge Active.");

// ===== SESSION MANAGER (ANALYTICS) =====
class SessionManager {
  constructor() {
    this.sessionId = 'sess-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    this.events = [];
    this.lastFlush = Date.now();
    window.addEventListener('beforeunload', () => this.flushEvents());
  }

  trackEvent(eventName, data = {}) {
    this.events.push({ event: eventName, timestamp: Date.now(), data: data });
    if (this.events.length >= 5 || (Date.now() - this.lastFlush > 30000)) {
      this.flushEvents();
    }
  }

  flushEvents() {
    if (this.events.length === 0) return;
    const payload = { sessionId: this.sessionId, events: [...this.events] };
    this.events = [];
    this.lastFlush = Date.now();
    try {
      fetch(`${API_BASE}/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(e => console.error("Analytics failed", e));
    } catch (e) { console.error("Analytics error", e); }
  }
}
window.sessionManager = new SessionManager();
window.sessionManager.trackEvent('app_started', { url: window.location.href });

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
    footer: '© 2026 BikeFit AI • Operated by Onur Kapucu',
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
    shortenCrank: '💡 Shorten Crank (e.g. 165mm) for better aero & hip clearance',
    raiseHeel: 'Raise Heel',
    proWorkspace: 'Live Analysis Workspace',
    proPerformance: 'Performance Metrics',
    proPower: 'POWER',
    proCadence: 'CADENCE',
    proSpeed: 'SPEED',
    proAwaiting: 'Awaiting Inference...',
    proStartInference: 'Start analysis to generate biomechanical report',
    proConsistency: 'Fit Consistency Score',
    proRatio: 'Ratio',
    proBikeProfile: 'Bike Profile',
    proRoadBike: 'Professional Road',
    proTriBike: 'Triathlon / Aero',
    proRealTimeMode: 'Real-Time Continuous Mode',
    proReport: 'Biomechanical Session Report',
    tabExtension: 'Bottom Stroke (Max Extension)',
    tabFlexion: 'Top Stroke (Max Flexion)',
    reportKneeExt: 'Knee Extension',
    reportKneeFlex: 'Knee Flexion',
    reportHipAngle: 'Hip Angle',
    reportIdealSaddle: 'Ideal Saddle Height: Your knee extension of {angle}° is in the perfect biomechanical range (135°-145°). This ensures optimal power transfer and prevents joint strain.',
    reportHighSaddle: 'Saddle Too High / Overextension: Your knee extension of {angle}° is too large. This can cause hamstring strain, Achilles tendonitis, or lower back pain. We recommend lowering your saddle by 5-10mm.',
    reportLowSaddle: 'Saddle Too Low / Underextension: Your knee extension of {angle}° is too small. This places excessive pressure on your kneecap and reduces power. We recommend raising your saddle by 5-10mm.',
    reportIdealFlexion: 'Optimal Flexion: Your knee flexion of {angle}° is ideal, preventing excessive patellar compression at the top of the stroke.',
    reportAcuteFlexion: 'Acute Flexion: Your knee is bending too much ({angle}°) at the top of the stroke. Consider shorter crank arms (e.g., 165mm) or raising your saddle slightly.',
    reportInsufficientFlexion: 'Insufficient Flexion / Knee Too Open: Your knee flexion of {angle}° is too large at the top of the stroke. This is typically caused by a saddle that is too high or crank arms that are too short. Consider lowering your saddle by 5-10mm.',
    reportIdealHip: 'Excellent Hip Clearance: Your hip angle of {angle}° at the top is open enough, allowing easy breathing and optimal glute recruitment.',
    reportClosedHip: 'Closed Hip Angle: Your hip angle of {angle}° is too tight. This can pinch hip flexors and cause lower back pain. Try raising handlebars or moving the saddle forward slightly to open up the hip.',
    reportAwaitingPhotos: 'Biomechanical Session Report will be generated here once you complete a dynamic video analysis or capture multiple pedaling positions.',
    btnCalib: 'Calibrate Bike',
    calibFWheel: 'Click Front Wheel Center',
    calibRWheel: 'Click Rear Wheel Center',
    calibBB: 'Click Bottom Bracket (BB)',
    calibSaddle: 'Click Saddle Center',
    calibDone: 'Calibration Done!',
    calibReset: 'Click to Reset',
    pinFWheel: 'Front Wheel',
    pinRWheel: 'Rear Wheel',
    pinBB: 'Bottom Bracket',
    pinSaddle: 'Saddle',
    pinAssumed: 'Assumed Wheelbase',
    metricSaddle: 'SADDLE HEIGHT',
    metricKops: 'KOPS (Knee Over Pedal)',
    obTitle: 'Welcome to BikeFit AI',
    obSubtitle: 'Optimize your cycling performance and prevent injuries with professional-grade AI analysis.',
    obStep1T: '1. Upload or Live',
    obStep1D: 'Start your camera or upload a side-view video of your ride.',
    obStep2T: '2. Calibrate',
    obStep2D: 'Click the 📍 button. Mark your hubs, BB, and saddle for real-world cm measurements.',
    obStep3T: '3. Analyze',
    obStep3D: 'Get real-time feedback on your knee, hip, and torso angles.',
    obStep4T: '4. Optimize',
    obStep4D: 'Follow AI recommendations to adjust your saddle and cockpit.',
    obBtn: 'Get Started',
    hwTitle: 'How the AI Works',
    hwF1T: '📐 Biomechanical Precision',
    hwF1D: 'Our YOLOv8 AI tracks 17 key points on your body 30 times per second. We measure the critical "extension" of your knee at the bottom of the pedal stroke to ensure your saddle height is perfect, preventing knee pain and maximizing power.',
    hwF2T: '🏁 Pro Profiles',
    hwF2D: 'Choose between Road and Triathlon modes. Triathlon fitting focuses on a more aggressive aerodynamic profile and hip angle, while Road fitting balances comfort with power output.',
    hwF3T: '⚡ Live Telemetry',
    hwF3D: 'By connecting your Smart Trainer via Bluetooth, you can see your Power (Watts) and Cadence alongside your body angles, allowing you to see how position changes affect your efficiency.',
    hwF4T: '📍 Real-World Scaling',
    hwF4D: 'By clicking the "Calibrate" button and marking your wheels, BB, and saddle, the AI calculates your exact Saddle Height and KOPS in centimeters, giving you laboratory-level precision at home.',
    hwF5T: '⏱️ Analysis Modes',
    hwF5D: '<b>10s Delay:</b> Gives you 15s to get on the bike, then auto-analyzes for 30s. <br><br><b>Dynamic Tracking:</b> Tracks movement continuously during recording. <br><br><b>Real-Time:</b> Instant live feedback on screen without saving history.',
    hwStatsT: 'Optimal Angle Ranges',
    hwLKnee: 'Knee Extension',
    hwLHip: 'Hip Angle',
    hwLShoulder: 'Shoulder Angle',
    csTitle: 'Camera Setup Standards',
    csDesc: 'For the AI to accurately calculate your critical knee, hip, and shoulder angles, your camera setup is 100% vital.',
    csR1T: '1. Exact 90-Degree Side Profile',
    csR1D: 'The camera must be placed exactly 90 degrees to the side of the bike. Angles from the front or back distort perspective and break the biomechanical math.',
    csR2T: '2. Camera Height: Hip/Saddle Level',
    csR2D: 'The device must not be on the floor. The most accurate height is about 80-100 cm from the ground, level with your hips or the bike\'s saddle. Place your phone on a table or high chair.',
    csR3T: '3. Full Body & Bike Visible',
    csR3D: 'When the pedal is at its lowest point, your toe and the top of your head must fit in the frame. The handlebars and entire saddle must be visible. Place the camera 2-3 meters away.',
    csR4T: '4. Lighting & Backlight',
    csR4D: 'Avoid bright windows or strong lamps behind you (backlighting). If the background is too bright, you become a dark silhouette and points cannot be tracked. Light should come from the front or above.',
    csR5T: '5. Zero Shaking',
    csR5D: 'The camera must not move during recording. Handheld video is not suitable. Lean your phone/tablet against a solid surface or use a tripod.',
    navAnalysis: 'Analysis',
    navHow: 'How it Works',
    navSetup: 'Setup Guide',
    labelLearnMore: 'Get Started',
    btnBackTop: '↑ Back to Top',
    labelDelay: '15s Prep + 30s Auto-Analyze',
    tipTitle: '⚡ AI Video Scanning Tip',
    tipDesc: 'Keep your camera stable while filming. Ensure the cyclist doesn\'t pass out of frame; stationary trainer riding or camera-parallel side-view shots yield the highest biomechanical accuracy.',
    dynamicTracking: 'Dynamic AI Tracking (Moving Video)',
    triTorsoIdeal: 'Ideal Aero Flat Back ✓',
    triLowerHandlebars: 'Lower Cockpit (Flatter Aero Back)',
    triRaiseHandlebars: 'Raise Cockpit (Reduce Neck Strain)',
    triathlonAeroTips: '<strong>🏆 Premium Triathlon Aero Optimization:</strong><br>• <strong>Flat Body Back:</strong> A flatter, more horizontal back (torso angle ~20°-25°) reduces your frontal area, significantly cutting aerodynamic drag (CdA). This allows you to ride faster for the exact same power (Watts).<br>• <strong>Aerobar Extension Angle:</strong> Angling your extensions upward slightly by 10°-15° ("high hands" position) is highly advantageous. It closes the gap between hands and helmet to streamline airflow, reduces neck/shoulder fatigue, and wedges your arms securely against sliding forward.',
    lblSlotBottom: 'Bottom Stroke (Max Extension)',
    lblSlotTop: 'Top Stroke (Max Flexion)',
    errMultiSelect: 'Please select exactly 2 photos for dual-stroke biomechanical analysis.',
    lblUploadBottomTitle: 'Click to upload Bottom Stroke photo',
    lblUploadBottomDesc: 'Pedal at the lowest point (Max Extension)',
    lblUploadTopTitle: 'Click to upload Top Stroke photo',
    lblUploadTopDesc: 'Pedal at the highest point (Max Flexion)',
    btnUploadVideo: 'Video',
    btnUploadPhotos: 'Photos',
    tooltipCalibrate: 'Mark wheels, BB, and saddle for real-world cm scaling',
    tooltipDelay: 'Counts down 15s, then auto-records and analyzes 30s',
    tooltipDynamic: 'Dynamically tracks your joints while pedaling (Moving video)',
    tooltipLive: 'Immediate and continuous real-time analysis without time limit',
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
    footer: '© 2026 BikeFit AI • Onur Kapucu tarafından işletilmektedir',
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
    proWorkspace: 'Canlı Analiz Alanı',
    proPerformance: 'Performans Metrikleri',
    proPower: 'GÜÇ',
    proCadence: 'KADANS',
    proSpeed: 'HIZ',
    proAwaiting: 'Çıkarım Bekleniyor...',
    proStartInference: 'Biyomekanik rapor oluşturmak için analizi başlatın',
    proConsistency: 'Uyum Tutarlılık Puanı',
    proRatio: 'Oran',
    proBikeProfile: 'Bisiklet Profili',
    proRoadBike: 'Profesyonel Yol',
    proTriBike: 'Triathlon / Aero',
    proRealTimeMode: 'Gerçek Zamanlı Sürekli Mod',
    proReport: 'Biomekanik Seans Raporu',
    tabExtension: 'Pedal En Altta (Maks. Gerilme)',
    tabFlexion: 'Pedal En Üstte (Maks. Bükülme)',
    reportKneeExt: 'Diz Gerilmesi',
    reportKneeFlex: 'Diz Bükülmesi',
    reportHipAngle: 'Kalça Açısı',
    reportIdealSaddle: 'İdeal Sele Yüksekliği: En alt noktadaki diz gerilmeniz ({angle}°) mükemmel biyomekanik aralıkta (135°-145°). Bu durum, optimum güç aktarımı sağlar ve eklem zorlanmalarını önler.',
    reportHighSaddle: 'Sele Çok Yüksek / Aşırı Gerilme: En alt noktadaki diz gerilmeniz ({angle}°) çok yüksek. Bu durum arka bacak (hamstring) gerilmesine, Aşil tendinitine veya bel ağrısına yol açabilir. Selenizi 5-10 mm indirmenizi öneririz.',
    reportLowSaddle: 'Sele Çok Alçak / Yetersiz Gerilme: En alt noktadaki diz gerilmeniz ({angle}°) çok düşük. Bu durum diz kapağına (patella) aşırı yük bindirir ve güç üretimini azaltır. Selenizi 5-10 mm yükseltmenizi öneririz.',
    reportIdealFlexion: 'Optimum Bükülme: Pedal en üstteyken diz bükülmeniz ({angle}°) ideal seviyede. Diz kapağı üzerinde aşırı baskı oluşmasını önler.',
    reportAcuteFlexion: 'Aşırı Bükülme: Pedal en üstteyken diziniz çok fazla bükülüyor ({angle}°). Bu durum diz kapağı makaslama kuvvetini artırır. Daha kısa aynakol kolları (örn. 165 mm) kullanmayı veya seleyi hafifçe yükseltmeyi düşünün.',
    reportInsufficientFlexion: 'Yetersiz Bükülme / Diz Çok Açık: Pedal en üstteyken diz bükülmeniz ({angle}°) çok yüksek. Bu durum genellikle sele yüksekliğinin çok fazla olmasından veya aynakol kolunun çok kısa olmasından kaynaklanır. Selenizi 5-10 mm indirmeyi deneyin.',
    reportIdealHip: 'Harika Kalça Açıklığı: Pedal en üstteyken kalça açınız ({angle}°) yeterince açık. Rahat nefes almanızı ve kalça kaslarınızı (glute) en iyi şekilde kullanmanızı sağlar.',
    reportClosedHip: 'Dar Kalça Açısı: Pedal en üstteyken kalça açınız ({angle}°) çok dar. Bu durum kalça fleksörlerinizi sıkıştırabilir ve bel ağrısına yol açabilir. Gidonu yükseltmeyi veya seleyi hafifçe öne alarak kalça açısını açmayı deneyin.',
    reportAwaitingPhotos: 'Dinamik bir video analizi tamamladığınızda veya farklı pedal konumlarını analiz ettiğinizde, biyomekanik seans raporunuz fotoğraflarla birlikte burada oluşturulacaktır.',
    btnCalib: 'Bisikleti Kalibre Et',
    calibFWheel: 'Ön Tekerlek Merkezine Tıklayın',
    calibRWheel: 'Arka Tekerlek Merkezine Tıklayın',
    calibBB: 'Aynakol Göbeğine (BB) Tıklayın',
    calibSaddle: 'Sele Merkezine Tıklayın',
    calibDone: 'Kalibrasyon Tamamlandı!',
    calibReset: 'Sıfırlamak için Tıklayın',
    pinFWheel: 'Ön Teker',
    pinRWheel: 'Arka Teker',
    pinBB: 'Aynakol',
    pinSaddle: 'Sele',
    pinAssumed: 'Varsayılan Dingil',
    metricSaddle: 'SELE YÜKSEKLİĞİ',
    metricKops: 'KOPS (Diz Pedal Üstü)',
    obTitle: 'BikeFit AI\'ya Hoş Geldiniz',
    obSubtitle: 'Optimizasyonu ve sakatlıkları önleyen profesyonel düzeyde yapay zeka analizi.',
    obStep1T: '1. Yükle veya Canlı',
    obStep1D: 'Kameranızı başlatın veya sürüşünüzün yandan çekilmiş bir videosunu yükleyin.',
    obStep2T: '2. Kalibre Et',
    obStep2D: '📍 butonuna tıklayın. Gerçek cm ölçümleri için tekerlekleri, BB ve seleyi işaretleyin.',
    obStep3T: '3. Analiz Et',
    obStep3D: 'Diz, kalça ve gövde açılarınız hakkında gerçek zamanlı geri bildirim alın.',
    obStep4T: '4. Optimize Et',
    obStep4D: 'Sele ve kokpitinizi ayarlamak için yapay zeka önerilerini takip edin.',
    obBtn: 'Hemen Başla',
    hwTitle: 'Yapay Zeka Nasıl Çalışır?',
    hwF1T: '📐 Biyomekanik Hassasiyet',
    hwF1D: 'YOLOv8 yapay zekamız, vücudunuzdaki 17 anahtar noktayı saniyede 30 kez izler. Sele yüksekliğinizin mükemmel olduğundan emin olmak, diz ağrısını önlemek ve gücü maksimize etmek için pedal strokunun altındaki diz "gerilmesini" ölçüyoruz.',
    hwF2T: '🏁 Profesyonel Profiller',
    hwF2D: 'Elige arasında Rota ve Triatlon modları arasında seçim yapın. Triatlon uyumu daha agresif bir aerodinamik profile ve kalça açısına odaklanırken, Yol uyumu konforu güç çıkışıyla dengeler.',
    hwF3T: '⚡ Canlı Telemetri',
    hwF3D: 'Smart Trainer\'ınızı Bluetooth üzerinden bağlayarak, Güç (Watt) ve Kadans verilerinizi vücut açılarınızla birlikte görebilir, pozisyon değişikliklerinin verimliliğinizi nasıl etkilediğini anında izleyebilirsiniz.',
    hwF4T: '📍 Gerçek Dünya Kalibrasyonu',
    hwF4D: '📍 butonuna tıklayıp tekerleklerinizi ve selanızı işaretleyerek; Sele Yüksekliği ve KOPS gibi verileri cm cinsinden görün, laboratuvar düzeyinde hassasiyete ulaşın.',
    hwF5T: '⏱️ Analiz Modları',
    hwF5D: '<b>10sn Gecikme:</b> Bisiklete binmeniz için 15sn süre tanır, ardından 30sn otomatik kayıt alıp inceler. <br><br><b>Dinamik Takip:</b> Kayıt boyunca hareketinizi video olarak analiz eder. <br><br><b>Real-Time:</b> Kayıt almadan, anlık ve sınırsız süreyle ekran üzerinden geri bildirim sağlar.',
    hwStatsT: 'Optimal Açı Aralıkları',
    hwLKnee: 'Diz Gerilmesi',
    hwLHip: 'Kalça Açısı',
    hwLShoulder: 'Omuz Açısı',
    csTitle: 'Kamera Kurulum Standartları',
    csDesc: 'For the AI to accurately calculate your critical knee, hip, and shoulder angles, your camera setup is 100% vital.',
    csR1T: '1. Tam 90 Derece Yan Profil (En Önemlisi)',
    csR1D: 'The camera must be placed exactly 90 degrees to the side of the bike. Angles from the front or back distort perspective and break the biomechanical math.',
    csR2T: '2. İdeal Kamera Yüksekliği: Kalça/Sele Hizası',
    csR2D: 'The device must not be on the floor. The most accurate height is about 80-100 cm from the ground, level with your hips or the bike\'s saddle. Place your phone on a table or high chair.',
    csR3T: '3. Kadraj: Tüm Vücut ve Bisiklet İçeride Olmalı',
    csR3D: 'Modelin referans noktalarını doğru alabilmesi için kırpılmış görüntü olmamalıdır. Pedal en alt noktadayken ayak ucu ve sürücünün başının en üst noktası kadraja tam sığmalıdır. Kamerayı 2-3 metre uzağa koyun.',
    csR4T: '4. Aydınlatma ve Ters Işık Uyarısı',
    csR4D: 'Evitay zekanın en büyük düşmanı silüetlerdir. Kullanıcının arkasında doğrudan güneş alan parlak bir pencere veya güçlü bir lamba olmamalıdır (ters ışık). Işık tercihen önden gelmelidir.',
    csR5T: '5. Sıfır Titreme',
    csR5D: 'The camera must not move during recording. Handheld video is not suitable. Lean your phone/tablet against a solid surface or use a tripod.',
    navAnalysis: 'Analiz',
    navHow: 'Nasıl Çalışır?',
    navSetup: 'Kurulum Rehberi',
    labelLearnMore: 'Hemen Başla',
    btnBackTop: '↑ Başa Dön',
    labelDelay: '10s Gecikme',
    triTorsoIdeal: 'İdeal Aero Düz Sırt Açısı ✓',
    triLowerHandlebars: 'Gidonu Alçalt (Daha Düz Aero Sırt)',
    triRaiseHandlebars: 'Gidonu Yükselt (Boyun Gerginliğini Azalt)',
    triathlonAeroTips: '<strong>🏆 Premium Triatlon Aero Optimizasyonu:</strong><br>• <strong>Düz Sırt Pozisyonu:</strong> Daha düz ve yatay bir sırt pozisyonu (gövde açısı ~20°-25°), rüzgara karşı frontal alanı daraltarak aerodinamik sürüklenmeyi (CdA) ciddi oranda azaltır. Bu sayede aynı güçle (Watt) çok daha yüksek hızlara çıkabilirsiniz.<br>• <strong>Aero Bar Açı Avantajı:</strong> Aero barları yukarı doğru 10°-15° açıyla konumlandırmak ("yüksek eller") büyük avantaj sunar. Eller ile kask arasındaki boşluğu kapatarak hava akışını pürüzsüzleştirir, boyun/omuz yorgunluğunu azaltır ve kolların öne kaymasını önleyen güvenli bir kama desteği sağlar.',
    lblSlotBottom: 'Pedal En Altta (Maksimum Uzama)',
    lblSlotTop: 'Pedal En Üstte (Maksimum Bükülme)',
    errMultiSelect: 'Çift strok biyomekanik analizi için lütfen tam olarak 2 fotoğraf seçin.',
    lblUploadBottomTitle: 'Pedal en altta fotoğrafını yüklemek için tıklayın',
    lblUploadBottomDesc: 'Pedal en alt noktadayken (Maksimum Uzama)',
    lblUploadTopTitle: 'Pedal en üstte fotoğrafını yüklemek için tıklayın',
    lblUploadTopDesc: 'Pedal en üst noktadayken (Maksimum Bükülme)',
    btnUploadVideo: 'Video',
    btnUploadPhotos: 'Fotoğraf',
    tooltipCalibrate: 'Kamera açısına göre gerçek dünya (cm) ölçümleri alabilmek için merkezleri işaretleyin',
    tooltipDelay: 'Hazırlanmanız için 15 saniye geri sayar, ardından 30 saniyelik analiz kaydı alır',
    tooltipDynamic: 'Sabit bir anı değil, pedal çevirirken tüm hareketinizi video üzerinden takip eder',
    tooltipLive: 'Süre sınırı olmaksızın anında canlı analize başlar. Anlık ayar denemeleri için idealdir',
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
    footer: '© 2026 BikeFit AI • Operado por Onur Kapucu',
    errNoPose: 'No se detectó postura. Asegúrate de que todo el cuerpo sea visible de lado.',
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
    shortenCrank: '💡 Acortar biela (ej. 165mm) para mejor aerodinámica y ángulo de cadera',
    raiseHeel: 'Subir Talón',
    proWorkspace: 'Espacio de Análisis en Vivo',
    proPerformance: 'Métricas de Rendimiento',
    proPower: 'POTENCIA',
    proCadence: 'CADENCIA',
    proSpeed: 'VELOCIDAD',
    proAwaiting: 'Esperando Inferencia...',
    proStartInference: 'Inicia el análisis para generar el informe biomeccanico',
    proConsistency: 'Puntuación de Coerenza',
    proRatio: 'Relación',
    proBikeProfile: 'Perfil de Bicicleta',
    proRoadBike: 'Ruta Profesional',
    proTriBike: 'Triatlón / Aero',
    proRealTimeMode: 'Modo Continuo en Tiempo Real',
    btnCalib: 'Calibrar Bici',
    calibFWheel: 'Clicca centro rueda delantera',
    calibRWheel: 'Clicca centro rueda trasera',
    calibBB: 'Clicca movimento centrale (BB)',
    calibSaddle: 'Clicca centro sella',
    calibDone: 'Calibración completada!',
    calibReset: 'Clicca per resettare',
    pinFWheel: 'Rueda Del.',
    pinRWheel: 'Rueda Tras.',
    pinBB: 'Pedalier',
    pinSaddle: 'Sella',
    pinAssumed: 'Passo assunto',
    metricSaddle: 'ALTURA SELLÍN',
    metricKops: 'KOPS (Rodilla Pedal)',
    obTitle: 'Bienvenido a BikeFit AI',
    obSubtitle: 'Optimiza tu rendimiento y evita lesiones con análisis de IA profesional.',
    obStep1T: '1. Subir o Directo',
    obStep1D: 'Inicia tu cámara o sube un video de vista lateral.',
    obStep2T: '2. Calibrar',
    obStep2D: 'Marca ejes, pedalier y sillín para medidas reales en cm.',
    obStep3T: '3. Analizar',
    obStep3D: 'Recibe feedback en tiempo real de tus ángulos corporei.',
    obStep4T: '4. Optimize',
    obStep4D: 'Sigue recomendaciones de IA para reglar tu sillín y cockpit.',
    obBtn: 'Comenzar',
    hwTitle: 'Cómo funciona la IA',
    hwF1T: '📐 Precisión Biomecanica',
    hwF1D: 'Nuestra IA YOLOv8 rastrea 17 puntos clave 30 veces por segundo para una sella perfecta.',
    hwF2T: '🏁 Profil Pro',
    hwF2D: 'Elige entre modos Ruta y Triatlón para perfiles aero o de potencia.',
    hwF3T: '⚡ Telemetria en Vivo',
    hwF3D: 'Conecta tu rodillo inteligente para ver Potencia y Cadencia con tus ángulos.',
    hwStatsT: 'Rangos de Ángulos Óptimos',
    hwLKnee: 'Estension Rodilla',
    hwLHip: 'Ángulo Cadera',
    hwLShoulder: 'Ángulo Hombro',
    csTitle: 'Estándares de Configuración de Cámara',
    csDesc: 'Para que la IA calcule con precisión tus ángulos críticos, la configuración de tu cámara es 100% vital.',
    csR1T: '1. Perfil Lateral de 90 Grados',
    csR1D: 'La cámara debe ser colocada exactamente a 90 grados al lado de la bicicleta. Ángulos frontales o traseros distorsionan la perspectiva.',
    csR2T: '2. Altura: Nivel de Cadera/Sella',
    csR2D: 'El dispositivo no debe estar en el suelo. La altura más precisa es unos 80-100 cm del suelo. Coloca tu teléfono sobre una mesa.',
    csR3T: '3. Cuerpo Completo y Bici Visibles',
    csR3D: 'En el punto más bajo del pedale, la punta del pie y la parte superior de la cabeza deben caber en el cuadro. El manubrio y todo el sillín deben verse.',
    csR4T: '4. Iluminación y Contraluz',
    csR4D: 'Evita ventanas luminosas o lámparas fuertes detrás de ti. La luz debe provenir del lato frontale o del alto.',
    csR5T: '5. Cero Vibración',
    csR5D: 'La cámara no debe moverse durante la grabación. El video en mano no es adecuado. Usa un trípode o apoya tu dispositivo en una superficie sólida.',
    navAnalysis: 'Análisis',
    navHow: 'Cómo funciona',
    navSetup: 'Guía de Configuración',
    labelLearnMore: 'Comenzar',
    btnBackTop: '↑ Volver Arriba',
    labelDelay: '10s Retraso',
    triTorsoIdeal: 'Espalda Plana Aero Ideal ✓',
    triLowerHandlebars: 'Bajar Cockpit (Espalda Aero más Plana)',
    triRaiseHandlebars: 'Subir Cockpit (Menos Tensión en Cuello)',
    triathlonAeroTips: '<strong>🏆 Optimización de Aero Triatlón Premium:</strong><br>• <strong>Espalda Plana del Cuerpo:</strong> Una espalda más plana y horizontal (ángulo del torso ~20°-25°) reduce tu área frontal, recortando significativamente la resistencia aerodinámica (CdA). Esto te permite rodar más rápido con los mismos vatios de potencia.<br>• <strong>Ángulo de las Extensiones:</strong> Inclinar las extensiones ligeramente hacia arriba entre 10°-15° (posición de "manos altas") es muy ventajoso. Cierra el espacio entre las manos y el casco para canalizar mejor el aire, reduce la fatiga en cuello/hombros y ofrece un soporte firme que evita el deslizamiento hacia adelante.',
    lblSlotBottom: 'Punto Inferior (Extensión Máxima)',
    lblSlotTop: 'Punto Superior (Flexión Máxima)',
    errMultiSelect: 'Por favor, seleccione exactamente 2 fotos para el análisis biomecánico de doble recorrido.',
    lblUploadBottomTitle: 'Haz clic para subir la foto del punto inferior',
    lblUploadBottomDesc: 'Pedal en la posición más baja (Extensión Máxima)',
    lblUploadTopTitle: 'Haz clic para subir la foto del punto superior',
    lblUploadTopDesc: 'Pedal en la posición más alta (Flexión Máxima)',
    btnUploadVideo: 'Video',
    btnUploadPhotos: 'Fotos',
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
    footer: '© 2026 BikeFit AI • Управляется Онуром Капуджу',
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
    proWorkspace: 'Рабочая область анализа',
    proPerformance: 'Показатели эффективности',
    proPower: 'МОЩНОСТЬ',
    proCadence: 'КАДЕНЗ',
    proSpeed: 'СКОРОСТЬ',
    proAwaiting: 'Ожидание вывода...',
    proStartInference: 'Запустите анализ для создания биомеханического отчета',
    proConsistency: 'Оценка согласованности',
    proRatio: 'Соотношение',
    proBikeProfile: 'Профиль велосипеда',
    proRoadBike: 'Профессиональное шоссе',
    proTriBike: 'Triathlon / Aero',
    proRealTimeMode: 'Непрерывный режим реального времени',
    btnCalib: 'Калибровка велосипеда',
    calibFWheel: 'Кликните в центр переднего колеса',
    calibRWheel: 'Кликните в центр заднего колеса',
    calibBB: 'Кликните в центр каретки (BB)',
    calibSaddle: 'Кликните в центр седла',
    calibDone: 'Калибровка завершена!',
    calibReset: 'Нажмите для сброса',
    pinFWheel: 'Переднее колесо',
    pinRWheel: 'Заднее колесо',
    pinBB: 'Каретка',
    pinSaddle: 'Седло',
    pinAssumed: 'Принятая база',
    metricSaddle: 'ВЫСОТА СЕДЛА',
    metricKops: 'KOPS (Колено над педалью)',
    obTitle: 'Добро пожаловать в BikeFit AI',
    obSubtitle: 'Оптимизируйте результаты и предотвратите травмы с помощью ИИ.',
    obStep1T: '1. Загрузка или Камера',
    obStep1D: 'Включите камеру или загрузите видео сбоку.',
    obStep2T: '2. Калибровка',
    obStep2D: 'Отметьте оси, каретку и седло для точных измерений.',
    obStep3T: '3. Анализ',
    obStep3D: 'Получайте обратную связь по углам тела в реальном времени.',
    obStep4T: '4. Оптимизация',
    obStep4D: 'Следуйте советам ИИ для настройки седла и руля.',
    obBtn: 'Начать',
    hwTitle: 'Как это работает',
    hwF1T: '📐 Биомеханическая точность',
    hwF1D: 'Наш ИИ YOLOv8 отслеживает 17 точек тела 30 раз в секунду для идеальной посадки.',
    hwF2T: '🏁 Профили посадки',
    hwF2D: 'Выберите шоссейный или триатлонный профиль для аэродинамики или комфорта.',
    hwF3T: '⚡ Живая телеметрия',
    hwF3D: 'Подключите смарт-тренажер для отображения мощности и каденса.',
    hwStatsT: 'Оптимальные диапазоны',
    hwLKnee: 'Разгиб колена',
    hwLHip: 'Угол бедра',
    hwLShoulder: 'Угол плеча',
    csTitle: 'Стандарты установки камеры',
    csDesc: 'Чтобы ИИ мог точно рассчитать ваши углы, установка камеры имеет 100% решающее значение.',
    csR1T: '1. Точный боковой профиль 90 градусов',
    csR1D: 'Камера должна быть расположена ровно под углом 90 градусов сбоку от велосипеда. Ракурсы спереди или сзади искажают перспективу.',
    csR2T: '2. Высота: Уровень бедра/седла',
    csR2D: 'Устройство не должно стоять на полу. Идеальная высота — около 80-100 см от земли. Положите телефон на стол.',
    csR3T: '3. Все тело и велосипед в кадре',
    csR3D: 'Когда педаль находится в самой нижней точке, носок и макушка головы должны помещаться в кадр. Руль и все седло должны быть видны.',
    csR4T: '4. Освещение и задняя подсветка',
    csR4D: 'Избегайте ярких окон или сильных ламп позади вас (контровое освещение). Свет должен падать спереди или сверху.',
    csR5T: '5. Нулевая тряска',
    csR5D: 'Камера не должна двигаться во время записи. Используйте штатив или обоприте телефон о твердую поверхность.',
    navAnalysis: 'Анализ',
    navHow: 'Как это работает',
    navSetup: 'Руководство по установке',
    labelLearnMore: 'Начать',
    btnBackTop: '↑ Наверх',
    labelDelay: '10с задержка',
    triTorsoIdeal: 'Идеальная плоская спина ✓',
    triLowerHandlebars: 'Опустить руль (Более плоская спина)',
    triRaiseHandlebars: 'Поднять руль (Снизить нагрузку на шею)',
    triathlonAeroTips: '<strong>🏆 Премиальная аэро-оптимизация триатлона:</strong><br>• <strong>Плоская спина:</strong> Более плоская и горизонтальная спина (угол торса ~20°-25°) уменьшает лобовую площадь тела, значительно снижая аэродинамическое сопротивление (CdA). Это позволяет ехать быстрее при той же мощности (Ватт).<br>• <strong>Угол наклона лежака:</strong> Небольшой подъем насадок лежака (аэробаров) на 10°-15° вверх (позиция «высокие руки») крайне выгоден. Это закрывает поток воздуха между руками и шлемом, снижает усталость шеи/плеч и создает надежный упор для предплечий.',
    lblSlotBottom: 'Нижняя точка (Макс. разгибание)',
    lblSlotTop: 'Верхняя точка (Макс. сгибание)',
    errMultiSelect: 'Пожалуйста, выберите ровно 2 фотографии для биомеханического анализа двух фаз.',
    lblUploadBottomTitle: 'Нажмите, чтобы загрузить фото нижней точки',
    lblUploadBottomDesc: 'Педаль в крайнем нижнем положении (Макс. разгибание)',
    lblUploadTopTitle: 'Нажмите, чтобы загрузить фото верхней точки',
    lblUploadTopDesc: 'Педаль в крайнем верхнем положении (Макс. сгибание)',
    btnUploadVideo: 'Видео',
    btnUploadPhotos: 'Фото',
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
    footer: '© 2026 BikeFit AI • Gestito da Onur Kapucu',
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
    proWorkspace: 'Area di Analisi dal Vivo',
    proPerformance: 'Metriche di Performance',
    proPower: 'POTENZA',
    proCadence: 'CADENZA',
    proSpeed: 'VELOCITÀ',
    proAwaiting: 'In attesa di inferenza...',
    proStartInference: 'Avvia l\'analisi per generare il report biomeccanico',
    proConsistency: 'Punteggio di Coerenza',
    proRatio: 'Rapporto',
    proBikeProfile: 'Profilo Bici',
    proRoadBike: 'Strada Professionale',
    proTriBike: 'Triathlon / Aero',
    proRealTimeMode: 'Modalità Continua in Tempo Reale',
    btnCalib: 'Calibra Bici',
    calibFWheel: 'Clicca centro ruota anteriore',
    calibRWheel: 'Clicca centro ruota posteriore',
    calibBB: 'Clicca movimento centrale (BB)',
    calibSaddle: 'Clicca centro sella',
    calibDone: 'Calibrazione completata!',
    calibReset: 'Clicca per resettare',
    pinFWheel: 'Ruota Ant.',
    pinRWheel: 'Ruota Post.',
    pinBB: 'Mov. Centrale',
    pinSaddle: 'Sella',
    pinAssumed: 'Passo assunto',
    metricSaddle: 'ALTEZZA SELLA',
    metricKops: 'KOPS (Ginocchio su Pedale)',
    obTitle: 'Benvenuto in BikeFit AI',
    obSubtitle: 'Ottimizza le prestazioni e previeni infortuni con l\'analisi professionale IA.',
    obStep1T: '1. Carica o Live',
    obStep1D: 'Avvia la telecamera o carica un video laterale.',
    obStep2T: '2. Calibra',
    obStep2D: 'Segna mozzi, BB e sella per misurazioni reali in cm.',
    obStep3T: '3. Analizza',
    obStep3D: 'Ricevi feedback in tempo reale sui tuoi angoli corporei.',
    obStep4T: '4. Ottimizza',
    obStep4D: 'Segui i consigli IA per regolare sella e manubrio.',
    obBtn: 'Inizia',
    hwTitle: 'Come funziona l\'IA',
    hwF1T: '📐 Precisione Biomeccanica',
    hwF1D: 'La nostra IA YOLOv8 traccia 17 punti chiave 30 volte al secondo per una sella perfetta.',
    hwF2T: '🏁 Profili Pro',
    hwF2D: 'Scegli tra modalità Strada e Triathlon per profili aero o di potenza.',
    hwF3T: '⚡ Telemetria Live',
    hwF3D: 'Collega il tuo smart trainer per vedere Potenza e Cadenza con i tuoi angoli.',
    hwStatsT: 'Range di Angoli Ottimali',
    hwLKnee: 'Estensione Ginocchio',
    hwLHip: 'Angolo Anca',
    hwLShoulder: 'Angolo Spalla',
    csTitle: 'Standard di Configurazione Telecamera',
    csDesc: 'Per consentire all\'IA di calcolare accuratamente i tuoi angoli critici, la configurazione della telecamera è vitale al 100%.',
    csR1T: '1. Profilo Laterale a 90 Gradi',
    csR1D: 'La telecamera deve essere posizionata esattamente a 90 gradi di lato rispetto alla bici. Angoli frontali o posteriori distorcono la prospettiva.',
    csR2T: '2. Altezza: Livello Anca/Sella',
    csR2D: 'Il dispositivo non deve essere a terra. L\'altezza più accurata è a circa 80-100 cm. Posiziona il telefono su un tavolo.',
    csR3T: '3. Corpo Intero e Bici Visibili',
    csR3D: 'Nel punto più basso del pedale, la punta del piede e la sommità della testa devono rientrare nell\'inquadratura. Anche manubrio e sella devono essere visibili.',
    csR4T: '4. Illuminazione e Contro-Luce',
    csR4D: 'Evita finestre luminose o luci forti dietro di te. La luce dovrebbe provenire dal lato frontale o dall\'alto.',
    csR5T: '5. Zero Vibrazioni',
    csR5D: 'La telecamera non deve muoversi durante la registrazione. Usa un treppiede o appoggia il dispositivo su una superficie solida.',
    navAnalysis: 'Analisi',
    navHow: 'Come funziona',
    navSetup: 'Guida all\'installazione',
    labelLearnMore: 'Inizia',
    btnBackTop: '↑ Torna su',
    labelDelay: '10s Ritardo',
    triTorsoIdeal: 'Schiena Piatta Aero Ideale ✓',
    triLowerHandlebars: 'Abbassa Manubrio (Schiena Aero Piatta)',
    triRaiseHandlebars: 'Alza Manubrio (Meno Affaticamento Collo)',
    triathlonAeroTips: '<strong>🏆 Ottimizzazione Aero Triathlon Premium:</strong><br>• <strong>Schiena Piatta Corporea:</strong> Una schiena più piatta e orizzontale (angolo del torso ~20°-25°) reduce l\'area frontale, diminuendo drasticamente la resistenza aerodinamica (CdA). Questo ti consente di andare più veloce a parità di watt erogati.<br>• <strong>Angolo delle Prolunghe:</strong> Inclinare le prolunghe verso l\'alto di 10°-15° (posizione "mani alte") è estremamente vantaggioso. Chiude lo spazio vuoto tra mani e casco per ottimizzare il flusso d\'aria, riduce l\'affaticamento a collo/spalle e crea un cuneo sicuro che impedisce alle braccia di scivolare in avanti.',
    lblSlotBottom: 'Punto Inferior (Estensione Massima)',
    lblSlotTop: 'Punto Superiore (Flessione Massima)',
    errMultiSelect: 'Si prega di selezionare esattamente 2 foto per l\'analisi biomeccanica a doppia corsa.',
    lblUploadBottomTitle: 'Clicca per caricare la foto del punto inferiore',
    lblUploadBottomDesc: 'Pedale nel punto più basso (Estensione Massima)',
    lblUploadTopTitle: 'Clicca per caricare la foto del punto superiore',
    lblUploadTopDesc: 'Pedale nel punto più alto (Flessione Massima)',
    btnUploadVideo: 'Video',
    btnUploadPhotos: 'Foto',
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
    footer: '© 2026 BikeFit AI • Betrieben von Onur Kapucu',
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
    shortenCrank: '💡 Kurbel kürzen (z.B. 165mm) für bessere Aerodynamik & Hüftwinkel',
    proWorkspace: 'Live-Analyse-Arbeitsbereich',
    proPerformance: 'Leistungsmetriken',
    proPower: 'LEISTUNG',
    proCadence: 'TRITTFREQUENZ',
    proSpeed: 'GESCHWINDIGKEIT',
    proAwaiting: 'Warten auf Inferenz...',
    proStartInference: 'Starte Analyse für biomechanischen Bericht',
    proConsistency: 'Fit-Konsistenz-Score',
    proRatio: 'Verhältnis',
    proBikeProfile: 'Fahrradprofil',
    proRoadBike: 'Profi-Rennrad',
    proTriBike: 'Triathlon / Aero',
    proRealTimeMode: 'Echtzeit-Dauermodus',
    btnCalib: 'Fahrrad kalibrieren',
    calibFWheel: 'Klicke auf Vorderradmitte',
    calibRWheel: 'Klicke auf Hinterradmitte',
    calibBB: 'Klicke auf Tretlager (BB)',
    calibSaddle: 'Klicke auf Sattelmitte',
    calibDone: 'Kalibrierung fertig!',
    calibReset: 'Zum Zurücksetzen klicken',
    pinFWheel: 'Vorderrad',
    pinRWheel: 'Hinterrad',
    pinBB: 'Tretlager',
    pinSaddle: 'Sattel',
    pinAssumed: 'Angenommener Radstand',
    metricSaddle: 'SATTELHÖHE',
    metricKops: 'KOPS (Knie über Pedal)',
    obTitle: 'Willkommen bei BikeFit AI',
    obSubtitle: 'Optimiere deine Leistung und beuge Verletzungen mit KI-Analyse vor.',
    obStep1T: '1. Upload oder Live',
    obStep1D: 'Starte die Kamera oder lade ein Video von der Seite hoch.',
    obStep2T: '2. Kalibrieren',
    obStep2D: 'Markiere Naben, Tretlager und Sattel für echte cm-Maße.',
    obStep3T: '3. Analysieren',
    obStep3D: 'Erhalte Echtzeit-Feedback zu deinen Körperwinkeln.',
    obStep4T: '4. Optimieren',
    obStep4D: 'Folge den KI-Empfehlungen zur Einstellung von Sattel und Cockpit.',
    obBtn: 'Loslegen',
    hwTitle: 'Wie die KI funktioniert',
    hwF1T: '📐 Biomechanische Präzision',
    hwF1D: 'Unsere YOLOv8-KI verfolgt 30-mal pro Sekunde 17 Körperpunkte für die perfekte Sitzhöhe.',
    hwF2T: '🏁 Pro-Profile',
    hwF2D: 'Wähle zwischen Rennrad- und Triathlon-Modus für Aero oder Leistung.',
    hwF3T: '⚡ Live-Telemetrie',
    hwF3D: 'Verbinde deinen Smart-Trainer, um Watt und Trittfrequenz zu sehen.',
    hwStatsT: 'Optimale Winkelbereiche',
    hwLKnee: 'Kniestreckung',
    hwLHip: 'Hüftwinkel',
    hwLShoulder: 'Schulterwinkel',
    csTitle: 'Kamera-Setup-Standards',
    csDesc: 'Damit die KI Ihre Winkel genau berechnen kann, ist Ihre Kameraeinstellung zu 100% entscheidend.',
    csR1T: '1. Exaktes 90-Grad-Seitenprofil',
    csR1D: 'Die Kamera muss genau im 90-Grad-Winkel seitlich vom Fahrrad platziert werden. Winkel von vorne oder hinten verzerren die Perspektive.',
    csR2T: '2. Höhe: Hüft-/Sattelhöhe',
    csR2D: 'Das Gerät darf nicht auf dem Boden liegen. Die genaueste Höhe beträgt etwa 80-100 cm. Legen Sie Ihr Telefon auf einen Tisch.',
    csR3T: '3. Ganzer Körper und Fahrrad sichtbar',
    csR3D: 'Am tiefsten Punkt des Pedals müssen Ihre Zehen und der höchste Punkt Ihres Kopfes in den Rahmen passen. Lenker und gesamter Sattel müssen sichtbar sein.',
    csR4T: '4. Beleuchtung und Gegenlicht',
    csR4D: 'Evita finestre luminose o luci forti dietro di te. La luce dovrebbe provenire dal lato frontale o dall\'alto.',
    csR5T: '5. Keine Verwacklung',
    csR5D: 'Die Kamera darf sich während der Aufnahme nicht bewegen. Verwenden Sie ein Stativ oder lehnen Sie Ihr Gerät an eine feste Oberfläche.',
    navAnalysis: 'Analisi',
    navHow: 'Wie es funktioniert',
    navSetup: 'Setup-Leitfaden',
    labelLearnMore: 'Loslegen',
    btnBackTop: '↑ Nach oben',
    labelDelay: '10s Verzögerung',
    triTorsoIdeal: 'Idealer flacher Aero-Rücken ✓',
    triLowerHandlebars: 'Cockpit tiefer (Flachere Aero-Position)',
    triRaiseHandlebars: 'Cockpit höher (Nackenentlastung)',
    triathlonAeroTips: '<strong>🏆 Premium Triathlon Aero-Optimierung:</strong><br>• <strong>Flache Rückenposition:</strong> Ein flacherer, horizontalerer Rücken (Rumpfwinkel ~20°-25°) verringert die Stirnfläche und reduziert den Luftwiderstand (CdA) erheblich, sodass du bei gleicher Wattzahl schneller fährst.<br>• <strong>Winkel der Lenkeraufsätze (Aerobars):</strong> Eine leichte Neigung der Aufsätze nach oben um 10°-15° ("High Hands"-Position) ist extrem vorteilhaft. Sie schließt die Lücke zwischen Händen und Helm für eine optimierte Strömung, verringert Nacken-/Schultermüdigkeit und bietet eine sichere Stütze gegen Vorwärtsrutschen.',
    lblSlotBottom: 'Tiefster Punkt (Max. Streckung)',
    lblSlotTop: 'Höchster Punkt (Max. Beugung)',
    errMultiSelect: 'Bitte wählen Sie genau 2 Fotos für die biomechanische Doppelhub-Analyse aus.',
    lblUploadBottomTitle: 'Klicken, um Foto für tiefsten Punkt hochzuladen',
    lblUploadBottomDesc: 'Pedal am tiefsten Punkt (Max. Streckung)',
    lblUploadTopTitle: 'Klicken, um Foto für höchsten Punkt hochzuladen',
    lblUploadTopDesc: 'Pedal am höchsten Punkt (Max. Beugung)',
    btnUploadVideo: 'Video',
    btnUploadPhotos: 'Fotos',
  },
};

const LANG_LABELS = { en: '🇬🇧 EN', tr: '🇹🇷 TR', es: '🇪🇸 ES', ru: '🇷🇺 RU', it: '🇮🇹 IT', de: '🇩🇪 DE' };

// ===== STATE =====
let currentLang = 'en';
let stream = null;
let liveInterval = null;
let isLockStepActive = false;
let isAnalyzing = false;
let currentFacingMode = 'environment';
let isCalibrating = false;
let calibPins = [];
let calibrationHipX = null;
let calibrationHipY = null;
let stableLegLen = null;
let uploadedFile = null;
let pixelToCm = null;

let prevSnapshot = null;
let currSnapshot = null;
let prevSnapshotData = null;
let currSnapshotData = null;
let prevMetrics = null;
let currMetrics = null;

let lastSentDimensions = { width: 640, height: 480 };
let previousRunBDCFrame = null;
let maxKneeAngleFrame = null;
let minKneeAngleFrame = null;
let activeReportTab = 'extension';

let latestSinglePoseData = null; // caches last single-view pose analysis data

// ===== ARCHIVED FEATURE STUBS (multi-photo mode removed, live camera only) =====
// These null/false stubs prevent ReferenceErrors from remaining code paths
// that referenced the removed photo/video upload feature.
const isMultiPhotoMode = false;
const wasInMultiPhotoModeDuringCalib = false;
const multiPhotoBottomData = null;
const multiPhotoTopData = null;
const calibPinsBottom = [];
const calibPinsTop = [];
const pixelToCmBottom = null;
const pixelToCmTop = null;
const activeCalibSlot = null;
const photoViewer = null;
const overlaySlotBottom = null;
const overlaySlotTop = null;
const imgSlotBottom = null;
const imgSlotTop = null;


// ===== DOM REFS =====
const video = document.getElementById('video');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const btnStart = document.getElementById('btn-start-camera');
const btnAnalyze = document.getElementById('btn-analyze');
const btnStop = document.getElementById('btn-stop');
const btnSwitchCamera = document.getElementById('btn-switch-camera');
const liveModeToggle = document.getElementById('live-mode-toggle');
const paywallModal = document.getElementById('paywall-modal');
const btnCheckout = document.getElementById('btn-checkout');
const bikeTypeSelect = document.getElementById('bike-type-select');
if (bikeTypeSelect) {
  bikeTypeSelect.addEventListener('change', () => {
    window.sessionManager.trackEvent('profile_changed', { profile: bikeTypeSelect.value });
  });
}
const btnCalibrateBike = document.getElementById('btn-calibrate-bike');
const btnCalibrateText = document.getElementById('btn-calibrate-text');
const valSaddleHeight = document.getElementById('val-saddle-height');
const valKops = document.getElementById('val-kops');
const overlayCanvas = document.getElementById('overlay');
const checkDelay = document.getElementById('check-delay');
const countdownOverlay = document.getElementById('countdown-overlay');


// Comparison REFS
const compContainer = document.getElementById('comparison-container');
const compPrevImg = document.getElementById('comp-prev-img');
const compCurrImg = document.getElementById('comp-curr-img');
const compPrevMetrics = document.getElementById('comp-prev-metrics');
const compCurrMetrics = document.getElementById('comp-curr-metrics');

// Fullscreen controls
const fsControls = document.getElementById('fullscreen-controls');
const btnCancelFS = document.getElementById('btn-cancel-fullscreen');
const btnDoneFS = document.getElementById('btn-done-fullscreen');

// Modal REFS
const configModal = document.getElementById('config-modal');
const btnStartCalib = document.getElementById('btn-start-calibration');
const btnCancelCalib = document.getElementById('btn-cancel-calibration');
const inpWheelbase = document.getElementById('inp-wheelbase');
const inpCrank = document.getElementById('inp-crank');
const inpChainring = document.getElementById('inp-chainring');
const inpHandlebar = document.getElementById('inp-handlebar');
let bikeMetadata = {};

// Onboarding REFS
const onboardingModal = document.getElementById('onboarding-modal');
const btnCloseOnboarding = document.getElementById('btn-close-onboarding');
const btnStartApp = document.getElementById('btn-start-app');

// Lang Dropdown toggle
const btnLangToggle = document.getElementById('btn-lang-toggle');
const langOptions = document.getElementById('lang-options');

// BLE DOM REFS
const btnConnectSensor = document.getElementById('btn-connect-sensor');
const valPower = document.getElementById('val-power');
const valCadence = document.getElementById('val-cadence');
const valSpeed = document.getElementById('val-speed');

// ===== LANGUAGE =====
function applyLang(lang) {
  currentLang = lang;
  const t = translations[lang];
  if (!t) return;
  document.documentElement.lang = lang;

  const setT = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = val;
  };

  setT('hero-title', t.heroTitle);
  setT('hero-sub', t.heroSub);
  setT('btn-start-text', t.btnStart);
  setT('btn-analyze-text', t.btnAnalyze);
  setT('btn-stop-text', t.btnStop);
  setT('live-mode-label', t.liveModeLabel);
  setT('idle-text', t.idleText);
  setT('loading-text', t.loadingText);
  setT('f3-desc', t.f3Desc);
  setT('footer-text', t.footer);

  // PRO LABELS (BY ID)
  setT('label-workspace-title', t.proWorkspace);
  setT('label-metrics-title', t.proPerformance);
  setT('label-telemetry-power', t.proPower);
  setT('label-telemetry-cadence', t.proCadence);
  setT('label-telemetry-speed', t.proSpeed);
  setT('label-inference-p', t.proAwaiting);
  setT('label-inference-small', t.proStartInference);
  setT('label-consistency-score', t.proConsistency);
  setT('label-bike-profile', t.proBikeProfile);
  setT('label-live-mode', t.proRealTimeMode);
  setT('btn-calibrate-text', t.btnCalib);

  const setAttr = (id, attr, val) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute(attr, val);
  };
  setAttr('info-calibrate', 'data-tooltip', t.tooltipCalibrate || '');
  setAttr('info-delay', 'data-tooltip', t.tooltipDelay || '');
  setAttr('info-dynamic', 'data-tooltip', t.tooltipDynamic || '');
  setAttr('info-live', 'data-tooltip', t.tooltipLive || '');
  setT('label-metric-saddle', t.metricSaddle);
  setT('label-metric-kops', t.metricKops);
  setT('tip-title', t.tipTitle || '⚡ AI Video Scanning Tip');
  setT('tip-desc', t.tipDesc || 'Keep your camera stable while filming. Ensure the cyclist doesn\'t pass out of frame; stationary trainer riding or camera-parallel side-view shots yield the highest biomechanical accuracy.');
  setT('label-dynamic-tracking', t.dynamicTracking || 'Dynamic AI Tracking (Moving Video)');
  setT('label-slot-bottom', t.lblSlotBottom);
  setT('label-slot-top', t.lblSlotTop);


  const ratioLabel = document.getElementById('val-wheelbase-text');
  if (ratioLabel && pixelToCm) {
    const ratio = (1 / pixelToCm).toFixed(2);
    ratioLabel.textContent = `${t.proRatio || 'Ratio'}: ${ratio} px/cm`;
  }

  const bikeProfileLabel = document.querySelector('.select-wrapper label');
  if (bikeProfileLabel) bikeProfileLabel.textContent = t.proBikeProfile;

  const bikeOptions = document.querySelectorAll('#bike-type-select option');
  if (bikeOptions[0]) bikeOptions[0].textContent = t.proRoadBike;
  if (bikeOptions[1]) bikeOptions[1].textContent = t.proTriBike;

  const liveModeSpan = document.querySelector('.live-mode-bar span');
  if (liveModeSpan) liveModeSpan.textContent = t.proRealTimeMode;

  const viewportSmall = document.querySelector('.viewport-placeholder small');
  if (viewportSmall) viewportSmall.textContent = t.placeholderText;
  const viewportP = document.querySelector('.viewport-placeholder p');
  if (viewportP) viewportP.textContent = t.btnAnalyze; 

  // Onboarding
  setT('ob-title', t.obTitle);
  setT('ob-subtitle', t.obSubtitle);
  setT('ob-step1-title', t.obStep1T);
  setT('ob-step1-desc', t.obStep1D);
  setT('ob-step2-title', t.obStep2T);
  setT('ob-step2-desc', t.obStep2D);
  setT('ob-step3-title', t.obStep3T);
  setT('ob-step3-desc', t.obStep3D);
  setT('ob-step4-title', t.obStep4T);
  setT('ob-step4-desc', t.obStep4D);
  setT('btn-start-app', t.obBtn);

  // How it works
  setT('hw-title', t.hwTitle);
  setT('hw-f1-title', t.hwF1T);
  setT('hw-f1-desc', t.hwF1D);
  setT('hw-f2-title', t.hwF2T);
  setT('hw-f2-desc', t.hwF2D);
  setT('hw-f3-title', t.hwF3T);
  setT('hw-f3-desc', t.hwF3D);
  setT('hw-f4-title', t.hwF4T);
  setT('hw-f4-desc', t.hwF4D);
  setT('hw-f5-title', t.hwF5T);
  setT('hw-f5-desc', t.hwF5D);
  setT('hw-stats-title', t.hwStatsT);
  setT('hw-l-knee', t.hwLKnee);
  setT('hw-l-hip', t.hwLHip);
  setT('hw-l-shoulder', t.hwLShoulder);

  // Camera Setup Standards
  setT('cs-title', t.csTitle);
  setT('cs-desc', t.csDesc);
  setT('cs-r1-title', t.csR1T);
  setT('cs-r1-desc', t.csR1D);
  setT('cs-r2-title', t.csR2T);
  setT('cs-r2-desc', t.csR2D);
  setT('cs-r3-title', t.csR3T);
  setT('cs-r3-desc', t.csR3D);
  setT('cs-r4-title', t.csR4T);
  setT('cs-r4-desc', t.csR4D);
  setT('cs-r5-title', t.csR5T);
  setT('cs-r5-desc', t.csR5D);

  // New Nav & Scroll Links
  setT('nav-link-analysis', t.navAnalysis);
  setT('nav-link-how-it-works', t.navHow);
  setT('nav-link-setup-guide', t.navSetup);
  setT('label-learn-more', t.labelLearnMore);
  setT('btn-back-to-top', t.btnBackTop);
  setT('label-10s-delay', t.labelDelay);

  // Show Admin Status
  if (localStorage.getItem('bikefit_token') === 'G1zl1_Adm1n_Pass_99') {
    const statusDot = document.querySelector('.status-dot');
    if (statusDot) statusDot.style.background = '#00ff00';
    const title = document.getElementById('label-workspace-title');
    if (title) title.textContent += ' (Admin Mode)';
  }

  document.querySelectorAll('.lang-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // Update dropdown label
  const display = document.getElementById('current-lang-display');
  if (display) display.textContent = lang.toUpperCase();
  
  // Update translation in report
  updateReportUI();
}

function buildLangBar() {
  const optionsContainer = document.getElementById('lang-options');
  if (!optionsContainer) return;
  optionsContainer.innerHTML = '';
  
  Object.entries(LANG_LABELS).forEach(([code, label]) => {
    const btn = document.createElement('button');
    btn.className = 'lang-opt-btn';
    btn.innerHTML = `<span>${label}</span>`;
    btn.dataset.lang = code;
    btn.onclick = () => applyLang(code);
    optionsContainer.appendChild(btn);
  });
}

// ===== CAMERA =====
async function startCamera() {
  window.sessionManager.trackEvent('camera_started');
  try {
    const tipCard = document.getElementById('video-scan-tip-card');
    if (tipCard) tipCard.style.display = 'none';

    // Forcing 16:9 Aspect Ratio and higher resolution to prevent narrow/zoomed crop on iOS
    const constraints = { 
      video: { 
        facingMode: currentFacingMode,
        width: { min: 640, ideal: 1920, max: 1920 },
        height: { min: 480, ideal: 1080, max: 1080 },
        aspectRatio: { ideal: 1.7777777778 }
      }, 
      audio: false 
    };
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.src = ""; 
    video.srcObject = stream;
    video.controls = false;
    video.style.display = 'block'; // Show video element for live camera
    video.play();
    
    cameraPlaceholder.classList.add('hidden');
    
    // UI Update for PRO layout
    btnStart.classList.add('active');
    btnStop.style.display = 'block';
    btnSwitchCamera.style.display = 'block';
    btnAnalyze.disabled = false;
  } catch {
    showError(translations[currentLang].errCamera);
  }
}

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  video.srcObject = null;
  video.src = "";
  video.load(); // Force reset
  video.controls = false; // Disable controls for main screen
  video.style.display = 'none'; // Keep video hidden — only show when camera starts
  cameraPlaceholder.classList.remove('hidden');
  document.getElementById('video-box').classList.remove('calibration-zoom');
  btnStart.classList.remove('active');
  btnStop.style.display = 'none';
  btnSwitchCamera.style.display = 'none';
  btnAnalyze.disabled = true;
  stopLiveMode();
}

async function switchCamera() {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  if (stream) {
    stopCamera();
    await startCamera();
  }
}

// ===== CAPTURE FRAME =====
function captureBase64() {
  const canvas = document.createElement('canvas');
  const source = video;

  // For live camera: use videoWidth/videoHeight
  const srcW = source.videoWidth || 640;
  const srcH = source.videoHeight || 480;
  console.log(`[captureBase64] Camera mode: videoWidth=${srcW}, videoHeight=${srcH}`);

  // Keep small for speed
  const scale = 0.5;
  const targetW = Math.round(srcW * scale);
  const targetH = Math.round(srcH * scale);
  const quality = 0.5;

  canvas.width = targetW;
  canvas.height = targetH;
  
  // Record sent dimensions
  lastSentDimensions = { width: canvas.width, height: canvas.height };
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const base64 = canvas.toDataURL('image/jpeg', quality);
  console.log(`[captureBase64] Generated base64 length: ${base64.length}`);
  return base64;
}

// ===== ANALYZE =====
async function analyze(preCapturedBase64 = null) {
  window.sessionManager.trackEvent('analyze_clicked', { preCaptured: !!preCapturedBase64 });
  if (isAnalyzing) return;
  // Prevent analyzing the last frame if the video has ended to avoid irrelevant results
  if (video.src && !video.srcObject && video.ended) {
    console.log("Video ended, skipping analysis.");
    stopLiveMode();
    return;
  }
  if (!stream) {
    alert("No camera stream found. Please start the camera first.");
    return;
  }

  isAnalyzing = true;
  showLoading();

  try {
    console.log('[analyze] Starting live camera analysis');
    const base64 = preCapturedBase64 || captureBase64();
    let token = localStorage.getItem('bikefit_token');
    
    // Kalıcı Çözüm: Capacitor (Android/iOS) ortamındaysa Stripe ödemesini atla (ücretsiz). Web'de ise ödeme zorunlu.
    if (!token && window.Capacitor && window.Capacitor.isNativePlatform()) {
      token = 'G1zl1_Adm1n_Pass_99'; 
      localStorage.setItem('bikefit_token', token);
    }
    
    console.log(`[analyze] Sending request to ${API_URL}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 
        'Content-Type': 'application/json',
        'access-token': token
      },
      body: JSON.stringify({ 
        image_base64: base64,
        bike_type: bikeTypeSelect.value,
        save_to_dataset: (liveInterval == null)
      })
    });
    clearTimeout(timeoutId);
    // console.log("Step 3: Server Responded with " + response.status);

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('429');
        }
        const errText = await response.text();
        const fullUrl = window.location.origin + API_URL;
        throw new Error(`Server Error: ${response.status} - URL: ${fullUrl} - ${errText}`);
    }

    if (response.status === 401) {
      localStorage.removeItem('bikefit_token');
      showPaywall();
      isAnalyzing = false;
      return;
    }

    const data = await response.json();

    if (data.error) {
      showError(translations[currentLang].errNoPose + " (AI missed you)");
    } else {
      showResults(data);
    }
  } catch (err) {
    console.error("Analysis Failed:", err);
    let context = { endpoint: "/analyze", isImage: isImage };
    if (err.message === '429') {
      showToast("Çok fazla istek gönderdiniz. Lütfen birkaç saniye bekleyin.", "warning");
      showError("Rate Limited");
      captureError(err, { ...context, type: "rate_limit" });
    } else if (err.name === 'AbortError' || err.message.includes('aborted')) {
      showToast("Sunucu bağlantısı zaman aşımına uğradı. Lütfen tekrar deneyin.", "error");
      showError("Connection Timeout");
      captureError(err, { ...context, type: "timeout" });
    } else if (err.name === 'TypeError' || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      showToast("Ağ bağlantısı koptu. Lütfen internetinizi kontrol edin.", "error");
      showError("Network Error");
      captureError(err, { ...context, type: "network_error" });
    } else {
      showToast("Analiz sırasında bir hata oluştu.", "error");
      showError(translations[currentLang].errNoPose || "Analysis failed.");
      captureError(err, { ...context, type: "unknown_error" });
    }
  } finally {
    isAnalyzing = false;
    if (isLockStepActive) {
      advanceLockStepVideo();
    }
  }
}

// (Duplicates removed, logic moved to bottom)

// ===== UI STATES =====
function showLoading() {
  if (isLockStepActive) return; // Prevent layout jumping during Lock-Step Video Scan!
  document.getElementById('idle-state').style.display = 'none';
  document.getElementById('results-list').style.display = 'none';
  document.getElementById('error-state').style.display = 'none';
  document.getElementById('loading-state').style.display = '';
  
  // ONLY go fullscreen for live camera stream — NEVER for uploaded photos or videos
  if (stream) {
    document.getElementById('video-box').classList.add('calibration-zoom');
  } else {
    document.getElementById('video-box').classList.remove('calibration-zoom');
  }
}

function showError(msg) {
  if (isLockStepActive) return; // Prevent layout jumping during Lock-Step Video Scan!
  document.getElementById('idle-state').style.display = 'none';
  document.getElementById('results-list').style.display = 'none';
  document.getElementById('loading-state').style.display = 'none';
  const el = document.getElementById('error-state');
  el.style.display = '';
  document.getElementById('error-text').textContent = msg;
  document.getElementById('video-box').classList.remove('calibration-zoom');
}

function showPaywall() {
  // stopCamera();
  // paywallModal.style.display = 'flex';
}

function hidePaywall() {
  paywallModal.style.display = 'none';
}

function showToast(message, type = 'error') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '⚠️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  
  toast.innerHTML = `
    <span>${icon}</span>
    <span style="flex: 1;">${message}</span>
    <button class="close-toast" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('fade-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

async function captureError(error, context = {}) {
  try {
    // Fire and forget to backend /logs
    fetch(`${API_BASE}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message || String(error),
        stack: error.stack || null,
        userAgent: navigator.userAgent,
        context: context
      })
    }).catch(e => console.error("Log failed:", e));
  } catch (e) {
    console.error("Error logging failed", e);
  }
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

function translateFeedback(text, key) {
  const t = translations[currentLang];
  if (!text) return '—';
  const lower = text.toLowerCase();
  
  if (bikeTypeSelect && bikeTypeSelect.value === 'triathlon' && key === 'torso') {
    if (lower === 'ideal') return t.triTorsoIdeal || t.idealPos;
    if (lower === 'lower_handlebars') return t.triLowerHandlebars || t.lowerHandlebars;
    if (lower === 'raise_handlebars') return t.triRaiseHandlebars || t.raiseHandlebars;
  }
  
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
  if (lower === 'shorten_crank') return t.shortenCrank;
  if (lower === 'raise_heel') return t.raiseHeel;

  // Fallback for old feedback if any
  if (lower.includes('ideal')) return t.idealPos;
  return text;
}

function adjustFlexionFeedback(data) {
  if (!data) return null;
  const copy = JSON.parse(JSON.stringify(data));
  
  // 1. Knee flexion evaluation (Ideal: 70° to 80°)
  const knee = Math.round(copy.knee_angle);
  if (knee >= 70 && knee <= 80) {
    copy.knee_feedback = 'ideal';
  } else if (knee < 70) {
    copy.knee_feedback = 'raise_saddle';
  } else {
    copy.knee_feedback = 'lower_saddle';
  }
  
  // 2. Hip flexion evaluation (Ideal: >= 45°)
  const hip = Math.round(copy.hip_angle);
  if (hip >= 45) {
    copy.hip_feedback = 'ideal';
  } else {
    copy.hip_feedback = 'move_saddle_forward';
  }
  
  return copy;
}

function renderAngle(key, angle, feedback) {
  const val = document.getElementById(`val-${key}`);
  const fb = document.getElementById(`fb-${key}`);
  const bar = document.getElementById(`bar-${key}`);
  const item = document.getElementById(`r-${key}`);
  const cls = feedbackClass(feedback);

  val.textContent = `${Math.round(angle)}°`;
  fb.textContent = translateFeedback(feedback, key);
  bar.style.width = angleToPercent(angle) + '%';
  bar.className = `result-bar ${cls}`;
  item.className = `result-item ${cls}`;
}

function captureSnapshotWithOverlay(targetSource = null, targetOverlayCanvas = overlayCanvas, imgW = null, imgH = null) {
  const canvas = document.createElement('canvas');
  const isImage = (photoViewer && photoViewer.style.display === 'block') || (targetSource && targetSource.tagName === 'IMG');
  const source = targetSource || (isImage ? photoViewer : video);

  const w = imgW || (targetOverlayCanvas ? targetOverlayCanvas.width : 0) || source.videoWidth || source.naturalWidth || 640;
  const h = imgH || (targetOverlayCanvas ? targetOverlayCanvas.height : 0) || source.videoHeight || source.naturalHeight || 480;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(targetOverlayCanvas || overlayCanvas, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

function showResults(data) {
  const isImage = photoViewer && photoViewer.style.display === 'block';
  const source = isImage ? photoViewer : video;

  // --- FRONTEND SAFETY VALVE: REJECT REAR-HUB ANKLE GLITCHES ---
  if (calibPins.length === 4 && data.keypoints && data.keypoints.ankle && data.keypoints.knee) {
    const ankle = data.keypoints.ankle;
    const knee = data.keypoints.knee;
    const bb = calibPins[2];
    const rearHub = calibPins[1];
    
    // Determine source dimensions to match scale
    const vW = source.videoWidth || source.naturalWidth || 640;
    const vH = source.videoHeight || source.naturalHeight || 480;
    
    let scaleX = 1, scaleY = 1;
    if (data.width && data.height) {
       scaleX = vW / data.width;
       scaleY = vH / data.height;
    } else {
       const maxVal = Math.max(...Object.values(data.keypoints).flat().filter(v => typeof v === 'number'));
       if (maxVal <= 1.1) {
          scaleX = vW;
          scaleY = vH;
       } else {
          scaleX = vW / lastSentDimensions.width;
          scaleY = vH / lastSentDimensions.height;
       }
    }
    
    // Scale ankle coordinates to canvas space
    const ankX = ankle[0] * scaleX;
    const ankY = ankle[1] * scaleY;
    
    // Calculate physical distances relative to calibrated bike pins
    const distToRearHub = Math.hypot(ankX - rearHub.x, ankY - rearHub.y);
    const distToBB = Math.hypot(ankX - bb.x, ankY - bb.y);
    
    // 1. Check if the ankle is closer to the rear wheel hub than to the bottom bracket (where pedals rotate)
    // 2. Or if the ankle is within a tight 80px radius of the rear hub pin
    // Note: Bypassed in photo/image mode to prevent false positives on single static photos.
    if (!isImage && (distToRearHub < distToBB || distToRearHub < 80)) {
      console.warn("Frontend Safety Valve: Ankle marker glitched on Rear Hub. Discarding distorted frame.");
      if (!liveInterval && !isLockStepActive) {
        document.getElementById('video-box').classList.remove('calibration-zoom');
        document.getElementById('loading-state').style.display = 'none';
        showError(translations[currentLang].errNoPose || "Analysis failed: ankle marker glitched.");
      }
      return; // Skip updating reports or saving this glitched frame
    }
  }

  // Only shrink back if we are not in the middle of a continuous live session
  if (!liveInterval && !isLockStepActive) {
    document.getElementById('video-box').classList.remove('calibration-zoom');
  }
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

  // Draw human keypoints on canvas if available
  if (data.keypoints) {
    latestSinglePoseData = data;
    drawOverlay(data.keypoints, data.width, data.height, overlayCanvas, null, data);
  }

  // --- COMPARISON LOGIC (Snapshots) ---
  // (Sidebar comparison container is populated dynamically at the end of the session using showComparisonSessionResults)

  // Capture new current snapshot (includes overlay drawings)
  currSnapshot = captureSnapshotWithOverlay();
  
  const t = translations[currentLang] || translations.en;
  let customFeedback = `
    <strong>${t.rKneeAngle || 'Knee Angle'} (${Math.round(data.knee_angle)}°):</strong><br>${translateFeedback(data.knee_feedback, 'knee')}<br><br>
    <strong>${t.rHipAngle || 'Hip Angle'} (${Math.round(data.hip_angle)}°):</strong><br>${translateFeedback(data.hip_feedback, 'hip')}<br><br>
    <strong>${t.rElbowAngle || 'Elbow Angle'} (${Math.round(data.elbow_angle)}°):</strong><br>${translateFeedback(data.elbow_feedback, 'elbow')}<br><br>
    <strong>${t.rTorsoAngle || 'Torso Angle'} (${Math.round(data.torso_angle)}°):</strong><br>${translateFeedback(data.torso_feedback, 'torso')}
  `;
  if (bikeTypeSelect && bikeTypeSelect.value === 'triathlon') {
    customFeedback += `
      <div class="aero-tips-card" style="margin-top: 15px;">
        ${t.triathlonAeroTips}
      </div>
    `;
  }
  currSnapshotData = {
    src: currSnapshot,
    data: JSON.parse(JSON.stringify(data)),
    score: score,
    feedbackText: customFeedback
  };
  
  // Track key frames for the Biomechanical Session Report
  if (data.knee_angle) {
    const angle = parseFloat(data.knee_angle);
    if (isImage) {
      // For photo mode, assign the current frame as both max and min so the report is generated immediately
      maxKneeAngleFrame = {
        angle: angle,
        photo: currSnapshot,
        data: JSON.parse(JSON.stringify(data)),
        score: score
      };
      minKneeAngleFrame = {
        angle: angle,
        photo: currSnapshot,
        data: JSON.parse(JSON.stringify(data)),
        score: score
      };
    } else {
      // Track Maximum Extension (bottom of stroke: knee is open, typically 120 to 165 deg)
      if (angle >= 120 && angle <= 165) {
        if (!maxKneeAngleFrame || angle > maxKneeAngleFrame.angle) {
          maxKneeAngleFrame = {
            angle: angle,
            photo: currSnapshot,
            data: JSON.parse(JSON.stringify(data)),
            score: score
          };
        }
      }
      // Track Maximum Flexion (top of stroke: knee is bent, typically 50 to 110 deg)
      if (angle >= 50 && angle < 110) {
        if (!minKneeAngleFrame || angle < minKneeAngleFrame.angle) {
          const adjustedData = adjustFlexionFeedback(data);
          const feedbacks = [adjustedData.knee_feedback, adjustedData.hip_feedback, adjustedData.elbow_feedback, adjustedData.torso_feedback, adjustedData.ankle_feedback];
          const idealCount = feedbacks.filter(f => f && f.toLowerCase().includes('ideal')).length;
          const flexScore = Math.round((idealCount / feedbacks.length) * 100);

          minKneeAngleFrame = {
            angle: angle,
            photo: currSnapshot,
            data: adjustedData,
            score: flexScore
          };
        }
      }
    }
  }

  // Update Biomechanical Session Report UI
  if (maxKneeAngleFrame || minKneeAngleFrame) {
    const reportCard = document.getElementById('session-report-card');
    if (reportCard) {
      reportCard.style.display = 'flex';
      updateReportUI();
    }
  }
  
  let metricsStr = `<strong>Knee:</strong> ${Math.round(data.knee_angle)}° | <strong>Hip:</strong> ${Math.round(data.hip_angle)}°<br><strong>Score:</strong> ${score}%`;
  const saddleCm = document.getElementById('val-saddle-height').textContent;
  const kopsCm = document.getElementById('val-kops').textContent;
  if (saddleCm && saddleCm !== '--') {
    metricsStr += `<br><strong>Saddle:</strong> ${saddleCm} | <strong>KOPS:</strong> ${kopsCm}`;
  }
  currMetrics = metricsStr;
  
  // Real-time comparison updates removed to prevent flashing. Comparison is rendered session-by-session at the end.
}

function updateReportUI() {
  const content = document.getElementById('report-tab-content');
  if (!content) return;
  
  const t = translations[currentLang] || translations.en;

  // Dynamic Analyzed Snapshots List under the results
  const photosContainer = document.getElementById('analyzed-photos-container');
  const rightPhotoBottom = document.getElementById('right-photo-bottom');
  const rightPhotoTop = document.getElementById('right-photo-top');
  const imgRightBottom = document.getElementById('img-right-bottom');
  const imgRightTop = document.getElementById('img-right-top');
  
  if (photosContainer) {
    let hasPhotos = false;
    
    if (maxKneeAngleFrame && maxKneeAngleFrame.photo) {
      if (imgRightBottom) {
        imgRightBottom.src = maxKneeAngleFrame.photo;
        if (rightPhotoBottom) rightPhotoBottom.style.display = 'flex';
        hasPhotos = true;
      }
    } else {
      if (rightPhotoBottom) rightPhotoBottom.style.display = 'none';
    }
    
    if (minKneeAngleFrame && minKneeAngleFrame.photo) {
      if (imgRightTop) {
        imgRightTop.src = minKneeAngleFrame.photo;
        if (rightPhotoTop) rightPhotoTop.style.display = 'flex';
        hasPhotos = true;
      }
    } else {
      if (rightPhotoTop) rightPhotoTop.style.display = 'none';
    }
    
    if (hasPhotos) {
      photosContainer.style.display = 'flex';
    } else {
      photosContainer.style.display = 'none';
    }
  }

  // Bind click event listeners for the right side analyzed photos
  const wrapperBottom = rightPhotoBottom ? rightPhotoBottom.querySelector('.right-photo-wrapper') : null;
  if (wrapperBottom) {
    const ov = wrapperBottom.querySelector('.zoom-overlay');
    wrapperBottom.onmouseenter = () => { if (ov) ov.style.opacity = 1; };
    wrapperBottom.onmouseleave = () => { if (ov) ov.style.opacity = 0; };
    
    wrapperBottom.onclick = () => {
      if (maxKneeAngleFrame) {
        const extAngle = Math.round(maxKneeAngleFrame.angle);
        const t = translations[currentLang] || translations.en;
        let extFeedback = '';
        if (extAngle >= 135 && extAngle <= 145) {
          extFeedback = (t.reportIdealSaddle || '').replace('{angle}', extAngle);
        } else if (extAngle > 145) {
          extFeedback = (t.reportHighSaddle || '').replace('{angle}', extAngle);
        } else {
          extFeedback = (t.reportLowSaddle || '').replace('{angle}', extAngle);
        }
        let fullFeedback = `
          <strong>${t.reportKneeExt || "Knee Extension"} (${extAngle}°):</strong><br>
          ${extFeedback}
        `;
        openLightbox(
          maxKneeAngleFrame.photo,
          t.tabExtension || "Bottom Stroke (Max Extension)",
          maxKneeAngleFrame.angle,
          maxKneeAngleFrame.data.hip_angle,
          maxKneeAngleFrame.score,
          fullFeedback
        );
      }
    };
  }
  
  const wrapperTop = rightPhotoTop ? rightPhotoTop.querySelector('.right-photo-wrapper') : null;
  if (wrapperTop) {
    const ov = wrapperTop.querySelector('.zoom-overlay');
    wrapperTop.onmouseenter = () => { if (ov) ov.style.opacity = 1; };
    wrapperTop.onmouseleave = () => { if (ov) ov.style.opacity = 0; };
    
    wrapperTop.onclick = () => {
      if (minKneeAngleFrame) {
        const flexAngle = Math.round(minKneeAngleFrame.angle);
        const flexHipAngle = minKneeAngleFrame.data.hip_angle ? Math.round(minKneeAngleFrame.data.hip_angle) : null;
        const t = translations[currentLang] || translations.en;
        
        let flexKneeFeedback = '';
        if (flexAngle >= 70 && flexAngle <= 80) {
          flexKneeFeedback = (t.reportIdealFlexion || '').replace('{angle}', flexAngle);
        } else if (flexAngle < 70) {
          flexKneeFeedback = (t.reportAcuteFlexion || '').replace('{angle}', flexAngle);
        } else {
          flexKneeFeedback = (t.reportInsufficientFlexion || '').replace('{angle}', flexAngle);
        }
        
        let flexHipFeedback = '';
        if (flexHipAngle) {
          if (flexHipAngle >= 45) {
            flexHipFeedback = (t.reportIdealHip || '').replace('{angle}', flexHipAngle);
          } else {
            flexHipFeedback = (t.reportClosedHip || '').replace('{angle}', flexHipAngle);
          }
        }
        
        let flexFeedback = `<strong>${t.reportKneeFlex || 'Knee Flexion'}:</strong><br>${flexKneeFeedback}`;
        if (flexHipAngle) {
          flexFeedback += `<br><br><strong>${t.reportHipAngle || 'Hip Angle'}:</strong><br>${flexHipFeedback}`;
        }
        
        let fullFeedback = `
          <strong>${t.reportKneeFlex || "Knee Flexion"} (${flexAngle}°):</strong><br>
          ${flexFeedback}
        `;
        if (bikeTypeSelect && bikeTypeSelect.value === 'triathlon') {
          fullFeedback += `
            <div class="aero-tips-card" style="margin-top: 15px;">
              ${t.triathlonAeroTips}
            </div>
          `;
        }
        openLightbox(
          minKneeAngleFrame.photo,
          t.tabFlexion || "Top Stroke (Max Flexion)",
          minKneeAngleFrame.angle,
          minKneeAngleFrame.data.hip_angle,
          minKneeAngleFrame.score,
          fullFeedback
        );
      }
    };
  }
  
  // Set tab texts dynamically according to active language
  const textTitle = document.getElementById('text-report-title');
  if (textTitle) textTitle.textContent = t.proReport || "Biomechanical Session Report";
  
  const tabExt = document.getElementById('btn-tab-extension');
  if (tabExt) tabExt.textContent = t.tabExtension || "Bottom Stroke (Max Extension)";
  
  const tabFlex = document.getElementById('btn-tab-flexion');
  if (tabFlex) tabFlex.textContent = t.tabFlexion || "Top Stroke (Max Flexion)";
  
  const tabsContainer = document.getElementById('report-tabs-container');
  const isDualStroke = maxKneeAngleFrame && minKneeAngleFrame && maxKneeAngleFrame.photo !== minKneeAngleFrame.photo;
  
  if (isDualStroke) {
    if (tabsContainer) tabsContainer.style.display = 'none';
    
    // Generate feedback text for extension
    const extAngle = Math.round(maxKneeAngleFrame.angle);
    let extFeedback = '';
    if (extAngle >= 135 && extAngle <= 145) {
      extFeedback = (t.reportIdealSaddle || '').replace('{angle}', extAngle);
    } else if (extAngle > 145) {
      extFeedback = (t.reportHighSaddle || '').replace('{angle}', extAngle);
    } else {
      extFeedback = (t.reportLowSaddle || '').replace('{angle}', extAngle);
    }
    
    // Generate feedback text for flexion
    const flexAngle = Math.round(minKneeAngleFrame.angle);
    const flexHipAngle = minKneeAngleFrame.data.hip_angle ? Math.round(minKneeAngleFrame.data.hip_angle) : null;
    
    let flexKneeFeedback = '';
    if (flexAngle >= 70 && flexAngle <= 80) {
      flexKneeFeedback = (t.reportIdealFlexion || '').replace('{angle}', flexAngle);
    } else if (flexAngle < 70) {
      flexKneeFeedback = (t.reportAcuteFlexion || '').replace('{angle}', flexAngle);
    } else {
      flexKneeFeedback = (t.reportInsufficientFlexion || '').replace('{angle}', flexAngle);
    }
    
    let flexHipFeedback = '';
    if (flexHipAngle) {
      if (flexHipAngle >= 45) {
        flexHipFeedback = (t.reportIdealHip || '').replace('{angle}', flexHipAngle);
      } else {
        flexHipFeedback = (t.reportClosedHip || '').replace('{angle}', flexHipAngle);
      }
    }
    
    let flexFeedback = `<strong>${t.reportKneeFlex || 'Knee Flexion'}:</strong><br>${flexKneeFeedback}`;
    if (flexHipAngle) {
      flexFeedback += `<br><br><strong>${t.reportHipAngle || 'Hip Angle'}:</strong><br>${flexHipFeedback}`;
    }
    
    let aeroCardHTML = '';
    if (bikeTypeSelect && bikeTypeSelect.value === 'triathlon') {
      aeroCardHTML = `
        <div class="aero-tips-card" style="margin-top: 4px;">
          ${t.triathlonAeroTips}
        </div>
      `;
    }
    
    content.innerHTML = `
      <!-- Card 1: Bottom Stroke (Extension) -->
      <div class="stacked-report-card" style="display:flex; flex-direction:column; gap:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:12px;">
        <h5 style="margin:0; font-size:0.8rem; color:var(--primary-light); font-weight:700; text-transform:uppercase;">${t.tabExtension || "Bottom Stroke (Max Extension)"}</h5>
        <div id="btn-report-lightbox-extension" style="position:relative; width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.1); overflow:hidden; background:#000; cursor:pointer;">
          <img src="${maxKneeAngleFrame.photo}" style="width:100%; display:block; object-fit:contain;" />
          <div class="zoom-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s ease;">
            <span style="background:rgba(0,0,0,0.8); color:white; padding:8px 16px; border-radius:20px; font-size:0.75rem; font-weight:700; border:1px solid rgba(255,255,255,0.2); box-shadow:0 4px 10px rgba(0,0,0,0.5); pointer-events:none;">🔍 ${t.clickToZoom || 'Click to Zoom'}</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.75rem; color:var(--text-dim); font-weight:600; text-transform:uppercase;">${t.reportKneeExt || "Knee Extension"}</span>
            <span style="font-size:1.1rem; font-weight:800; color:var(--primary-light);">${extAngle}°</span>
          </div>
          <div style="font-size:0.75rem; line-height:1.4; color:rgba(255,255,255,0.9); background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:10px;">
            ${extFeedback}
          </div>
        </div>
      </div>
      
      <!-- Card 2: Top Stroke (Flexion) -->
      <div class="stacked-report-card" style="display:flex; flex-direction:column; gap:8px; padding-top:4px;">
        <h5 style="margin:0; font-size:0.8rem; color:var(--primary-light); font-weight:700; text-transform:uppercase;">${t.tabFlexion || "Top Stroke (Max Flexion)"}</h5>
        <div id="btn-report-lightbox-flexion" style="position:relative; width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.1); overflow:hidden; background:#000; cursor:pointer;">
          <img src="${minKneeAngleFrame.photo}" style="width:100%; display:block; object-fit:contain;" />
          <div class="zoom-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s ease;">
            <span style="background:rgba(0,0,0,0.8); color:white; padding:8px 16px; border-radius:20px; font-size:0.75rem; font-weight:700; border:1px solid rgba(255,255,255,0.2); box-shadow:0 4px 10px rgba(0,0,0,0.5); pointer-events:none;">🔍 ${t.clickToZoom || 'Click to Zoom'}</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:4px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.75rem; color:var(--text-dim); font-weight:600; text-transform:uppercase;">${t.reportKneeFlex || "Knee Flexion"}</span>
            <span style="font-size:1.1rem; font-weight:800; color:var(--primary-light);">${flexAngle}°</span>
          </div>
          <div style="font-size:0.75rem; line-height:1.4; color:rgba(255,255,255,0.9); background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:10px;">
            ${flexFeedback}
          </div>
          ${aeroCardHTML}
        </div>
      </div>
    `;
    
    // Bind events for extension card
    const zoomExt = document.getElementById('btn-report-lightbox-extension');
    if (zoomExt) {
      const ov = zoomExt.querySelector('.zoom-overlay');
      zoomExt.addEventListener('mouseenter', () => ov.style.opacity = 1);
      zoomExt.addEventListener('mouseleave', () => ov.style.opacity = 0);
      zoomExt.addEventListener('click', () => {
        let fullFeedback = `
          <strong>${t.reportKneeExt || "Knee Extension"} (${extAngle}°):</strong><br>
          ${extFeedback}
        `;
        openLightbox(
          maxKneeAngleFrame.photo,
          t.tabExtension || "Bottom Stroke (Max Extension)",
          maxKneeAngleFrame.angle,
          maxKneeAngleFrame.data.hip_angle,
          maxKneeAngleFrame.score,
          fullFeedback
        );
      });
    }
    
    // Bind events for flexion card
    const zoomFlex = document.getElementById('btn-report-lightbox-flexion');
    if (zoomFlex) {
      const ov = zoomFlex.querySelector('.zoom-overlay');
      zoomFlex.addEventListener('mouseenter', () => ov.style.opacity = 1);
      zoomFlex.addEventListener('mouseleave', () => ov.style.opacity = 0);
      zoomFlex.addEventListener('click', () => {
        let fullFeedback = `
          <strong>${t.reportKneeFlex || "Knee Flexion"} (${flexAngle}°):</strong><br>
          ${flexFeedback}
        `;
        if (bikeTypeSelect && bikeTypeSelect.value === 'triathlon') {
          fullFeedback += `
            <div class="aero-tips-card" style="margin-top: 15px;">
              ${t.triathlonAeroTips}
            </div>
          `;
        }
        openLightbox(
          minKneeAngleFrame.photo,
          t.tabFlexion || "Top Stroke (Max Flexion)",
          minKneeAngleFrame.angle,
          minKneeAngleFrame.data.hip_angle,
          minKneeAngleFrame.score,
          fullFeedback
        );
      });
    }
  } else {
    if (tabsContainer) tabsContainer.style.display = 'flex';
    
    let frame = null;
    let tabName = '';
    let angleLabel = '';
    let feedbackText = '';
    
    if (activeReportTab === 'extension') {
      frame = maxKneeAngleFrame;
      tabName = t.tabExtension || "Bottom Stroke (Max Extension)";
      angleLabel = t.reportKneeExt || "Knee Extension";
      
      if (frame) {
        const angle = Math.round(frame.angle);
        if (angle >= 135 && angle <= 145) {
          feedbackText = (t.reportIdealSaddle || '').replace('{angle}', angle);
        } else if (angle > 145) {
          feedbackText = (t.reportHighSaddle || '').replace('{angle}', angle);
        } else {
          feedbackText = (t.reportLowSaddle || '').replace('{angle}', angle);
        }
      }
    } else {
      frame = minKneeAngleFrame;
      tabName = t.tabFlexion || "Top Stroke (Max Flexion)";
      angleLabel = t.reportKneeFlex || "Knee Flexion";
      
      if (frame) {
        const kneeAngle = Math.round(frame.angle);
        const hipAngle = frame.data.hip_angle ? Math.round(frame.data.hip_angle) : null;
        
        let kneeFeedback = '';
        if (kneeAngle >= 70 && kneeAngle <= 80) {
          kneeFeedback = (t.reportIdealFlexion || '').replace('{angle}', kneeAngle);
        } else if (kneeAngle < 70) {
          kneeFeedback = (t.reportAcuteFlexion || '').replace('{angle}', kneeAngle);
        } else {
          kneeFeedback = (t.reportInsufficientFlexion || '').replace('{angle}', kneeAngle);
        }
        
        let hipFeedback = '';
        if (hipAngle) {
          if (hipAngle >= 45) {
            hipFeedback = (t.reportIdealHip || '').replace('{angle}', hipAngle);
          } else {
            hipFeedback = (t.reportClosedHip || '').replace('{angle}', hipAngle);
          }
        }
        
        feedbackText = `<strong>${t.reportKneeFlex || 'Knee Flexion'}:</strong><br>${kneeFeedback}`;
        if (hipAngle) {
          feedbackText += `<br><br><strong>${t.reportHipAngle || 'Hip Angle'}:</strong><br>${hipFeedback}`;
        }
      }
    }
    
    if (frame) {
      let aeroCardHTML = '';
      if (bikeTypeSelect && bikeTypeSelect.value === 'triathlon') {
        aeroCardHTML = `
          <div class="aero-tips-card">
            ${t.triathlonAeroTips}
          </div>
        `;
      }

      content.innerHTML = `
        <div id="btn-report-lightbox" style="position:relative; width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.1); overflow:hidden; background:#000; cursor:pointer;">
          <img src="${frame.photo}" style="width:100%; display:block; object-fit:contain;" />
          <div class="zoom-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity 0.2s ease;">
            <span style="background:rgba(0,0,0,0.8); color:white; padding:8px 16px; border-radius:20px; font-size:0.75rem; font-weight:700; border:1px solid rgba(255,255,255,0.2); box-shadow:0 4px 10px rgba(0,0,0,0.5); pointer-events:none;">🔍 ${t.clickToZoom || 'Click to Zoom'}</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px; margin-top:5px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; color:var(--text-dim); font-weight:600; text-transform:uppercase;">${angleLabel}</span>
            <span style="font-size:1.2rem; font-weight:800; color:var(--primary-light);">${Math.round(frame.angle)}°</span>
          </div>
          <div style="font-size:0.8rem; line-height:1.4; color:rgba(255,255,255,0.9); background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:12px; margin-top:4px;">
            ${feedbackText}
          </div>
          ${aeroCardHTML}
        </div>
      `;
      
      // Attach event listeners for hover overlay and click lightbox zoom
      const zoomContainer = document.getElementById('btn-report-lightbox');
      if (zoomContainer) {
        const overlay = zoomContainer.querySelector('.zoom-overlay');
        zoomContainer.addEventListener('mouseenter', () => overlay.style.opacity = 1);
        zoomContainer.addEventListener('mouseleave', () => overlay.style.opacity = 0);
        
        zoomContainer.addEventListener('click', () => {
          let fullFeedback = `
            <strong>${angleLabel} (${Math.round(frame.angle)}°):</strong><br>
            ${feedbackText}
          `;
          if (bikeTypeSelect && bikeTypeSelect.value === 'triathlon') {
            fullFeedback += `
              <div class="aero-tips-card" style="margin-top: 15px;">
                ${t.triathlonAeroTips}
              </div>
            `;
          }
          openLightbox(
            frame.photo,
            tabName,
            frame.angle,
            frame.data.hip_angle,
            frame.score,
            fullFeedback
          );
        });
      }
    } else {
      content.innerHTML = `
        <div style="text-align:center; padding:30px 10px; color:var(--muted); font-size:0.8rem; border:1px dashed var(--border); border-radius:8px;">
          <p style="font-size:1.5rem; margin-bottom:8px;">⏱️</p>
          <p>${t.reportAwaitingPhotos || "Awaiting dynamic capture..."}</p>
        </div>
      `;
    }
  }
}

function showComparisonSessionResults() {
  const t = translations[currentLang] || translations.en;
  
  if (maxKneeAngleFrame) {
    if (compCurrImg) {
      compCurrImg.src = maxKneeAngleFrame.photo;
      
      const saddleCm = document.getElementById('val-saddle-height').textContent;
      const kopsCm = document.getElementById('val-kops').textContent;
      let metricsStr = `<strong>Knee:</strong> ${Math.round(maxKneeAngleFrame.angle)}° | <strong>Hip:</strong> ${Math.round(maxKneeAngleFrame.data.hip_angle)}°<br><strong>Score:</strong> ${maxKneeAngleFrame.score}%`;
      if (saddleCm && saddleCm !== '--') {
        metricsStr += `<br><strong>Saddle:</strong> ${saddleCm} | <strong>KOPS:</strong> ${kopsCm}`;
      }
      compCurrMetrics.innerHTML = metricsStr;
      
      currSnapshot = maxKneeAngleFrame.photo;
      currSnapshotData = {
        src: maxKneeAngleFrame.photo,
        data: maxKneeAngleFrame.data,
        score: maxKneeAngleFrame.score,
        feedbackText: `
          <strong>${t.labelKnee || 'Knee'}:</strong> ${Math.round(maxKneeAngleFrame.angle)}°<br>
          <strong>${t.labelHip || 'Hip'}:</strong> ${Math.round(maxKneeAngleFrame.data.hip_angle)}°<br>
          <strong>${t.labelElbow || 'Elbow'}:</strong> ${Math.round(maxKneeAngleFrame.data.elbow_angle)}°<br>
          <strong>${t.labelTorso || 'Torso'}:</strong> ${Math.round(maxKneeAngleFrame.data.torso_angle)}°<br>
          <strong>${t.labelAnkle || 'Ankle'}:</strong> ${Math.round(maxKneeAngleFrame.data.ankle_angle)}°
        `
      };
    }
  }
  
  if (previousRunBDCFrame) {
    if (compPrevImg) {
      compPrevImg.src = previousRunBDCFrame.photo;
      compPrevImg.style.display = 'block';
      
      let metricsStr = `<strong>Knee:</strong> ${Math.round(previousRunBDCFrame.angle)}° | <strong>Hip:</strong> ${Math.round(previousRunBDCFrame.data.hip_angle)}°<br><strong>Score:</strong> ${previousRunBDCFrame.score}%`;
      compPrevMetrics.innerHTML = metricsStr;
      
      prevSnapshot = previousRunBDCFrame.photo;
      prevSnapshotData = {
        src: previousRunBDCFrame.photo,
        data: previousRunBDCFrame.data,
        score: previousRunBDCFrame.score,
        feedbackText: `
          <strong>${t.labelKnee || 'Knee'}:</strong> ${Math.round(previousRunBDCFrame.angle)}°<br>
          <strong>${t.labelHip || 'Hip'}:</strong> ${Math.round(previousRunBDCFrame.data.hip_angle)}°<br>
          <strong>${t.labelElbow || 'Elbow'}:</strong> ${Math.round(previousRunBDCFrame.data.elbow_angle)}°<br>
          <strong>${t.labelTorso || 'Torso'}:</strong> ${Math.round(previousRunBDCFrame.data.torso_angle)}°<br>
          <strong>${t.labelAnkle || 'Ankle'}:</strong> ${Math.round(previousRunBDCFrame.data.ankle_angle)}°
        `
      };
    }
  }
  
  if (compContainer && maxKneeAngleFrame) {
    compContainer.style.display = 'flex';
    // Ensure photos are visible by scrolling sidebar to top
    const scrollArea = document.querySelector('.results-scroll-area');
    if (scrollArea) scrollArea.scrollTop = 0;
  }
}

function getHipShift(fromSlot, toSlot) {
  let dx = 0, dy = 0;
  if (!multiPhotoBottomData || !multiPhotoBottomData.keypoints || !multiPhotoTopData || !multiPhotoTopData.keypoints) {
    return { dx, dy };
  }
  
  const bottomKps = multiPhotoBottomData.keypoints;
  const topKps = multiPhotoTopData.keypoints;
  
  if (bottomKps.hip && topKps.hip) {
    const bottomHipX = bottomKps.hip[0];
    const bottomHipY = bottomKps.hip[1];
    const topHipX = topKps.hip[0];
    const topHipY = topKps.hip[1];
    
    if (fromSlot === 'bottom' && toSlot === 'top') {
      dx = topHipX - bottomHipX;
      dy = topHipY - bottomHipY;
    } else if (fromSlot === 'top' && toSlot === 'bottom') {
      dx = bottomHipX - topHipX;
      dy = bottomHipY - topHipY;
    }
  }
  return { dx, dy };
}

function getShiftedPinsAndScale(targetCanvas) {
  let activePins = [];
  let activePixelToCm = null;
  
  if (targetCanvas === overlaySlotBottom) {
    if (calibPinsBottom.length === 4) {
      activePins = calibPinsBottom;
      activePixelToCm = pixelToCmBottom;
    } else if (calibPinsTop.length === 4) {
      const shift = getHipShift('top', 'bottom');
      activePins = calibPinsTop.map(p => ({
        label: p.label,
        x: p.x + shift.dx,
        y: p.y + shift.dy
      }));
      activePixelToCm = pixelToCmTop;
    } else {
      activePins = calibPins;
      activePixelToCm = pixelToCm;
    }
  } else if (targetCanvas === overlaySlotTop) {
    if (calibPinsTop.length === 4) {
      activePins = calibPinsTop;
      activePixelToCm = pixelToCmTop;
    } else if (calibPinsBottom.length === 4) {
      const shift = getHipShift('bottom', 'top');
      activePins = calibPinsBottom.map(p => ({
        label: p.label,
        x: p.x + shift.dx,
        y: p.y + shift.dy
      }));
      activePixelToCm = pixelToCmBottom;
    } else {
      activePins = calibPins;
      activePixelToCm = pixelToCm;
    }
  } else {
    // Main overlayCanvas (during calibration modal or live mode)
    if (isCalibrating) {
      activePins = calibPins;
      if (calibPins.length === 4) {
        const fw = calibPins[0];
        const rw = calibPins[1];
        const wheelbasePixels = Math.sqrt((fw.x - rw.x)**2 + (fw.y - rw.y)**2);
        activePixelToCm = ((bikeMetadata.wheelbase || 990) / 10) / wheelbasePixels;
      }
    } else if (isMultiPhotoMode) {
      if (activeCalibSlot === 'bottom') {
        if (calibPinsBottom.length === 4) {
          activePins = calibPinsBottom;
          activePixelToCm = pixelToCmBottom;
        } else if (calibPinsTop.length === 4) {
          const shift = getHipShift('top', 'bottom');
          activePins = calibPinsTop.map(p => ({ ...p, x: p.x + shift.dx, y: p.y + shift.dy }));
          activePixelToCm = pixelToCmTop;
        } else {
          activePins = calibPins;
          activePixelToCm = pixelToCm;
        }
      } else if (activeCalibSlot === 'top') {
        if (calibPinsTop.length === 4) {
          activePins = calibPinsTop;
          activePixelToCm = pixelToCmTop;
        } else if (calibPinsBottom.length === 4) {
          const shift = getHipShift('bottom', 'top');
          activePins = calibPinsBottom.map(p => ({ ...p, x: p.x + shift.dx, y: p.y + shift.dy }));
          activePixelToCm = pixelToCmBottom;
        } else {
          activePins = calibPins;
          activePixelToCm = pixelToCm;
        }
      }
    } else {
      activePins = calibPins;
      activePixelToCm = pixelToCm;
    }
  }
  
  return { pins: activePins, scale: activePixelToCm };
}

function drawOverlay(kps, imgW = null, imgH = null, targetCanvas = overlayCanvas, targetSource = null, data = null) {
  if (!targetCanvas) return;
  
  // Resolve keypoints, dimensions, and data from caches if kps is empty/null
  if (!kps || Object.keys(kps).length === 0) {
    if (targetCanvas === overlaySlotBottom) {
      if (multiPhotoBottomData && multiPhotoBottomData.keypoints) {
        kps = multiPhotoBottomData.keypoints;
        imgW = multiPhotoBottomData.width;
        imgH = multiPhotoBottomData.height;
        data = multiPhotoBottomData;
      }
    } else if (targetCanvas === overlaySlotTop) {
      if (multiPhotoTopData && multiPhotoTopData.keypoints) {
        kps = multiPhotoTopData.keypoints;
        imgW = multiPhotoTopData.width;
        imgH = multiPhotoTopData.height;
        data = multiPhotoTopData;
      }
    } else if (targetCanvas === overlayCanvas) {
      if (isMultiPhotoMode) {
        if (activeCalibSlot === 'bottom' && multiPhotoBottomData && multiPhotoBottomData.keypoints) {
          kps = multiPhotoBottomData.keypoints;
          imgW = multiPhotoBottomData.width;
          imgH = multiPhotoBottomData.height;
          data = multiPhotoBottomData;
        } else if (activeCalibSlot === 'top' && multiPhotoTopData && multiPhotoTopData.keypoints) {
          kps = multiPhotoTopData.keypoints;
          imgW = multiPhotoTopData.width;
          imgH = multiPhotoTopData.height;
          data = multiPhotoTopData;
        }
      } else {
        if (latestSinglePoseData && latestSinglePoseData.keypoints) {
          kps = latestSinglePoseData.keypoints;
          imgW = latestSinglePoseData.width;
          imgH = latestSinglePoseData.height;
          data = latestSinglePoseData;
        }
      }
    }
  }

  const ctx = targetCanvas.getContext('2d');
  const isImage = (photoViewer && photoViewer.style.display === 'block') || (targetSource && targetSource.tagName === 'IMG');
  targetCanvas.style.objectFit = isImage ? 'contain' : 'cover';
  const source = targetSource || (isImage ? photoViewer : video);
  const vW = imgW || source.videoWidth || source.naturalWidth || 640;
  const vH = imgH || source.videoHeight || source.naturalHeight || 480;
  targetCanvas.width = vW;
  targetCanvas.height = vH;
  ctx.clearRect(0, 0, vW, vH);
  const t = translations[currentLang];
  
  let scaleX = 1, scaleY = 1, offsetX = 0, offsetY = 0;
  
  // Coordinate Scaling Logic: Detect if AI returned normalized or pixel-scaled coordinates
  if (kps && kps.hip) {
    if (imgW && imgH) {
       // If backend returned exact processing dimensions, use them for perfect scaling
       scaleX = vW / imgW;
       scaleY = vH / imgH;
    } else {
       const maxVal = Math.max(...Object.values(kps).flat().filter(v => typeof v === 'number'));
       if (maxVal <= 1.1) {
          // Normalized 0-1 (e.g. MediaPipe backend)
          scaleX = vW;
          scaleY = vH;
       } else {
          // Pixel space returned by the API (which ran on the resized sent image)
          scaleX = vW / lastSentDimensions.width;
          scaleY = vH / lastSentDimensions.height;
       }
    }
  }
  
  const resolved = getShiftedPinsAndScale(targetCanvas);
  let activePins = resolved.pins;
  let activePixelToCm = resolved.scale;
  
  const dynamicTrackingToggle = document.getElementById('dynamic-tracking-toggle');
  const isDynamicTracking = dynamicTrackingToggle && dynamicTrackingToggle.checked;
  
  const isStatic = isImage || targetCanvas === overlaySlotBottom || targetCanvas === overlaySlotTop || isCalibrating;
  
  // 1. Rigid-Body Tracking of Custom Calibration Pins (If manual calibration is placed!)
  if (activePins.length === 4) {
    if (!isStatic && kps && kps.hip) {
      const currentHipX = kps.hip[0] * scaleX + offsetX;
      const currentHipY = kps.hip[1] * scaleY + offsetY;
      
      if (calibrationHipX === null || calibrationHipY === null) {
        // Anchor the custom calibration pins to the cyclist's hip at this moment
        calibrationHipX = currentHipX;
        calibrationHipY = currentHipY;
      }
      
      // Calculate the cyclist's movement offset relative to their calibration frame
      const dx = currentHipX - calibrationHipX;
      const dy = currentHipY - calibrationHipY;
      
      activePins = activePins.map(p => ({
        ...p,
        x: p.x + dx,
        y: p.y + dy
      }));
    }
  }
  // 2. Fallback to Dynamic AI Estimation (If manual calibration is not set or Dynamic Tracking is explicitly selected)
  else if (isDynamicTracking && kps && kps.hip && kps.knee && kps.ankle) {
    const hipX = kps.hip[0] * scaleX + offsetX;
    const hipY = kps.hip[1] * scaleY + offsetY;
    const kneeX = kps.knee[0] * scaleX + offsetX;
    const kneeY = kps.knee[1] * scaleY + offsetY;
    const ankleX = kps.ankle[0] * scaleX + offsetX;
    const ankleY = kps.ankle[1] * scaleY + offsetY;
    
    const thighLen = Math.sqrt((kneeX - hipX)**2 + (kneeY - hipY)**2);
    const shinLen = Math.sqrt((ankleX - kneeX)**2 + (ankleY - kneeY)**2);
    const currentLegLen = thighLen + shinLen;
    
    // Smooth the leg length calculation to prevent dynamic wobble during pedaling
    if (!stableLegLen) {
      stableLegLen = currentLegLen;
    } else {
      stableLegLen = stableLegLen * 0.95 + currentLegLen * 0.05;
    }
    
    // Facing direction detection (left vs right)
    const facingLeft = kneeX < hipX;
    const dirMultiplier = facingLeft ? -1 : 1;
    
    // Bottom Bracket is located vertically down and slightly forward of the hip
    const bbX = hipX + dirMultiplier * stableLegLen * 0.18;
    const bbY = hipY + stableLegLen * 0.80;
    
    // Saddle is directly below the hip joint
    const saddleX = hipX;
    const saddleY = hipY + stableLegLen * 0.04;
    
    // Front hub and rear hub are forward and backward relative to BB
    const fwX = bbX + dirMultiplier * stableLegLen * 0.72;
    const fwY = bbY + stableLegLen * 0.05;
    
    const rwX = bbX - dirMultiplier * stableLegLen * 0.72;
    const rwY = bbY + stableLegLen * 0.05;
    
    activePins = [
      { label: t.pinFWheel || 'Front Wheel', x: fwX, y: fwY },
      { label: t.pinRWheel || 'Rear Wheel', x: rwX, y: rwY },
      { label: t.pinBB || 'Bottom Bracket', x: bbX, y: bbY },
      { label: t.pinSaddle || 'Saddle', x: saddleX, y: saddleY }
    ];
    
    const wheelbasePixels = Math.abs(fwX - rwX);
    activePixelToCm = 99 / wheelbasePixels; // 99cm is standard wheelbase length
  }
  
  if (activePins.length > 0) {
    const scale = Math.max(1, targetCanvas.width / 640);
    const fontSize = Math.round(16 * scale);
    const pinRadius = Math.round(8 * scale);
    const textOffset = Math.round(14 * scale);
    ctx.font = `bold ${fontSize}px Inter, sans-serif`;
    activePins.forEach((p, i) => {
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4 * scale;
      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      ctx.arc(p.x, p.y, pinRadius, 0, 2*Math.PI);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = Math.max(2, 2 * scale);
      ctx.stroke();
      ctx.shadowBlur = 2 * scale;
      ctx.fillStyle = 'white';
      const label = i === 0 ? t.pinFWheel : i === 1 ? t.pinRWheel : i === 2 ? t.pinBB : t.pinSaddle;
      ctx.fillText(label, p.x + textOffset, p.y + (fontSize/3));
    });
    ctx.shadowBlur = 0;
    if (activePins.length >= 2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(activePins[0].x, activePins[0].y);
      ctx.lineTo(activePins[1].x, activePins[1].y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (kps && kps.hip && kps.knee && kps.ankle) {
    const scale = Math.max(1, targetCanvas.width / 640);
    ctx.lineWidth = Math.max(3, 4 * scale);
    ctx.lineCap = 'round';
    ctx.font = `bold ${Math.round(18 * scale)}px Inter, sans-serif`;

    // Use the precise keypoints detected by YOLO to guarantee exact skeletal alignment
    const adjustedKnee = kps.knee;
    const adjustedAnkle = kps.ankle;

    const joints = {
      shoulder: kps.shoulder, 
      hip: kps.hip, 
      knee: adjustedKnee,
      ankle: adjustedAnkle, 
      elbow: kps.elbow, 
      wrist: kps.wrist,
      foot: kps.foot || null
    };

    const drawLine = (p1, p2, color, extendFactor = 0) => {
      if (!p1 || !p2) return;
      ctx.strokeStyle = color;
      ctx.beginPath();
      const x1 = p1[0] * scaleX + offsetX;
      const y1 = p1[1] * scaleY + offsetY;
      let x2 = p2[0] * scaleX + offsetX;
      let y2 = p2[1] * scaleY + offsetY;
      
      if (extendFactor > 0) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        x2 = x2 + dx * extendFactor;
        y2 = y2 + dy * extendFactor;
      }
      
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    drawLine(joints.shoulder, joints.hip, '#06b6d4');
    drawLine(joints.hip, joints.knee, '#6366f1');
    drawLine(joints.knee, joints.ankle, '#6366f1', 0); // Drew directly to adjusted ankle (no weird tail!)
    if (joints.foot) {
      drawLine(joints.ankle, joints.foot, '#6366f1');
    }
    drawLine(joints.shoulder, joints.elbow, '#a855f7');
    drawLine(joints.elbow, joints.wrist, '#a855f7');

    const drawJoint = (p, label, color) => {
      if (!p) return;
      const x = p[0] * scaleX + offsetX;
      const y = p[1] * scaleY + offsetY;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 6 * scale, 0, 2*Math.PI);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
      if (label && label !== '--°' && label !== '--') {
        ctx.fillStyle = 'white';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4 * scale;
        ctx.fillText(label, x + 12 * scale, y - 12 * scale);
        ctx.shadowBlur = 0;
      }
    };

    const getVal = (id, key) => {
      if (data && data[key + '_angle'] !== undefined) {
        return Math.round(data[key + '_angle']) + '°';
      }
      const el = document.getElementById(id);
      return el ? el.textContent : '--';
    };
    drawJoint(joints.hip, getVal('val-hip', 'hip'), '#6366f1');
    drawJoint(joints.knee, getVal('val-knee', 'knee'), '#6366f1');
    drawJoint(joints.shoulder, getVal('val-torso', 'torso'), '#06b6d4');
    drawJoint(joints.elbow, getVal('val-elbow', 'elbow'), '#a855f7');
    drawJoint(joints.ankle, getVal('val-ankle', 'ankle'), '#6366f1');
    if (joints.foot) {
      drawJoint(joints.foot, null, '#6366f1');
    }

    if (activePins.length === 4 && activePixelToCm) {
      const bb = activePins[2];
      // Scale keypoints to full resolution space to match calibration pins correctly
      const hipX = kps.hip[0] * scaleX + offsetX;
      const hipY = kps.hip[1] * scaleY + offsetY;
      const kneeX = kps.knee[0] * scaleX + offsetX;
      
      const dx = hipX - bb.x;
      const dy = hipY - bb.y;
      const saddleHeightCm = Math.sqrt(dx*dx + dy*dy) * activePixelToCm;
      const kopsCm = (kneeX - bb.x) * activePixelToCm;
      
      // Check if this canvas represents the extension slot (larger knee angle in multi-photo)
      let isExtensionCanvas = true;
      if (isMultiPhotoMode && multiPhotoBottomData && multiPhotoTopData) {
        const angleBottom = parseFloat(multiPhotoBottomData.knee_angle) || 0;
        const angleTop = parseFloat(multiPhotoTopData.knee_angle) || 0;
        const extCanvas = angleBottom >= angleTop ? overlaySlotBottom : overlaySlotTop;
        isExtensionCanvas = (targetCanvas === extCanvas);
      }
      
      if (isExtensionCanvas) {
        // Update sidebar DOM elements
        document.getElementById('r-metrics').style.display = 'block';
        valSaddleHeight.textContent = saddleHeightCm.toFixed(1) + " cm";
        valKops.textContent = kopsCm.toFixed(1) + " cm";
        
        // Update active ratio text
        const ratioVal = 1 / activePixelToCm;
        const ratioLabel = document.getElementById('val-wheelbase-text');
        if (ratioLabel) {
          ratioLabel.textContent = `${t.proRatio || 'Ratio'}: ${ratioVal.toFixed(2)} px/cm`;
        }
      }
      
      // Draw premium glassmorphic HUD box on right side of canvas (top right)
      const scale = Math.max(1, targetCanvas.width / 640);
      const hudW = Math.round(200 * scale);
      const hudH = Math.round(92 * scale);
      const hudX = Math.round(targetCanvas.width - hudW - 20 * scale);
      const hudY = Math.round(20 * scale);
      const radius = Math.round(12 * scale);
      
      ctx.save();
      
      // Glassmorphic translucent panel background
      ctx.fillStyle = 'rgba(15, 16, 32, 0.88)';
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
      ctx.lineWidth = Math.max(1, 1.5 * scale);
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 12 * scale;
      
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(hudX, hudY, hudW, hudH, radius);
      } else {
        ctx.arc(hudX + radius, hudY + radius, radius, Math.PI, 1.5 * Math.PI);
        ctx.lineTo(hudX + hudW - radius, hudY);
        ctx.arc(hudX + hudW - radius, hudY + radius, radius, 1.5 * Math.PI, 2 * Math.PI);
        ctx.lineTo(hudX + hudW, hudY + hudH - radius);
        ctx.arc(hudX + hudW - radius, hudY + hudH - radius, radius, 0, 0.5 * Math.PI);
        ctx.lineTo(hudX + radius, hudY + hudH);
        ctx.arc(hudX + radius, hudY + hudH - radius, radius, 0.5 * Math.PI, Math.PI);
        ctx.closePath();
      }
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
      ctx.stroke();
      
      // HUD Title
      ctx.font = `bold ${Math.round(10 * scale)}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText((t.proReport || 'Biomechanical Fit').toUpperCase(), hudX + 14 * scale, hudY + 20 * scale);
      
      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hudX + 12 * scale, hudY + 28 * scale);
      ctx.lineTo(hudX + hudW - 12 * scale, hudY + 28 * scale);
      ctx.stroke();
      
      // Active KOPS feedback styling
      const kopsColor = (kopsCm >= -1.5 && kopsCm <= 1.5) ? '#22c55e' : (kopsCm >= -3 && kopsCm <= 3) ? '#f59e0b' : '#ef4444';
      
      const hudMetrics = [
        { label: t.metricSaddle || 'Saddle Height', value: `${saddleHeightCm.toFixed(1)} cm`, valColor: '#818cf8' },
        { label: t.metricKops || 'KOPS', value: `${kopsCm.toFixed(1)} cm`, valColor: kopsColor },
        { label: t.proRatio || 'Ratio', value: `${ratioVal.toFixed(2)} px/cm`, valColor: 'rgba(255, 255, 255, 0.7)' }
      ];
      
      let startY = hudY + 46 * scale;
      hudMetrics.forEach(m => {
        ctx.font = `500 ${Math.round(9.5 * scale)}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillText(m.label, hudX + 14 * scale, startY);
        
        ctx.font = `bold ${Math.round(11 * scale)}px Inter, sans-serif`;
        ctx.fillStyle = m.valColor;
        ctx.shadowColor = 'transparent';
        ctx.textAlign = 'right';
        ctx.fillText(m.value, hudX + hudW - 14 * scale, startY);
        ctx.textAlign = 'left'; // Reset text-align
        startY += 18 * scale;
      });
      
      ctx.restore();
    }

    // Draw premium glassmorphic Biomechanical Fit Report HUD panel on the top-left of the canvas
    if (data) {
      const hudW = Math.round(250 * scale);
      const hudH = Math.round(195 * scale);
      const hudX = Math.round(20 * scale);
      const hudY = Math.round(20 * scale);
      const radius = Math.round(12 * scale);
      
      ctx.save();
      
      // Glassmorphic translucent panel background
      ctx.fillStyle = 'rgba(15, 16, 32, 0.88)';
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
      ctx.lineWidth = Math.max(1, 1.5 * scale);
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 12 * scale;
      
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(hudX, hudY, hudW, hudH, radius);
      } else {
        ctx.arc(hudX + radius, hudY + radius, radius, Math.PI, 1.5 * Math.PI);
        ctx.lineTo(hudX + hudW - radius, hudY);
        ctx.arc(hudX + hudW - radius, hudY + radius, radius, 1.5 * Math.PI, 2 * Math.PI);
        ctx.lineTo(hudX + hudW, hudY + hudH - radius);
        ctx.arc(hudX + hudW - radius, hudY + hudH - radius, radius, 0, 0.5 * Math.PI);
        ctx.lineTo(hudX + radius, hudY + hudH);
        ctx.arc(hudX + radius, hudY + hudH - radius, radius, 0.5 * Math.PI, Math.PI);
        ctx.closePath();
      }
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
      ctx.stroke();
      
      // HUD Title
      ctx.font = `bold ${Math.round(10 * scale)}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      const reportTitle = (t.proReport || 'Biomechanical Fit Report').toUpperCase();
      ctx.fillText(reportTitle, hudX + 14 * scale, hudY + 20 * scale);
      
      // Calculate and draw overall score
      const feedbacks = [data.knee_feedback, data.hip_feedback, data.elbow_feedback, data.torso_feedback, data.ankle_feedback];
      const idealCount = feedbacks.filter(f => f && f.toLowerCase().includes('ideal')).length;
      const scoreVal = Math.round((idealCount / feedbacks.length) * 100);
      
      ctx.font = `bold ${Math.round(11 * scale)}px Inter, sans-serif`;
      ctx.fillStyle = '#818cf8';
      ctx.textAlign = 'right';
      ctx.fillText(`${t.scoreLabel || 'Score'}: ${scoreVal}%`, hudX + hudW - 14 * scale, hudY + 20 * scale);
      ctx.textAlign = 'left';
      
      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hudX + 12 * scale, hudY + 28 * scale);
      ctx.lineTo(hudX + hudW - 12 * scale, hudY + 28 * scale);
      ctx.stroke();
      
      // Render the 5 joint metrics: Knee, Hip, Elbow, Torso, Ankle
      const metrics = [
        { key: 'knee', label: t.labelKnee || 'Knee Angle', angle: data.knee_angle, feedback: data.knee_feedback },
        { key: 'hip', label: t.labelHip || 'Hip Angle', angle: data.hip_angle, feedback: data.hip_feedback },
        { key: 'elbow', label: t.labelElbow || 'Elbow Angle', angle: data.elbow_angle, feedback: data.elbow_feedback },
        { key: 'torso', label: t.labelTorso || 'Torso Angle', angle: data.torso_angle, feedback: data.torso_feedback },
        { key: 'ankle', label: t.labelAnkle || 'Ankle Angle', angle: data.ankle_angle, feedback: data.ankle_feedback }
      ];
      
      let startY = hudY + 44 * scale;
      metrics.forEach(m => {
        if (m.angle !== undefined) {
          ctx.font = `500 ${Math.round(9 * scale)}px Inter, sans-serif`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.fillText(m.label, hudX + 14 * scale, startY);
          
          // Translate feedback and choose color based on correctness
          const feedbackTranslated = translateFeedback(m.feedback, m.key);
          const lowerFeedback = m.feedback ? m.feedback.toLowerCase() : '';
          let valColor = '#ef4444'; // default red
          if (lowerFeedback.includes('ideal')) {
            valColor = '#22c55e'; // green
          } else if (lowerFeedback.includes('saddle') || lowerFeedback.includes('handlebar') || lowerFeedback.includes('elbow') || lowerFeedback.includes('heel')) {
            valColor = '#f59e0b'; // amber/orange
          }
          
          ctx.font = `bold ${Math.round(10.5 * scale)}px Inter, sans-serif`;
          ctx.fillStyle = 'white';
          ctx.textAlign = 'right';
          ctx.fillText(`${Math.round(m.angle)}°`, hudX + hudW - 14 * scale - 75 * scale, startY);
          
          ctx.font = `500 ${Math.round(8.5 * scale)}px Inter, sans-serif`;
          ctx.fillStyle = valColor;
          ctx.fillText(feedbackTranslated, hudX + hudW - 14 * scale, startY);
          
          ctx.textAlign = 'left';
          startY += 28 * scale; // spacing between metrics
        }
      });
      
      ctx.restore();
    }
  }
}

function startLiveMode() {
  if (liveInterval || isLockStepActive) return;
  if (!stream && !video.src) return;
  
  // Save previous completed run BDC frame for comparison before resetting
  if (maxKneeAngleFrame) {
    previousRunBDCFrame = maxKneeAngleFrame;
  }
  
  // Reset session frames for dynamic report
  maxKneeAngleFrame = null;
  minKneeAngleFrame = null;
  const reportCard = document.getElementById('session-report-card');
  if (reportCard) reportCard.style.display = 'none';
  
  if (video.src && !video.srcObject) {
    video.pause();
    isLockStepActive = true;
    runLockStepScan();
  } else {
    liveInterval = setInterval(analyze, 1500);
  }
  if (liveModeToggle) liveModeToggle.checked = true;
}

function stopLiveMode() {
  if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
  isLockStepActive = false;
  if (liveModeToggle) liveModeToggle.checked = false;
  showComparisonSessionResults();
}

async function runLockStepScan() {
  if (!isLockStepActive) return;
  if (video.ended || video.currentTime >= video.duration - 0.05) {
    console.log("Video ended. Stopping Lock-Step scan.");
    isLockStepActive = false;
    stopLiveMode();
    return;
  }
  
  // Capture base64 from current frame
  const base64 = captureBase64();
  currSnapshot = base64; // Cache snapshot of current frame
  
  // Run analysis for this exact pre-captured base64
  await analyze(base64);
}

function advanceLockStepVideo() {
  if (!isLockStepActive) return;
  
  const nextTime = video.currentTime + 0.15; // Advance by 150ms (~5 frames)
  if (nextTime >= video.duration - 0.05) {
    console.log("Video reached the end. Stopping Lock-Step.");
    isLockStepActive = false;
    stopLiveMode();
    
    // Reset UI from fullscreen zoom back to normal
    document.getElementById('video-box').classList.remove('calibration-zoom');
    const fsControls = document.getElementById('fullscreen-controls');
    if (fsControls) fsControls.style.display = 'none';
    
    const workspaceTitle = document.getElementById('label-workspace-title');
    if (workspaceTitle) {
      workspaceTitle.textContent = "🏁 ANALYSIS COMPLETE";
      setTimeout(() => {
        workspaceTitle.textContent = translations[currentLang].proWorkspace || "Live Analysis Workspace";
      }, 5000);
    }
  } else {
    video.currentTime = nextTime;
    
    // Wait for seeking to complete before capturing the next frame!
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      setTimeout(() => {
        if (isLockStepActive) {
          runLockStepScan();
        }
      }, 100);
    };
    video.addEventListener('seeked', onSeeked);
  }
}

// ===== EVENT LISTENERS =====
btnStart.addEventListener('click', startCamera);
btnStop.addEventListener('click', stopCamera);
if (btnSwitchCamera) btnSwitchCamera.addEventListener('click', switchCamera);

const btnTabExtension = document.getElementById('btn-tab-extension');
const btnTabFlexion = document.getElementById('btn-tab-flexion');

if (btnTabExtension) {
  btnTabExtension.addEventListener('click', () => {
    activeReportTab = 'extension';
    btnTabExtension.style.background = 'var(--primary)';
    btnTabExtension.style.color = 'white';
    if (btnTabFlexion) {
      btnTabFlexion.style.background = 'transparent';
      btnTabFlexion.style.color = 'var(--muted)';
    }
    updateReportUI();
  });
}

if (btnTabFlexion) {
  btnTabFlexion.addEventListener('click', () => {
    activeReportTab = 'flexion';
    btnTabFlexion.style.background = 'var(--primary)';
    btnTabFlexion.style.color = 'white';
    if (btnTabExtension) {
      btnTabExtension.style.background = 'transparent';
      btnTabExtension.style.color = 'var(--muted)';
    }
    updateReportUI();
  });
}

if (liveModeToggle) {
  liveModeToggle.addEventListener('change', () => {
    const labelDelay = document.getElementById('label-container-delay');
    const labelDynamic = document.getElementById('label-container-dynamic');
    const checkDelay = document.getElementById('check-delay');
    const checkDynamic = document.getElementById('dynamic-tracking-toggle');
    
    if (liveModeToggle.checked) {
      startLiveMode();
      if (labelDelay) labelDelay.classList.add('disabled-toggle');
      if (labelDynamic) labelDynamic.classList.add('disabled-toggle');
      if (checkDelay) checkDelay.disabled = true;
      if (checkDynamic) checkDynamic.disabled = true;
    } else {
      stopLiveMode();
      if (labelDelay) labelDelay.classList.remove('disabled-toggle');
      if (labelDynamic) labelDynamic.classList.remove('disabled-toggle');
      if (checkDelay) checkDelay.disabled = false;
      if (checkDynamic) checkDynamic.disabled = false;
    }
  });
}

async function analyzeFullVideo(file) {
  if (isAnalyzing) return;
  isAnalyzing = true;
  showLoading();

  // Show a beautiful, high-tech loading state with full explanations
  const loadingText = document.getElementById('loading-text');
  if (loadingText) {
    loadingText.innerHTML = `
      <div class="spinner" style="border-top-color: #6366f1;"></div>
      <div style="margin-top: 20px; font-weight: 700; font-size: 1.2rem; color: #6366f1; letter-spacing: 0.5px;">
        ${currentLang === 'tr' ? '🤖 AI KARE KARE ANALİZ EDİYOR' : '🤖 AI FRAME-BY-FRAME ANALYSIS'}
      </div>
      <div style="font-size: 0.95rem; color: #cbd5e1; margin-top: 8px; max-width: 320px; margin-left: auto; margin-right: auto; line-height: 1.5;">
        ${currentLang === 'tr' 
          ? 'Videonuzdaki her kare tek tek işleniyor. Çizgiler vücudunuza %100 senkronize ediliyor...' 
          : 'Processing every frame sequentially to burn skeleton vectors exactly onto your body in 30 FPS...'}
      </div>
      <div style="font-size: 0.8rem; color: #a0aec0; margin-top: 15px; font-style: italic;">
        ${currentLang === 'tr' ? '(Video uzunluğuna göre 10-20 saniye sürebilir)' : '(May take 10-20 seconds depending on video length)'}
      </div>
    `;
  }

  try {
    let token = localStorage.getItem('bikefit_token');
    if (!token && window.Capacitor && window.Capacitor.isNativePlatform()) {
      token = 'G1zl1_Adm1n_Pass_99';
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bike_type', bikeTypeSelect.value);

    const response = await fetch(`${API_BASE}/analyze/video`, {
      method: 'POST',
      headers: {
        'access-token': token
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Video analysis failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      showError(translations[currentLang].errNoPose + ` (${data.error})`);
      return;
    }

    // Clear loading state
    document.getElementById('idle-state').style.display = 'none';
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('error-state').style.display = 'none';
    document.getElementById('results-list').style.display = '';

    // Render the averaged angles on the dashboard
    renderAngle('knee',  data.knee_angle,  data.knee_feedback);
    renderAngle('hip',   data.hip_angle,   data.hip_feedback);
    renderAngle('elbow', data.elbow_angle, data.elbow_feedback);
    renderAngle('torso', data.torso_angle, data.torso_feedback);
    renderAngle('ankle', data.ankle_angle, data.ankle_feedback);

    // Calculate score
    const feedbacks = [data.knee_feedback, data.hip_feedback, data.elbow_feedback, data.torso_feedback, data.ankle_feedback];
    const idealCount = feedbacks.filter(f => f && f.toLowerCase().includes('ideal')).length;
    const score = Math.round((idealCount / feedbacks.length) * 100);
    document.getElementById('score-value').textContent = `${score}%`;

    // Clear canvas drawing overlay completely because the skeleton is now beautifully burned INTO the video frames directly!
    const ctx = overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Update video source to the processed video returned by the Pi
    video.src = data.output_video;
    video.loop = true;
    video.controls = true;
    video.play();

    // Populate Keyframes (Bottom Stroke & Top Stroke) into the Session Report Sidebar
    const t = translations[currentLang] || translations.en;
    
    if (data.max_knee_frame) {
      maxKneeAngleFrame = {
        angle: data.max_knee_data.knee_angle,
        photo: data.max_knee_frame,
        data: data.max_knee_data,
        score: score
      };
    }
    
    if (data.min_knee_frame) {
      const adjustedMinData = adjustFlexionFeedback(data.min_knee_data);
      const feedbacks = [adjustedMinData.knee_feedback, adjustedMinData.hip_feedback, adjustedMinData.elbow_feedback, adjustedMinData.torso_feedback, adjustedMinData.ankle_feedback];
      const idealCount = feedbacks.filter(f => f && f.toLowerCase().includes('ideal')).length;
      const flexScore = Math.round((idealCount / feedbacks.length) * 100);

      minKneeAngleFrame = {
        angle: data.min_knee_data.knee_angle,
        photo: data.min_knee_frame,
        data: adjustedMinData,
        score: flexScore
      };
    }

    // Update comparative snapshot states
    currSnapshot = data.max_knee_frame || data.min_knee_frame;
    currSnapshotData = {
      src: currSnapshot,
      data: data,
      score: score,
      feedbackText: `
        <strong>${t.rKneeAngle || 'Knee Angle'} (${Math.round(data.knee_angle)}°):</strong><br>${translateFeedback(data.knee_feedback)}<br><br>
        <strong>${t.rHipAngle || 'Hip Angle'} (${Math.round(data.hip_angle)}°):</strong><br>${translateFeedback(data.hip_feedback)}<br><br>
        <strong>${t.rElbowAngle || 'Elbow Angle'} (${Math.round(data.elbow_angle)}°):</strong><br>${translateFeedback(data.elbow_feedback)}<br><br>
        <strong>${t.rTorsoAngle || 'Torso Angle'} (${Math.round(data.torso_angle)}°):</strong><br>${translateFeedback(data.torso_feedback)}
      `
    };

    // Calculate Saddle Height and KOPS for video analysis using the max extension frame keypoints
    if (maxKneeAngleFrame && maxKneeAngleFrame.data && maxKneeAngleFrame.data.keypoints) {
      const kps = maxKneeAngleFrame.data.keypoints;
      const imgW = data.width || 640;
      const imgH = data.height || 480;
      const isImage = photoViewer && photoViewer.style.display === 'block';
      const source = isImage ? photoViewer : video;
      const vW = source.videoWidth || source.naturalWidth || 640;
      const vH = source.videoHeight || source.naturalHeight || 480;
      
      const scaleX = vW / imgW;
      const scaleY = vH / imgH;
      
      const hipX = kps.hip[0] * scaleX;
      const hipY = kps.hip[1] * scaleY;
      const kneeX = kps.knee[0] * scaleX;
      const kneeY = kps.knee[1] * scaleY;
      const ankleX = kps.ankle[0] * scaleX;
      const ankleY = kps.ankle[1] * scaleY;
      
      let activePins = calibPins;
      let activePixelToCm = pixelToCm;
      
      if (calibPins.length === 4) {
        const currentHipX = hipX;
        const currentHipY = hipY;
        if (calibrationHipX === null || calibrationHipY === null) {
          calibrationHipX = currentHipX;
          calibrationHipY = currentHipY;
        }
        const dx = currentHipX - calibrationHipX;
        const dy = currentHipY - calibrationHipY;
        activePins = calibPins.map(p => ({
          ...p,
          x: p.x + dx,
          y: p.y + dy
        }));
        activePixelToCm = pixelToCm;
      } else {
        const thighLen = Math.sqrt((kneeX - hipX)**2 + (kneeY - hipY)**2);
        const shinLen = Math.sqrt((ankleX - kneeX)**2 + (ankleY - kneeY)**2);
        const stableLen = thighLen + shinLen;
        
        const facingLeft = kneeX < hipX;
        const dirMultiplier = facingLeft ? -1 : 1;
        
        const bbX = hipX + dirMultiplier * stableLen * 0.18;
        const bbY = hipY + stableLen * 0.80;
        const saddleX = hipX;
        const saddleY = hipY + stableLen * 0.04;
        const fwX = bbX + dirMultiplier * stableLen * 0.72;
        const fwY = bbY + stableLen * 0.05;
        const rwX = bbX - dirMultiplier * stableLen * 0.72;
        const rwY = bbY + stableLen * 0.05;
        
        activePins = [
          { label: 'Front Wheel', x: fwX, y: fwY },
          { label: 'Rear Wheel', x: rwX, y: rwY },
          { label: 'Bottom Bracket', x: bbX, y: bbY },
          { label: 'Saddle', x: saddleX, y: saddleY }
        ];
        
        const wheelbasePixels = Math.abs(fwX - rwX);
        activePixelToCm = 99 / wheelbasePixels;
      }
      
      if (activePins.length === 4 && activePixelToCm) {
        const bb = activePins[2];
        const dx = hipX - bb.x;
        const dy = hipY - bb.y;
        const saddleHeightCm = Math.sqrt(dx*dx + dy*dy) * activePixelToCm;
        const kopsCm = (kneeX - bb.x) * activePixelToCm;
        const ratioVal = 1 / activePixelToCm;
        
        document.getElementById('r-metrics').style.display = 'block';
        valSaddleHeight.textContent = saddleHeightCm.toFixed(1) + " cm";
        valKops.textContent = kopsCm.toFixed(1) + " cm";
        
        const ratioLabel = document.getElementById('val-wheelbase-text');
        if (ratioLabel) {
          ratioLabel.textContent = `${t.proRatio || 'Ratio'}: ${ratioVal.toFixed(2)} px/cm`;
        }
      }
    }

    // Make sure the Biomechanical Session Report card is made visible!
    const reportCard = document.getElementById('session-report-card');
    if (reportCard) {
      reportCard.style.display = 'flex';
    }

    // Trigger UI updates for the Biomechanical Session Report and comparison thumbnails
    updateReportUI();
    showComparisonSessionResults();

  } catch (err) {
    console.error("Full Video Analysis Failed:", err);
    alert(currentLang === 'tr' ? "Video Analizi Başarısız: " + err.message : "Video Analysis Failed: " + err.message);
    showError(translations[currentLang].errNoPose);
  } finally {
    isAnalyzing = false;
  }
}

async function handleAnalyzeClick() {
  // Always live camera mode
  document.getElementById('video-box').classList.add('calibration-zoom');

  if (checkDelay && checkDelay.checked) {
    let count = 15;
    countdownOverlay.style.display = 'flex';
    countdownOverlay.textContent = count;
    
    const timer = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(timer);
        countdownOverlay.style.display = 'none';
        
        startLiveMode();
        analyze();

        const workspaceTitle = document.getElementById('label-workspace-title');
        if (workspaceTitle) workspaceTitle.textContent = '🔴 SESSION ACTIVE (30s)';
        
        setTimeout(() => {
          if (liveInterval) {
            stopLiveMode();
            if (workspaceTitle) workspaceTitle.textContent = 'Live Analysis Workspace';
            document.getElementById('video-box').classList.remove('calibration-zoom');
            alert(currentLang === 'tr' ? '30 Saniyelik Analiz Tamamlandı!' : '30s Session Complete!');
            analyze();
          }
        }, 30000);

      } else {
        countdownOverlay.textContent = count;
      }
    }, 1000);
  } else {
    startLiveMode();
    analyze();
  }
}


btnAnalyze.addEventListener('click', handleAnalyzeClick);

function estimateCalibrationPins(kps, imgW, imgH) {
  const W = overlayCanvas.width || 640;
  const H = overlayCanvas.height || 480;
  
  if (!kps || !kps.hip || !kps.knee || !kps.ankle) {
    // Default fallback points if no pose keypoints are found based on BDC proportions
    return [
      { x: W * 0.65, y: H * 0.8 }, // Front Wheel
      { x: W * 0.25, y: H * 0.8 }, // Rear Wheel
      { x: W * 0.45, y: H * 0.8 }, // Bottom Bracket
      { x: W * 0.43, y: H * 0.52 } // Saddle
    ];
  }
  
  // Calculate scale factor from source image dimensions to canvas dimensions
  let scaleX = 1;
  let scaleY = 1;
  if (imgW && imgH) {
    scaleX = W / imgW;
    scaleY = H / imgH;
  }
  
  const hipX = kps.hip[0] * scaleX;
  const hipY = kps.hip[1] * scaleY;
  const kneeX = kps.knee[0] * scaleX;
  const kneeY = kps.knee[1] * scaleY;
  const ankleX = kps.ankle[0] * scaleX;
  const ankleY = kps.ankle[1] * scaleY;
  
  const facingLeft = kneeX < hipX;
  const dirMultiplier = facingLeft ? -1 : 1;
  
  const thighLen = Math.hypot(kneeX - hipX, kneeY - hipY);
  const shinLen = Math.hypot(ankleX - kneeX, ankleY - kneeY);
  const legLen = thighLen + shinLen;
  
  const bbX = hipX + dirMultiplier * legLen * 0.18;
  const bbY = hipY + legLen * 0.80;
  
  const saddleX = hipX;
  const saddleY = hipY + legLen * 0.04;
  
  const fwX = bbX + dirMultiplier * legLen * 0.72;
  const fwY = bbY + legLen * 0.05;
  
  const rwX = bbX - dirMultiplier * legLen * 0.72;
  const rwY = bbY + legLen * 0.05;
  
  return [
    { x: Math.max(0, Math.min(W, fwX)), y: Math.max(0, Math.min(H, fwY)) },
    { x: Math.max(0, Math.min(W, rwX)), y: Math.max(0, Math.min(H, rwY)) },
    { x: Math.max(0, Math.min(W, bbX)), y: Math.max(0, Math.min(H, bbY)) },
    { x: Math.max(0, Math.min(W, saddleX)), y: Math.max(0, Math.min(H, saddleY)) }
  ];
}


function startCalibrationSequence() {
  isCalibrating = true;
  
  document.getElementById('video-box').classList.add('calibration-zoom');
  if (fsControls) fsControls.style.display = 'flex';
  
  const calibTopBar = document.getElementById('calibration-top-bar');
  if (calibTopBar) {
    calibTopBar.style.display = 'flex';
  }
  
  // Sync specs inputs to the floating top-bar inputs
  const calibInpWheelbase = document.getElementById('calib-inp-wheelbase');
  const calibInpCrank = document.getElementById('calib-inp-crank');
  const calibInpChainring = document.getElementById('calib-inp-chainring');
  
  if (calibInpWheelbase && inpWheelbase) calibInpWheelbase.value = inpWheelbase.value || localStorage.getItem('bf_wheelbase') || "1000";
  if (calibInpCrank && inpCrank) calibInpCrank.value = inpCrank.value || localStorage.getItem('bf_crank') || "172.5";
  if (calibInpChainring && inpChainring) calibInpChainring.value = inpChainring.value || localStorage.getItem('bf_chainring') || "52";
  
  // Store updated metadata
  bikeMetadata = {
    wheelbase: parseFloat(calibInpWheelbase ? calibInpWheelbase.value : (inpWheelbase ? inpWheelbase.value : 1000)) || 1000,
    crank_length: parseFloat(calibInpCrank ? calibInpCrank.value : (inpCrank ? inpCrank.value : 172.5)) || 172.5,
    chainring: parseInt(calibInpChainring ? calibInpChainring.value : (inpChainring ? inpChainring.value : 52)) || 52,
    handlebar: inpHandlebar ? inpHandlebar.value : ""
  };
  
  // Save to local storage
  localStorage.setItem('bf_wheelbase', bikeMetadata.wheelbase);
  localStorage.setItem('bf_crank', bikeMetadata.crank_length);
  localStorage.setItem('bf_chainring', bikeMetadata.chainring);

  if (!video.paused) video.pause();
  stopLiveMode();
  
  // Pre-populate calibration pins from last known pose or use proportional fallback
  if (calibPins.length < 4) {
    let activeKps = null;
    let actW = null;
    let actH = null;
    
    if (latestSinglePoseData) {
      activeKps = latestSinglePoseData.keypoints;
      actW = latestSinglePoseData.width;
      actH = latestSinglePoseData.height;
    }
    
    // Configure overlayCanvas dimensions from live camera
    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;
    overlayCanvas.width = w;
    overlayCanvas.height = h;
    
    calibPins = estimateCalibrationPins(activeKps, actW, actH);
    console.log('[startCalibrationSequence] Pre-populated pins:', calibPins);
  }
  
  calibrationHipX = null;
  calibrationHipY = null;
  stableLegLen = null;
  pixelToCm = null;
  
  const t = translations[currentLang];
  if (calibPins.length === 4) {
    btnCalibrateText.textContent = '✅ Done! (Click Here)';
    btnCalibrateBike.classList.remove('btn-danger');
    btnCalibrateBike.classList.add('btn-success');
    if (btnDoneFS) btnDoneFS.style.display = 'block';
  } else {
    btnCalibrateText.textContent = t.calibFWheel;
    btnCalibrateBike.classList.remove('btn-primary', 'btn-success');
    btnCalibrateBike.classList.add('btn-danger');
    if (btnDoneFS) btnDoneFS.style.display = 'none';
  }
  
  document.getElementById('r-metrics').style.display = 'none';
  overlayCanvas.style.zIndex = '10';
  overlayCanvas.style.pointerEvents = 'auto';
  overlayCanvas.style.cursor = 'crosshair';

  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;
  overlayCanvas.width = w;
  overlayCanvas.height = h;
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  drawOverlay({});
}


if (btnCalibrateBike) {
  btnCalibrateBike.addEventListener('click', () => {
    window.sessionManager.trackEvent('calibration_started');
    if (isCalibrating) {
      if (calibPins.length === 4) {
        finishCalibration();
      } else {
        resetCalibration();
      }
    } else {
      startCalibrationSequence();
    }
  });
}

// Floating calibration top bar specs listeners
const calibInpWheelbase = document.getElementById('calib-inp-wheelbase');
const calibInpCrank = document.getElementById('calib-inp-crank');
const calibInpChainring = document.getElementById('calib-inp-chainring');

function syncFloatingSpecs() {
  if (calibInpWheelbase && inpWheelbase) {
    inpWheelbase.value = calibInpWheelbase.value;
    localStorage.setItem('bf_wheelbase', calibInpWheelbase.value);
    bikeMetadata.wheelbase = parseFloat(calibInpWheelbase.value) || 1000;
  }
  if (calibInpCrank && inpCrank) {
    inpCrank.value = calibInpCrank.value;
    localStorage.setItem('bf_crank', calibInpCrank.value);
    bikeMetadata.crank_length = parseFloat(calibInpCrank.value) || 172.5;
  }
  if (calibInpChainring && inpChainring) {
    inpChainring.value = calibInpChainring.value;
    localStorage.setItem('bf_chainring', calibInpChainring.value);
    bikeMetadata.chainring = parseInt(calibInpChainring.value) || 52;
  }
}

if (calibInpWheelbase) {
  calibInpWheelbase.addEventListener('input', () => {
    syncFloatingSpecs();
    if (calibPins.length === 4) {
      const dx = calibPins[1].x - calibPins[0].x;
      const dy = calibPins[1].y - calibPins[0].y;
      const wheelbasePx = Math.sqrt(dx*dx + dy*dy);
      pixelToCm = (bikeMetadata.wheelbase / 10) / wheelbasePx;
    }
  });
}
if (calibInpCrank) {
  calibInpCrank.addEventListener('input', syncFloatingSpecs);
}
if (calibInpChainring) {
  calibInpChainring.addEventListener('input', syncFloatingSpecs);
}


function resetCalibration() {
  const t = translations[currentLang];
  isCalibrating = false;
  calibPins = [];
  calibrationHipX = null;
  calibrationHipY = null;
  stableLegLen = null;
  document.getElementById('video-box').classList.remove('calibration-zoom');
  if(fsControls) fsControls.style.display = 'none';
  if(btnDoneFS) btnDoneFS.style.display = 'none';
  const calibTopBar = document.getElementById('calibration-top-bar');
  if (calibTopBar) calibTopBar.style.display = 'none';
  const calibVideoControls = document.getElementById('calib-video-controls');
  if (calibVideoControls) calibVideoControls.style.display = 'none';
  if ((video.src || video.srcObject) && video.paused) video.play();
  btnCalibrateBike.classList.remove('btn-danger', 'btn-success');
  btnCalibrateBike.classList.add('btn-primary');
  btnCalibrateText.textContent = t.btnCalib;
  overlayCanvas.style.zIndex = "2";
  overlayCanvas.style.pointerEvents = "none";
  overlayCanvas.style.cursor = "default";
  
  if (wasInMultiPhotoModeDuringCalib) {
    if (activeCalibSlot) {
      if (activeCalibSlot === 'bottom') {
        calibPinsBottom = [];
        pixelToCmBottom = null;
        // Redraw bottom overlay to clear pins/overlays
        if (multiPhotoBottomData && multiPhotoBottomData.keypoints) {
          drawOverlay(
            multiPhotoBottomData.keypoints,
            multiPhotoBottomData.width,
            multiPhotoBottomData.height,
            overlaySlotBottom,
            imgSlotBottom,
            multiPhotoBottomData
          );
        } else {
          const ctxBottom = overlaySlotBottom.getContext('2d');
          ctxBottom.clearRect(0, 0, overlaySlotBottom.width, overlaySlotBottom.height);
        }
      } else if (activeCalibSlot === 'top') {
        calibPinsTop = [];
        pixelToCmTop = null;
        // Redraw top overlay to clear pins/overlays
        if (multiPhotoTopData && multiPhotoTopData.keypoints) {
          drawOverlay(
            multiPhotoTopData.keypoints,
            multiPhotoTopData.width,
            multiPhotoTopData.height,
            overlaySlotTop,
            imgSlotTop,
            multiPhotoTopData
          );
        } else {
          const ctxTop = overlaySlotTop.getContext('2d');
          ctxTop.clearRect(0, 0, overlaySlotTop.width, overlaySlotTop.height);
        }
      }
    }
    if (photoViewer) photoViewer.style.display = 'none';
    if (multiPhotoViewer) multiPhotoViewer.style.display = 'flex';
    wasInMultiPhotoModeDuringCalib = false;
  }
  
  activeCalibSlot = null;
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

let draggingPinIndex = -1;

function getEventCoords(e) {
  const rect = overlayCanvas.getBoundingClientRect();
  const W_canvas = overlayCanvas.width;
  const H_canvas = overlayCanvas.height;
  const w_rect = rect.width || W_canvas;
  const h_rect = rect.height || H_canvas;
  
  let clientX = e.clientX;
  let clientY = e.clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }
  
  const r_canvas = W_canvas / H_canvas;
  const r_rect = w_rect / h_rect;
  
  let w_rendered, h_rendered;
  let offset_x = 0, offset_y = 0;
  
  if (r_canvas > r_rect) {
    // Canvas is wider than container aspect ratio (pillarbox padding at top/bottom)
    w_rendered = w_rect;
    h_rendered = w_rect / r_canvas;
    offset_y = (h_rect - h_rendered) / 2;
  } else {
    // Canvas is taller than/equal to container aspect ratio (letterbox padding at sides)
    h_rendered = h_rect;
    w_rendered = h_rect * r_canvas;
    offset_x = (w_rect - w_rendered) / 2;
  }
  
  if (w_rendered <= 0) w_rendered = 1;
  if (h_rendered <= 0) h_rendered = 1;
  
  const x_el = clientX - rect.left;
  const y_el = clientY - rect.top;
  
  let x_logical = ((x_el - offset_x) / w_rendered) * W_canvas;
  let y_logical = ((y_el - offset_y) / h_rendered) * H_canvas;
  
  x_logical = Math.max(0, Math.min(W_canvas, x_logical));
  y_logical = Math.max(0, Math.min(H_canvas, y_logical));
  
  return {
    x: x_logical,
    y: y_logical
  };
}

function handlePointerDown(e) {
  if (!isCalibrating) return;
  e.preventDefault();
  
  const rect = overlayCanvas.getBoundingClientRect();
  const W_canvas = overlayCanvas.width;
  const H_canvas = overlayCanvas.height;
  const w_rect = rect.width || W_canvas;
  const h_rect = rect.height || H_canvas;
  
  let clientX = e.clientX;
  let clientY = e.clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  }
  
  const r_canvas = W_canvas / H_canvas;
  const r_rect = w_rect / h_rect;
  
  let w_rendered, h_rendered;
  let offset_x = 0, offset_y = 0;
  
  if (r_canvas > r_rect) {
    w_rendered = w_rect;
    h_rendered = w_rect / r_canvas;
    offset_y = (h_rect - h_rendered) / 2;
  } else {
    h_rendered = h_rect;
    w_rendered = h_rect * r_canvas;
    offset_x = (w_rect - w_rendered) / 2;
  }
  
  if (w_rendered <= 0) w_rendered = 1;
  if (h_rendered <= 0) h_rendered = 1;
  
  // 1. Check if the user is grabbing an existing pin in physical screen space
  let closestIndex = -1;
  let minDistance = Infinity;
  const grabRadiusPhys = 40; // 40 physical CSS pixels target area is perfect for touch/mouse
  
  for (let i = 0; i < calibPins.length; i++) {
    const pin = calibPins[i];
    // Map logical pin coordinates back to physical client coordinates relative to viewport
    const pinClientX = rect.left + offset_x + (pin.x / W_canvas) * w_rendered;
    const pinClientY = rect.top + offset_y + (pin.y / H_canvas) * h_rendered;
    
    const dx = clientX - pinClientX;
    const dy = clientY - pinClientY;
    const distance = Math.sqrt(dx*dx + dy*dy);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  if (closestIndex !== -1 && minDistance < grabRadiusPhys) {
    draggingPinIndex = closestIndex;
    return;
  }
  
  // 2. If not dragging, and we have less than 4 pins, place a new pin
  if (calibPins.length < 4) {
    const x_el = clientX - rect.left;
    const y_el = clientY - rect.top;
    
    let x_logical = ((x_el - offset_x) / w_rendered) * W_canvas;
    let y_logical = ((y_el - offset_y) / h_rendered) * H_canvas;
    
    x_logical = Math.max(0, Math.min(W_canvas, x_logical));
    y_logical = Math.max(0, Math.min(H_canvas, y_logical));
    
    const coords = { x: x_logical, y: y_logical };
    const t = translations[currentLang];
    calibPins.push(coords);
    drawOverlay({});
    
    if (calibPins.length === 1) btnCalibrateText.textContent = t.calibRWheel;
    else if (calibPins.length === 2) btnCalibrateText.textContent = t.calibBB;
    else if (calibPins.length === 3) btnCalibrateText.textContent = t.calibSaddle;
    else if (calibPins.length === 4) {
      btnCalibrateText.textContent = "✅ Done! (Click Here)";
      btnCalibrateBike.classList.remove('btn-danger');
      btnCalibrateBike.classList.add('btn-success');
      if (btnDoneFS) btnDoneFS.style.display = 'block';
    }
  }
}

function handlePointerMove(e) {
  if (!isCalibrating || draggingPinIndex === -1) return;
  e.preventDefault();
  calibPins[draggingPinIndex] = getEventCoords(e);
  drawOverlay({});
}

function handlePointerUp(e) {
  if (draggingPinIndex !== -1) {
    draggingPinIndex = -1;
    e.preventDefault();
  }
}

overlayCanvas.addEventListener('mousedown', handlePointerDown);
overlayCanvas.addEventListener('touchstart', handlePointerDown, {passive: false});

overlayCanvas.addEventListener('mousemove', handlePointerMove);
overlayCanvas.addEventListener('touchmove', handlePointerMove, {passive: false});

overlayCanvas.addEventListener('mouseup', handlePointerUp);
overlayCanvas.addEventListener('touchend', handlePointerUp);

async function finishCalibration() {
  const t = translations[currentLang];
  btnCalibrateText.textContent = t.calibDone + " (Saving...)";
  isCalibrating = false;
  document.getElementById('video-box').classList.remove('calibration-zoom');
  if(fsControls) fsControls.style.display = 'none';
  if(btnDoneFS) btnDoneFS.style.display = 'none';
  const calibTopBar = document.getElementById('calibration-top-bar');
  if (calibTopBar) calibTopBar.style.display = 'none';
  const calibVideoControls = document.getElementById('calib-video-controls');
  if (calibVideoControls) calibVideoControls.style.display = 'none';
  btnCalibrateBike.classList.remove('btn-success', 'btn-danger');
  btnCalibrateBike.classList.add('btn-primary');
  overlayCanvas.style.zIndex = "2";
  overlayCanvas.style.pointerEvents = "none";
  overlayCanvas.style.cursor = "default";
  
  const dx = calibPins[1].x - calibPins[0].x;
  const dy = calibPins[1].y - calibPins[0].y;
  const wheelbasePx = Math.sqrt(dx*dx + dy*dy);
  pixelToCm = (bikeMetadata.wheelbase / 10) / wheelbasePx;
  
  console.log(`[finishCalibration] calibPins: ${JSON.stringify(calibPins)}`);
  console.log(`[finishCalibration] wheelbasePx: ${wheelbasePx}, pixelToCm: ${pixelToCm}`);
  
  try {
    const captureCanvas = document.createElement('canvas');
    const isImageMode = photoViewer && photoViewer.style.display === 'block';
    const source = isImageMode ? photoViewer : video;
    
    console.log(`[finishCalibration] isImageMode: ${isImageMode}, source type: ${source.tagName}`);
    
    const srcW = isImageMode ? (photoViewer.naturalWidth || photoViewer.width || 640) : (video.videoWidth || 640);
    const srcH = isImageMode ? (photoViewer.naturalHeight || photoViewer.height || 480) : (video.videoHeight || 480);
    
    captureCanvas.width = srcW;
    captureCanvas.height = srcH;
    
    console.log(`[finishCalibration] Canvas size: ${captureCanvas.width}x${captureCanvas.height}`);
    
    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(source, 0, 0, captureCanvas.width, captureCanvas.height);
    const base64 = captureCanvas.toDataURL('image/jpeg', 0.9);
    
    console.log(`[finishCalibration] Base64 generated, length: ${base64.length}`);
    
    const payload = {
      image_base64: base64,
      pins: calibPins,
      bike_type: bikeTypeSelect ? bikeTypeSelect.value : "road",
      metadata: bikeMetadata
    };
    
    console.log(`[finishCalibration] Sending payload with ${calibPins.length} pins`);
    
    const response = await fetch(`${API_BASE}/analyze/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error(`[finishCalibration] Server error: ${response.status} - ${errText}`);
    } else {
      console.log(`[finishCalibration] Server response OK`);
    }
    
    btnCalibrateText.textContent = t.calibDone + " (" + t.calibReset + ")";
    document.getElementById('val-wheelbase-text').textContent = `${t.pinAssumed}: ${bikeMetadata.wheelbase/10}cm`;
  } catch(err) {
    console.error("[finishCalibration] Exception:", err);
    btnCalibrateText.textContent = t.calibDone + " (" + t.calibReset + ")";
  }

  // Only resume video if it's a video source (not image mode)
  const isImageModeLocal = photoViewer && photoViewer.style.display === 'block';
  if (!isImageModeLocal && (video.src || video.srcObject) && video.paused) video.play();
  
  if (wasInMultiPhotoModeDuringCalib) {
    if (activeCalibSlot) {
      if (activeCalibSlot === 'bottom') {
        calibPinsBottom = [...calibPins];
        pixelToCmBottom = pixelToCm;
      } else if (activeCalibSlot === 'top') {
        calibPinsTop = [...calibPins];
        pixelToCmTop = pixelToCm;
      }
    }
    
    // Draw skeletal outputs on split-screen viewports to reflect new scale/pins!
    if (multiPhotoBottomFile) {
      if (multiPhotoBottomData && multiPhotoBottomData.keypoints) {
        drawOverlay(
          multiPhotoBottomData.keypoints,
          multiPhotoBottomData.width,
          multiPhotoBottomData.height,
          overlaySlotBottom,
          imgSlotBottom,
          multiPhotoBottomData
        );
      } else {
        const ctxBottom = overlaySlotBottom.getContext('2d');
        ctxBottom.clearRect(0, 0, overlaySlotBottom.width, overlaySlotBottom.height);
      }
    }
    
    if (multiPhotoTopFile) {
      if (multiPhotoTopData && multiPhotoTopData.keypoints) {
        drawOverlay(
          multiPhotoTopData.keypoints,
          multiPhotoTopData.width,
          multiPhotoTopData.height,
          overlaySlotTop,
          imgSlotTop,
          multiPhotoTopData
        );
      } else {
        const ctxTop = overlaySlotTop.getContext('2d');
        ctxTop.clearRect(0, 0, overlaySlotTop.width, overlaySlotTop.height);
      }
    }
    
    // Regenerate Biomechanical Session Report and dashboard
    if (multiPhotoBottomData || multiPhotoTopData) {
      generateMultiPhotoReport();
    }
    
    if (photoViewer) photoViewer.style.display = 'none';
    if (multiPhotoViewer) multiPhotoViewer.style.display = 'flex';
    wasInMultiPhotoModeDuringCalib = false;
  }
  
  activeCalibSlot = null;
}

if (btnCancelFS) {
  btnCancelFS.addEventListener('click', resetCalibration);
}
if (btnDoneFS) {
  btnDoneFS.addEventListener('click', () => {
    if (isCalibrating && calibPins.length === 4) finishCalibration();
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

  // Load Bike Config
  if (localStorage.getItem('bf_wheelbase') && inpWheelbase) inpWheelbase.value = localStorage.getItem('bf_wheelbase');
  if (localStorage.getItem('bf_crank') && inpCrank) inpCrank.value = localStorage.getItem('bf_crank');
  if (localStorage.getItem('bf_chainring') && inpChainring) inpChainring.value = localStorage.getItem('bf_chainring');
  if (localStorage.getItem('bf_handlebar') && inpHandlebar) inpHandlebar.value = localStorage.getItem('bf_handlebar');

  // Check Onboarding
  if (!localStorage.getItem('bikefit_onboarded')) {
    onboardingModal.style.display = 'flex';
  }

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

  // Admin Bypass via URL: ?admin=G1zl1_Adm1n_Pass_99
  const adminSecret = urlParams.get('admin');
  if (adminSecret === 'G1zl1_Adm1n_Pass_99') {
    localStorage.setItem('bikefit_token', adminSecret);
    alert("Admin access granted! All features unlocked.");
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Onboarding events
if (btnCloseOnboarding) {
  btnCloseOnboarding.addEventListener('click', () => {
    onboardingModal.style.display = 'none';
    localStorage.setItem('bikefit_onboarded', 'true');
  });
}
if (btnStartApp) {
  btnStartApp.addEventListener('click', () => {
    onboardingModal.style.display = 'none';
    localStorage.setItem('bikefit_onboarded', 'true');
  });
}

// Lang Toggle
if (btnLangToggle && langOptions) {
  btnLangToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = langOptions.style.display === 'block';
    langOptions.style.display = isVisible ? 'none' : 'block';
  });
  
  document.addEventListener('click', () => {
    langOptions.style.display = 'none';
  });
}

initApp();

// ===== BLUETOOTH SENSORS =====
let powerCharacteristic = null;
let cscCharacteristic = null;
let lastCscData = null;

if (btnConnectSensor) {
  btnConnectSensor.addEventListener('click', async () => {
    try {
      const BleClient = window.capacitorCommunityBluetoothLe ? window.capacitorCommunityBluetoothLe.BleClient : null;

      if (!BleClient && !navigator.bluetooth) {
        alert("Web Bluetooth is not supported. Use Chrome (Mac/PC) or Bluefy (iOS).");
        return;
      }

      btnConnectSensor.textContent = 'Connecting...';

      if (BleClient) {
        // Native Capacitor client flow
        await BleClient.initialize({ androidNeverForLocation: true });

        const device = await BleClient.requestDevice({
          services: ['cycling_power', 'cycling_speed_and_cadence', 'fitness_machine'],
          optionalServices: ['heart_rate', 'battery_service', 'device_information']
        });

        await BleClient.connect(device.deviceId, () => {
          console.log('BLE Disconnected');
          btnConnectSensor.textContent = 'Connect BLE';
          btnConnectSensor.classList.remove('btn-success');
          btnConnectSensor.classList.add('btn-primary');
        });

        // Notifications for Cycling Power
        try {
          await BleClient.startNotifications(
            device.deviceId,
            'cycling_power',
            'cycling_power_measurement',
            (value) => {
              handlePowerData({ target: { value } });
            }
          );
        } catch (e) { console.log('No power service', e); }

        // Notifications for Cycling Speed and Cadence
        try {
          await BleClient.startNotifications(
            device.deviceId,
            'cycling_speed_and_cadence',
            'csc_measurement',
            (value) => {
              handleCscData({ target: { value } });
            }
          );
        } catch (e) { console.log('No CSC service', e); }

        btnConnectSensor.textContent = 'Connected ✓';
        btnConnectSensor.classList.add('btn-success');
        btnConnectSensor.classList.remove('btn-primary');

      } else {
        // Fallback: Standard Web Bluetooth
        const device = await navigator.bluetooth.requestDevice({
          filters: [
            { services: ['cycling_power'] },
            { services: ['cycling_speed_and_cadence'] },
            { services: ['fitness_machine'] },
            { namePrefix: 'Wahoo' },
            { namePrefix: 'Tacx' },
            { namePrefix: 'KICKR' },
            { namePrefix: 'Elite' },
            { namePrefix: 'Garmin' },
            { namePrefix: 'Assioma' },
            { namePrefix: 'Favero' },
            { namePrefix: 'Stages' },
            { namePrefix: '4iiii' },
            { namePrefix: 'Magene' },
            { namePrefix: 'Zwift' }
          ],
          optionalServices: [
            'cycling_power',
            'cycling_speed_and_cadence',
            'fitness_machine',
            'heart_rate',
            'battery_service',
            'device_information',
            '00001818-0000-1000-8000-00805f9b34fb',
            '00001816-0000-1000-8000-00805f9b34fb',
            '00001826-0000-1000-8000-00805f9b34fb'
          ]
        });

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
      }

    } catch (error) {
      console.error('BLE Connection error', error);
      let msg = `Bluetooth Error: ${error.message}\n\n1. Ensure Bluetooth is ON.\n2. MAC USERS: Check System Settings > Privacy > Bluetooth > Chrome is ON.`;
      alert(msg);
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

// ===== SNAPSHOT LIGHTBOX FUNCTIONALITY =====
function openLightbox(src, title, kneeAngle, hipAngle, score, feedbackText) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const modalTitle = document.getElementById('lightbox-title');
  const badgeAngle = document.getElementById('lightbox-badge-angle');
  const badgeScore = document.getElementById('lightbox-badge-score');
  const feedbackEl = document.getElementById('lightbox-feedback');
  const statKnee = document.getElementById('lightbox-stat-knee');
  const statHip = document.getElementById('lightbox-stat-hip');

  if (!modal || !img) return;

  img.src = src;
  modalTitle.textContent = title;
  
  const t = translations[currentLang] || translations.en;
  badgeAngle.textContent = `${t.rKneeAngle || 'Knee Angle'}: ${Math.round(kneeAngle)}°`;
  badgeScore.textContent = `${t.proScore || 'Fit Score'}: ${score}%`;
  
  let finalFeedback = feedbackText;
  if (bikeTypeSelect && bikeTypeSelect.value === 'triathlon' && !finalFeedback.includes('aero-tips-card')) {
    finalFeedback += `
      <div class="aero-tips-card" style="margin-top: 15px;">
        ${t.triathlonAeroTips}
      </div>
    `;
  }

  feedbackEl.innerHTML = finalFeedback;
  statKnee.textContent = `${Math.round(kneeAngle)}°`;
  statHip.textContent = hipAngle ? `${Math.round(hipAngle)}°` : '--°';

  modal.style.display = 'flex';
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) modal.style.display = 'none';
}

// Lightbox Click Listeners
if (compPrevImg) {
  compPrevImg.style.cursor = 'pointer';
  compPrevImg.addEventListener('click', () => {
    if (prevSnapshotData) {
      const t = translations[currentLang] || translations.en;
      openLightbox(
        prevSnapshotData.src,
        t.tabPrevious || "Previous Fit Snapshot",
        prevSnapshotData.data.knee_angle,
        prevSnapshotData.data.hip_angle,
        prevSnapshotData.score,
        prevSnapshotData.feedbackText
      );
    }
  });
}

if (compCurrImg) {
  compCurrImg.style.cursor = 'pointer';
  compCurrImg.addEventListener('click', () => {
    if (currSnapshotData) {
      const t = translations[currentLang] || translations.en;
      openLightbox(
        currSnapshotData.src,
        t.tabCurrent || "Current Fit Snapshot",
        currSnapshotData.data.knee_angle,
        currSnapshotData.data.hip_angle,
        currSnapshotData.score,
        currSnapshotData.feedbackText
      );
    }
  });
}

const btnCloseLightbox = document.getElementById('btn-close-lightbox');
if (btnCloseLightbox) {
  btnCloseLightbox.addEventListener('click', closeLightbox);
}
const btnCloseLightboxAction = document.getElementById('btn-lightbox-action-close');
if (btnCloseLightboxAction) {
  btnCloseLightboxAction.addEventListener('click', closeLightbox);
}

// Close on background click
const lightboxModal = document.getElementById('lightbox-modal');
if (lightboxModal) {
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) {
      closeLightbox();
    }
  });
}

// Keyboard escape key support
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightbox();
    closeAboutModal();
    if (typeof closeInfoModal === 'function') closeInfoModal();
  }
});

// ===== ABOUT MODAL INTERACTION =====
const aboutModal = document.getElementById('about-modal');
const aboutLink = document.querySelector('a[href="#about"]');
const btnCloseAbout = document.getElementById('btn-close-about');
const btnAboutCloseAction = document.getElementById('btn-about-close-action');

function openAboutModal(e) {
  if (e) e.preventDefault();
  if (aboutModal) {
    aboutModal.style.display = 'flex';
  }
}

function closeAboutModal() {
  if (aboutModal) {
    aboutModal.style.display = 'none';
  }
}

if (aboutLink) {
  aboutLink.addEventListener('click', openAboutModal);
}
if (btnCloseAbout) {
  btnCloseAbout.addEventListener('click', closeAboutModal);
}
if (btnAboutCloseAction) {
  btnAboutCloseAction.addEventListener('click', closeAboutModal);
}
if (aboutModal) {
  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      closeAboutModal();
    }
  });
}

// ===== INFO MODAL INTERACTION (CONTACT, TERMS, REFUND, PRIVACY) =====
const infoModal = document.getElementById('info-modal');
const infoModalIcon = document.getElementById('info-modal-icon');
const infoModalTitle = document.getElementById('info-modal-title');
const infoModalBody = document.getElementById('info-modal-body');
const btnCloseInfo = document.getElementById('btn-close-info');
const btnInfoCloseAction = document.getElementById('btn-info-close-action');

const contactLink = document.querySelector('a[href="#contact"]');
const termsLink = document.querySelector('a[href="#terms"]');
const refundLink = document.querySelector('a[href="#refund"]');
const privacyLink = document.querySelector('a[href="#privacy"]');

const infoContents = {
  contact: {
    title: 'Contact Us',
    icon: '📞',
    body: `
      <p style="margin-bottom:15px; font-weight:500;">We would love to hear from you! Whether you have questions about your bike fit, suggestions for our AI model, or technical inquiries, feel free to reach out directly:</p>
      <div style="margin: 20px 0; display: flex; flex-direction: column; gap: 12px; font-size: 0.95rem;">
        <div><strong>👤 Operated By:</strong> Onur Kapucu</div>
        <div><strong>📧 Email:</strong> <a href="mailto:onur@trihonor.com" style="color: #06b6d4; text-decoration: none; font-weight: 600;">onur@trihonor.com</a></div>
        <div><strong>📞 Phone / WhatsApp:</strong> <a href="tel:+358442359429" style="color: #06b6d4; text-decoration: none; font-weight: 600;">+358 44 235 9429</a></div>
        <div><strong>📍 Location:</strong> Tampere, Finland</div>
      </div>
      <p style="margin-top: 15px; font-size: 0.85rem; color: rgba(255,255,255,0.4);">Our team typically responds to email inquiries within 24-48 hours. Let's make you faster, more efficient, and pain-free on your bike!</p>
    `
  },
  terms: {
    title: 'Terms of Service',
    icon: '📄',
    body: `
      <p style="margin-bottom:15px;">Welcome to BikeFit AI. By accessing or using our platform, you agree to be bound by these terms:</p>
      <ol style="padding-left: 20px; display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem;">
        <li><strong>Use of Platform:</strong> You must use the platform safely and in accordance with all local laws. The AI analysis is for educational and biomechanical guidance only.</li>
        <li><strong>No Medical Advice:</strong> BikeFit AI does not provide medical advice. Consult a professional physician or physical therapist if you experience persistent pain or discomfort.</li>
        <li><strong>Intellectual Property:</strong> All algorithms, custom graphics, and code are the exclusive property of BikeFit AI and Onur Kapucu.</li>
        <li><strong>Limitation of Liability:</strong> We are not responsible for any mechanical issues, injury, or hardware damage resulting from adjustments made to your bicycle.</li>
      </ol>
    `
  },
  refund: {
    title: 'Refund Policy',
    icon: '💰',
    body: `
      <p style="margin-bottom:15px;">At BikeFit AI, we want you to be completely satisfied with your professional biomechanical fitting results:</p>
      <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem;">
        <li><strong>Satisfaction Guarantee:</strong> If our AI calibration or position feedback does not help improve your riding posture or comfort, contact us within 14 days of purchase.</li>
        <li><strong>Refund Process:</strong> Send an email to <a href="mailto:onur@trihonor.com" style="color: #06b6d4; text-decoration: none; font-weight: 600;">onur@trihonor.com</a> with your transaction details. We will process eligible refunds within 5-7 business days.</li>
        <li><strong>Exclusions:</strong> Promotional campaigns or customized coaching add-ons may be subject to alternative terms agreed upon at the time of purchase.</li>
      </ul>
    `
  },
  privacy: {
    title: 'Privacy Policy',
    icon: '🔒',
    body: `
      <p style="margin-bottom:15px;">Your privacy and data security are our highest priorities:</p>
      <ul style="padding-left: 20px; display: flex; flex-direction: column; gap: 12px; font-size: 0.9rem;">
        <li><strong>Video Processing:</strong> All video files uploaded for AI biomechanical fitting are processed securely. We do not sell or share your video assets with third parties.</li>
        <li><strong>Data Collection:</strong> We collect basic account details and biomechanical metrics solely to provide personalized fit history and progress tracking.</li>
        <li><strong>Security:</strong> We implement state-of-the-art encryption protocols to safeguard your personal data and uploaded files.</li>
        <li><strong>Your Rights:</strong> You can request full deletion of your account, history, and uploaded media at any time by contacting <a href="mailto:onur@trihonor.com" style="color: #06b6d4; text-decoration: none; font-weight: 600;">onur@trihonor.com</a>.</li>
      </ul>
    `
  }
};

function openInfoModal(type, e) {
  if (e) e.preventDefault();
  const content = infoContents[type];
  if (content && infoModal) {
    if (infoModalIcon) infoModalIcon.textContent = content.icon;
    if (infoModalTitle) infoModalTitle.textContent = content.title;
    if (infoModalBody) infoModalBody.innerHTML = content.body;
    infoModal.style.display = 'flex';
  }
}

function closeInfoModal() {
  if (infoModal) {
    infoModal.style.display = 'none';
  }
}

if (contactLink) contactLink.addEventListener('click', (e) => openInfoModal('contact', e));
if (termsLink) termsLink.addEventListener('click', (e) => openInfoModal('terms', e));
if (refundLink) refundLink.addEventListener('click', (e) => openInfoModal('refund', e));
if (privacyLink) privacyLink.addEventListener('click', (e) => openInfoModal('privacy', e));

if (btnCloseInfo) btnCloseInfo.addEventListener('click', closeInfoModal);
if (btnInfoCloseAction) btnInfoCloseAction.addEventListener('click', closeInfoModal);

if (infoModal) {
  infoModal.addEventListener('click', (e) => {
    if (e.target === infoModal) {
      closeInfoModal();
    }
  });
}

// ===== CALIBRATION VIDEO MANUAL PLAYBACK CONTROLS =====
function setupCalibVideoControls() {
  const calibVideoControls = document.getElementById('calib-video-controls');
  const btnPlay = document.getElementById('btn-calib-play');
  const btnPrev = document.getElementById('btn-calib-prev-frame');
  const btnNext = document.getElementById('btn-calib-next-frame');
  const slider = document.getElementById('calib-video-slider');
  const timeLbl = document.getElementById('calib-video-time');

  if (!calibVideoControls || !video) return;

  // Toggle play/pause
  if (btnPlay) {
    btnPlay.addEventListener('click', () => {
      if (video.paused) {
        video.play().catch(e => console.log('Video play error:', e));
        btnPlay.textContent = '⏸ Pause';
      } else {
        video.pause();
        btnPlay.textContent = '▶ Play';
      }
    });
  }

  // Frame step previous (-0.033s)
  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      video.pause();
      if (btnPlay) btnPlay.textContent = '▶ Play';
      video.currentTime = Math.max(0, video.currentTime - 0.033);
      drawOverlay({});
    });
  }

  // Frame step next (+0.033s)
  if (btnNext) {
    btnNext.addEventListener('click', () => {
      video.pause();
      if (btnPlay) btnPlay.textContent = '▶ Play';
      video.currentTime = Math.min(video.duration || 0, video.currentTime + 0.033);
      drawOverlay({});
    });
  }

  // Seek timeline slider
  if (slider) {
    slider.addEventListener('input', () => {
      video.pause();
      if (btnPlay) btnPlay.textContent = '▶ Play';
      video.currentTime = parseFloat(slider.value);
      drawOverlay({});
    });
  }

  // Monitor video events
  video.addEventListener('timeupdate', () => {
    if (calibVideoControls.style.display === 'flex') {
      if (slider) {
        slider.max = video.duration || 100;
        slider.value = video.currentTime;
      }
      if (timeLbl) {
        timeLbl.textContent = `${video.currentTime.toFixed(2)} / ${(video.duration || 0).toFixed(2)}s`;
      }
      // Repaint custom pins on the frame
      drawOverlay({});
    }
  });

  video.addEventListener('durationchange', () => {
    if (calibVideoControls.style.display === 'flex' && slider) {
      slider.max = video.duration || 100;
    }
  });

  video.addEventListener('play', () => {
    if (calibVideoControls.style.display === 'flex' && btnPlay) {
      btnPlay.textContent = '⏸ Pause';
    }
  });

  video.addEventListener('pause', () => {
    if (calibVideoControls.style.display === 'flex' && btnPlay) {
      btnPlay.textContent = '▶ Play';
    }
  });
}

// Initialize video manual controls
setupCalibVideoControls();

// ===== THEME TOGGLE (LIGHT / DARK MODE) =====
const btnThemeToggle = document.getElementById('btn-theme-toggle');
if (btnThemeToggle) {
  // Load saved theme from localStorage
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light-theme');
    btnThemeToggle.textContent = '🌙'; // Moon icon represents clicking to switch back to Dark Mode
  } else {
    document.documentElement.classList.remove('light-theme');
    btnThemeToggle.textContent = '☀️'; // Sun icon represents clicking to switch to Light Mode
  }
  
  btnThemeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('light-theme');
    const isLight = document.documentElement.classList.contains('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    btnThemeToggle.textContent = isLight ? '🌙' : '☀️';
  });
}
