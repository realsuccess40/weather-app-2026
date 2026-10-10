const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(require('path').join(__dirname, 'public')));

app.get('/weather', async (req, res) => {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  if (!city) return res.status(400).json({ error: 'Enter a city to search.' });
  if (city.length > 100) return res.status(400).json({ error: 'City names must be 100 characters or fewer.' });

  try {
    const geocodingUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
    geocodingUrl.search = new URLSearchParams({
      name: city,
      count: '1',
      language: 'en',
      format: 'json',
    });
    const geoRes = await fetch(geocodingUrl);
    if (!geoRes.ok) throw new Error(`Geocoding service returned ${geoRes.status}`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: `No city found for "${city}". Try another spelling or a nearby city.` });
    }

    const { latitude, longitude, name, country, admin1 } = geoData.results[0];

    const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
    weatherUrl.search = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max',
      wind_speed_unit: 'kmh',
      temperature_unit: 'celsius',
      timezone: 'auto',
      forecast_days: '5',
    });
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) throw new Error(`Weather service returned ${weatherRes.status}`);
    const weatherData = await weatherRes.json();
    const current = weatherData.current;

    if (!current || !weatherData.daily) {
      throw new Error('Weather service returned an incomplete forecast');
    }

    res.json({
      city: name,
      country,
      admin1,
      timezone: weatherData.timezone,
      time: current.time,
      temperature: current.temperature_2m,
      feels_like: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind_speed: current.wind_speed_10m,
      weather_code: current.weather_code,
      daily: weatherData.daily,
    });
  } catch (error) {
    console.error('Weather lookup failed:', error);
    res.status(502).json({ error: 'Weather data is temporarily unavailable. Please try again.' });
  }
});

app.listen(PORT, () => console.log(`Weather app running at http://localhost:${PORT}`));
