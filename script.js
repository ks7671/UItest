let chart;
let fullData = [];

async function loadData() {
  const res = await fetch("data.txt");
  const text = await res.text();
  fullData = [];

  text.trim().split("\n").forEach(line => {
    const [date, temp, hum, co2] = line.split(",");
    fullData.push({
      time: new Date(date),
      temp: parseFloat(temp),
      hum: parseFloat(hum),
      co2: parseFloat(co2)
    });
  });

  restoreSettings();

  const colorSettings = {
    tempColor: document.getElementById('tempColor').value,
    humiColor: document.getElementById('humiColor').value,
    co2Color: document.getElementById('co2Color').value
  };

  const axisSettings = {
    axis_temp: document.getElementById('axis_temp').value,
    axis_hum: document.getElementById('axis_hum').value,
    axis_co2: document.getElementById('axis_co2').value
  };

  const method = localStorage.getItem('lastRangeMethod');
  let subset;
  if (method === 'custom') {
    const start = new Date(document.getElementById("startDate").value);
    const end = new Date(document.getElementById("endDate").value);
    if (!isNaN(start) && !isNaN(end)) {
      subset = fullData.filter(d => d.time >= start && d.time <= end);
    }
  } else if (method === 'recent') {
    const days = parseInt(document.getElementById("recentDays").value);
    if (!isNaN(days)) {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      subset = fullData.filter(d => d.time >= cutoff);
    }
  }

  if (!subset) {
    const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    subset = fullData.filter(d => d.time >= cutoff);
  }

  drawChart(subset, colorSettings, axisSettings);
  setupColorChangeSync();
  setupAxisInputSync(); // ← 追加：Y軸設定反映を有効化
}

function drawChart(dataSubset, colorSettings = null, axisSettings = null) {
  const saved = JSON.parse(localStorage.getItem('chartSettings'));
  const hidden = saved?.hidden || [false, false, false];

  const labels = dataSubset.map(d => d.time);
  const tempData = dataSubset.map(d => d.temp);
  const humiData = dataSubset.map(d => d.hum);
  const co2Data = dataSubset.map(d => d.co2);

  const ctx = document.getElementById("myChart").getContext("2d");

  if (chart) chart.destroy();

  const tempColor = colorSettings?.tempColor || document.getElementById("tempColor").value;
  const humiColor = colorSettings?.humiColor || document.getElementById("humiColor").value;
  const co2Color = colorSettings?.co2Color || document.getElementById("co2Color").value;

  const axisTemp = axisSettings?.axis_temp || document.getElementById("axis_temp").value;
  const axisHum = axisSettings?.axis_hum || document.getElementById("axis_hum").value;
  const axisCO2 = axisSettings?.axis_co2 || document.getElementById("axis_co2").value;

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "温度",
          data: tempData,
          borderColor: tempColor,
          yAxisID: axisTemp
        },
        {
          label: "湿度",
          data: humiData,
          borderColor: humiColor,
          yAxisID: axisHum
        },
        {
          label: "CO₂",
          data: co2Data,
          borderColor: co2Color,
          yAxisID: axisCO2
        }
      ]
    },
    options: {
  responsive: false,
  scales: {
    x: {
      type: "time",
      time: {
        unit: "hour",
        stepSize: 1,
        displayFormats: {
          hour: "M/d HH時"
        }
      },
      ticks: {
        maxTicksLimit: 10
      },
      title: {
        display: true,
        text: "時間"
      }
    },
    y: {
      position: "left",
      title: { display: true, text: "左Y軸" },
      min: parseFloat(document.getElementById("yMin").value) || undefined,
      max: parseFloat(document.getElementById("yMax").value) || undefined
    },
    y2: {
      position: "right",
      title: { display: true, text: "右Y軸" },
      grid: { drawOnChartArea: false },
      min: parseFloat(document.getElementById("y2Min").value) || undefined,
      max: parseFloat(document.getElementById("y2Max").value) || undefined
    }
  },
  plugins: {
    legend: {
      onClick: (e, legendItem, legend) => {
        const index = legendItem.datasetIndex;
        const chart = legend.chart;
        const meta = chart.getDatasetMeta(index);
        meta.hidden = !meta.hidden;
        chart.update();
        saveSettings();
      }
    }
  }
}

  });

  hidden.forEach((val, i) => {
    chart.getDatasetMeta(i).hidden = val;
  });
  chart.update();
}

