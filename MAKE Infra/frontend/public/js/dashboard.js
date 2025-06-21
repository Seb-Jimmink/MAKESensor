// dahsboard.js

const ctx = document.getElementById('soundChart').getContext('2d');
const chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'Sound Level',
      data: [],
      borderWidth: 1
    }]
  },
  options: {
    scales: {
      x: { title: { display: true, text: 'Time' }},
      y: { title: { display: true, text: 'Value' }, beginAtZero: true }
    }
  }
});

let maxPoints = 50;
let selectedSource = "all";

// Elements for interaction
const pointSlider = document.getElementById('pointSlider');
const pointCountLabel = document.getElementById('pointCount');
const sourceSelect = document.getElementById('sourceSelect');
const videoContainer = document.getElementById("videoContainer");
const ytVideo = document.getElementById("ytVideo");

// Slider handler
pointSlider.addEventListener('input', (e) => {
  maxPoints = parseInt(e.target.value);
  pointCountLabel.textContent = maxPoints;
});

// Dropdown handler
sourceSelect.addEventListener('change', (e) => {
  selectedSource = e.target.value;

  if (selectedSource === "mic2") {
    videoContainer.style.display = "block";
    ytVideo.src = "https://www.youtube.com/embed/E4WlUXrJgy4?autoplay=1";
  } else {
    videoContainer.style.display = "none";
    ytVideo.src = "";
  }
});

// Fetch and update chart
async function fetchData() {
  try {
    const res = await fetch(`/api/sound`);
    let data = await res.json();

    if (selectedSource !== "all") {
      data = data.filter(row => row.source === selectedSource);
    }

    const newTimestamps = data.map(row => new Date(row.timestamp).toLocaleTimeString());
    const newValues = data.map(row => parseInt(row.value));

    chart.data.labels.push(...newTimestamps);
    chart.data.datasets[0].data.push(...newValues);

    if (chart.data.labels.length > maxPoints) {
      chart.data.labels = chart.data.labels.slice(-maxPoints);
      chart.data.datasets[0].data = chart.data.datasets[0].data.slice(-maxPoints);
    }

    chart.update();
  } catch (error) {
    console.error("Error fetching sound data:", error);
  }
}

fetchData();
setInterval(fetchData, 2000);

