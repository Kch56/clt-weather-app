const OWM_KEY = document.querySelector('meta[name="owm-key"]').getAttribute('content');

// Initialize map
const map = L.map('map').setView([35.214, -80.943], 10);

// --- Base Maps ---
const lightBase = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
});

const darkBase = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO',
});

// Add dark as default
darkBase.addTo(map);

// --- Weather Overlay Layers (higher opacity for visibility) ---
const cloudLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`, {
    opacity: 0.7
});
const rainLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`, {
    opacity: 0.7
});
const windLayer = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`, {
    opacity: 0.7
});
const pressureLayer = L.tileLayer(`https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`, {
    opacity: 0.7
});

// Add default weather overlay
cloudLayer.addTo(map);

// Layer groups
const baseMaps = {
    "Light Map": lightBase,
    "Dark Map": darkBase
};

const overlayMaps = {
    "Clouds": cloudLayer,
    "Rain": rainLayer,
    "Wind": windLayer,
    "Pressure": pressureLayer
};

// Add control UI
L.control.layers(baseMaps, overlayMaps).addTo(map);

// --- Legend Element ---
const legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `<strong>Legend</strong><br>Select a layer to view scale.`;
    return div;
};

legend.addTo(map);

// --- Update Legend Dynamically ---
map.on('overlayadd', function (e) {
    const layerName = e.name.toLowerCase();
    let content = `<strong>${e.name} Legend</strong><br>`;

    if (layerName.includes("rain") || layerName.includes("precip")) {
        content += `<span style="color:blue;">■</span> Light Rain<br>`;
        content += `<span style="color:#005eff;">■</span> Heavy Rain<br>`;
    } else if (layerName.includes("cloud")) {
        content += `<span style="color:gray;">■</span> Low Cloud Cover<br>`;
        content += `<span style="color:#000;">■</span> Dense Cloud Cover`;
    } else if (layerName.includes("wind")) {
        content += `<span style="color:lightgreen;">■</span> Low Wind<br>`;
        content += `<span style="color:darkgreen;">■</span> High Wind`;
    } else if (layerName.includes("pressure")) {
        content += `<span style="color:#f4c542;">■</span> Low Pressure<br>`;
        content += `<span style="color:#8e44ad;">■</span> High Pressure`;
    } else {
        content = `<strong>Legend</strong><br>Select a layer to view scale.`;
    }

    document.querySelector(".legend").innerHTML = content;
});

map.on('overlayremove', function () {
    document.querySelector(".legend").innerHTML = `<strong>Legend</strong><br>Select a layer to view scale.`;
});


// 🌐 Historic Weather Circle Marker
async function loadHistoricMap() {
    const date = document.getElementById("historicMapDate").value;
    if (!date) return alert("Please select a date");

    const res = await fetch(`/weather?date=${date}`);
    const data = await res.json();

    if (!Array.isArray(data)) return alert("No data found");

    let popup = `<b>Weather on ${date}</b><br>`;
    let color = "gray";
    let radius = 10000;

    data.forEach(d => {
        popup += `<b>${d.datatype}</b>: ${d.value}<br>`;
        if (d.datatype === "TMAX") {
            if (d.value > 90) color = "red";
            else if (d.value > 75) color = "orange";
            else color = "yellow";
        }
        if (d.datatype === "PRCP" && d.value > 0.2) {
            color = "blue";
            radius = 20000;
        }
    });

    L.circle([35.214, -80.943], {
        color,
        fillColor: color,
        fillOpacity: 0.4,
        radius
    }).addTo(map).bindPopup(popup).openPopup();
}


// 📊 Monthly Weather Chart
async function fetchMonthlyData() {
    const month = document.getElementById("month").value;
    const year = document.getElementById("year").value;

    const res = await fetch(`/monthly_weather?year=${year}&month=${month}`);
    const data = await res.json();

    if (!Array.isArray(data)) {
        alert("No data returned.");
        return;
    }

    const dailyData = {};
    data.forEach(item => {
        const date = item.date.split("T")[0];
        if (!dailyData[date]) dailyData[date] = {};
        dailyData[date][item.datatype] = item.value;
    });

    const labels = Object.keys(dailyData);
    const tmax = labels.map(date => dailyData[date].TMAX || null);
    const tmin = labels.map(date => dailyData[date].TMIN || null);
    const prcp = labels.map(date => dailyData[date].PRCP || 0);

    drawChart(labels, tmax, tmin, prcp);
}

let weatherChart;

function drawChart(labels, tmax, tmin, prcp) {
    const ctx = document.getElementById("weatherChart").getContext("2d");

    if (weatherChart) {
        weatherChart.destroy();
    }

    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Max Temp (°F)',
                    data: tmax,
                    borderColor: 'red',
                    fill: false
                },
                {
                    label: 'Min Temp (°F)',
                    data: tmin,
                    borderColor: 'blue',
                    fill: false
                },
                {
                    label: 'Precipitation (in)',
                    data: prcp,
                    borderColor: 'green',
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Daily Weather Data'
                }
            }
        }
    });
}

function downloadChart() {
    const chartContainer = document.getElementById("chart-container");
    html2pdf().from(chartContainer).save("weather_chart.pdf");
}
