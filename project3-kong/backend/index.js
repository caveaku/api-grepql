const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Simulated weather data
const weatherData = {
  "new-york":    { city: "New York",    temp: 22, unit: "C", condition: "Partly Cloudy", humidity: 65 },
  "london":      { city: "London",      temp: 15, unit: "C", condition: "Rainy",          humidity: 82 },
  "tokyo":       { city: "Tokyo",       temp: 28, unit: "C", condition: "Sunny",          humidity: 70 },
  "sydney":      { city: "Sydney",      temp: 19, unit: "C", condition: "Clear",          humidity: 58 },
  "dubai":       { city: "Dubai",       temp: 38, unit: "C", condition: "Hot & Sunny",    humidity: 40 },
};

const forecastData = {
  "new-york": [
    { day: "Monday",    temp: 22, condition: "Partly Cloudy" },
    { day: "Tuesday",   temp: 18, condition: "Rainy"         },
    { day: "Wednesday", temp: 25, condition: "Sunny"         },
    { day: "Thursday",  temp: 21, condition: "Cloudy"        },
    { day: "Friday",    temp: 19, condition: "Rainy"         },
  ],
};

// GET /api/weather?city=new-york
app.get("/api/weather", (req, res) => {
  const cityKey = (req.query.city || "new-york").toLowerCase();
  const data = weatherData[cityKey];

  if (!data) {
    return res.status(404).json({
      success: false,
      error: `No data for city "${cityKey}"`,
      available: Object.keys(weatherData),
    });
  }

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    // Note: Kong strips the X-API-Key header before this reaches us
    // but passes along the X-Request-ID for tracing
    requestId: req.headers["x-request-id"] || null,
    data,
  });
});

// GET /api/forecast?city=new-york
app.get("/api/forecast", (req, res) => {
  const cityKey = (req.query.city || "new-york").toLowerCase();
  const data = forecastData[cityKey] || forecastData["new-york"];

  res.json({
    success: true,
    city: cityKey,
    days: data,
  });
});

// GET /api/health — internal health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "weather-microservice", uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`🌤  Weather microservice running on port ${PORT}`);
  console.log(`   This service is behind Kong. Access via:`);
  console.log(`   http://localhost:8000/api/weather?city=london`);
  console.log(`   (with header X-API-Key: my-secret-api-key-123)\n`);
});
