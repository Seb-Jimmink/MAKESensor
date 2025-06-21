document.addEventListener('DOMContentLoaded', function () {
  fetch('data.json')
    .then(response => response.json())
    .then(json => {
      const labels = json.data.map(entry => entry.timestamp);
      const values = json.data.map(entry => entry.value);

      const ctx = document.getElementById('soundChart').getContext('2d');
      const soundChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels, // x axis
          datasets: [{
            label: `Sound Level (${json.unit})`,
            data: values, // y axis
            fill: false,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              display: true
            }
          },
          scales: {
            x: {
              type: 'time',
              time: {
                parser: "yyyy-MM-dd'T'HH:mm:ssX",
                tooltipFormat: "yyyy-MM-dd HH:mm:ss 'UTC'",
                displayFormats: {
                  minute: 'HH:mm',
                  hour: 'HH:mm',
                  day: 'yyyy-MM-dd',
                  second: 'HH:mm:ss'
                }
              },
              title: {
                display: true,
                text: 'Timestamp (UTC)'
              },
              ticks: {
                // Custom callback to show UTC time
                callback: function(value, index, ticks) {
                  const date = new Date(value);
                  return date.toISOString().substr(11, 8) + ' UTC'; // "HH:MM:SS UTC"
                }
              }
            },
            y: {
              title: {
                display: true,
                text: `Sound (${json.unit})`
              }
            }
          }
        }
      });

      // Slider support
      const pointSlider = document.getElementById('pointSlider');
      const pointCountLabel = document.getElementById('pointCount');
      pointSlider.addEventListener('input', function () {
        const count = parseInt(pointSlider.value, 10);
        pointCountLabel.textContent = count;
        soundChart.data.labels = labels.slice(-count);
        soundChart.data.datasets[0].data = values.slice(-count);
        soundChart.update();
      });
    })
    .catch(error => {
      console.error('Error loading the data:', error);
    });
});