function setupAxisInputSync() {
  const sync = (id, axis, prop) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => {
      const val = el.value.trim();
      const num = parseFloat(val);
      chart.options.scales[axis][prop] =
        val === "" || val.toLowerCase() === "auto" || isNaN(num) ? undefined : num;
      chart.update();
      saveSettings();
    });
  };

  sync("yMin", "y", "min");
  sync("yMax", "y", "max");
  sync("y2Min", "y2", "min");
  sync("y2Max", "y2", "max");
}

function applyDateRange() {
  localStorage.setItem('lastRangeMethod', 'custom');
  const start = new Date(document.getElementById("startDate").value);
  const end = new Date(document.getElementById("endDate").value);
  const subset = fullData.filter(d => d.time >= start && d.time <= end);
  drawChart(subset);
  saveSettings();
}

function applyRecentDays() {
  localStorage.setItem('lastRangeMethod', 'recent');
  const days = parseInt(document.getElementById("recentDays").value);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const subset = fullData.filter(d => d.time >= cutoff);
  drawChart(subset);
  saveSettings();
}

function applyYAxisSelection() {
  if (!chart) return;
  chart.data.datasets[0].yAxisID = document.getElementById("axis_temp").value;
  chart.data.datasets[1].yAxisID = document.getElementById("axis_hum").value;
  chart.data.datasets[2].yAxisID = document.getElementById("axis_co2").value;
  chart.update();
  saveSettings();
}

function setupColorChangeSync() {
  const sync = (id, datasetIndex) => {
    const input = document.getElementById(id);
    input.addEventListener('input', () => {
      if (chart) {
        chart.data.datasets[datasetIndex].borderColor = input.value;
        chart.update();
      }
      saveSettings();
    });
  };
  sync("tempColor", 0);
  sync("humiColor", 1);
  sync("co2Color", 2);
}

function saveSettings() {
  const settings = {
    axis_temp: document.getElementById('axis_temp').value,
    axis_hum: document.getElementById('axis_hum').value,
    axis_co2: document.getElementById('axis_co2').value,
    tempColor: document.getElementById('tempColor').value,
    humiColor: document.getElementById('humiColor').value,
    co2Color: document.getElementById('co2Color').value,
    yMax: document.getElementById('yMax').value,
    yMin: document.getElementById('yMin').value,
    y2Max: document.getElementById('y2Max').value,
    y2Min: document.getElementById('y2Min').value,
    startDate: document.getElementById('startDate').value,
    endDate: document.getElementById('endDate').value,
    recentDays: document.getElementById('recentDays').value,
    hidden: chart?.data.datasets.map((_, i) => chart.getDatasetMeta(i).hidden ?? false)
  };
  localStorage.setItem('chartSettings', JSON.stringify(settings));
}

function restoreSettings() {
  const saved = JSON.parse(localStorage.getItem('chartSettings'));
  if (!saved) return;

  document.getElementById('axis_temp').value = saved.axis_temp;
  document.getElementById('axis_hum').value = saved.axis_hum;
  document.getElementById('axis_co2').value = saved.axis_co2;
  document.getElementById('tempColor').value = saved.tempColor;
  document.getElementById('humiColor').value = saved.humiColor;
  document.getElementById('co2Color').value = saved.co2Color;
  document.getElementById('yMax').value = saved.yMax;
  document.getElementById('yMin').value = saved.yMin;
  document.getElementById('y2Max').value = saved.y2Max;
  document.getElementById('y2Min').value = saved.y2Min;
  document.getElementById('startDate').value = saved.startDate || '';
  document.getElementById('endDate').value = saved.endDate || '';
  document.getElementById('recentDays').value = saved.recentDays || '3';
}

window.addEventListener("load", loadData);
