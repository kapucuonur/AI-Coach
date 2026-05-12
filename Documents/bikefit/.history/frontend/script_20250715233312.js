const video = document.getElementById('video');
const result = document.getElementById('result');
let chart = null;

// Kamera erişimi
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error('Webcam açma hatası:', err));

// Açıya göre sınıf rengi
function getClass(feedback) {
  return feedback.includes("İdeal") ? "ideal" : "adjust";
}

// Sesli komut
function speakFeedback(feedbacks) {
  const text = Object.values(feedbacks).join('. ');
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'tr-TR';
  speechSynthesis.speak(utter);
}

// Grafik güncelle
function updateChart(angles) {
  const ctx = document.getElementById('angleChart').getContext('2d');
  const labels = ['Diz', 'Kalça', 'Dirsek', 'Gövde', 'Ayak Bileği'];
  const data = [
    angles.knee_angle,
    angles.hip_angle,
    angles.elbow_angle,
    angles.torso_angle,
    angles.ankle_angle
  ];

  if (chart) {
    chart.data.datasets[0].data = data;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Açı (°)',
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'blue',
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: true, max: 180 }
        }
      }
    });
  }
}

// Capture ve gönder
document.getElementById('capture').addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataURL = canvas.toDataURL('image/jpeg');

  fetch('http://localhost:8001/analyze/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: dataURL })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        result.textContent = "Hata: " + data.error;
        return;
      }

      const feedbacks = {
        Diz: data.knee_feedback,
        Kalça: data.hip_feedback,
        Dirsek: data.elbow_feedback,
        Gövde: data.torso_feedback,
        "Ayak Bileği": data.ankle_feedback
      };

      result.innerHTML = `
        <p class="${getClass(data.knee_feedback)}">Diz: ${data.knee_angle.toFixed(1)}° – ${data.knee_feedback}</p>
        <p class="${getClass(data.hip_feedback)}">Kalça: ${data.hip_angle.toFixed(1)}° – ${data.hip_feedback}</p>
        <p class="${getClass(data.elbow_feedback)}">Dirsek: ${data.elbow_angle.toFixed(1)}° – ${data.elbow_feedback}</p>
        <p class="${getClass(data.torso_feedback)}">Gövde: ${data.torso_angle.toFixed(1)}° – ${data.torso_feedback}</p>
        <p class="${getClass(data.ankle_feedback)}">Ayak Bileği: ${data.ankle_angle.toFixed(1)}° – ${data.ankle_feedback}</p>
      `;

      updateChart(data);
      speakFeedback(feedbacks);
    })
    .catch(err => {
      console.error(err);
      result.textContent = "İstek gönderilirken hata oluştu.";
    });
});
