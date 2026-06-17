const axios = require('axios');

// Coordenadas de Huechuraba, Santiago
const LAT = -33.3742;
const LON = -70.6725;

const WMO_CODES = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: 'DRIZZLE', 53: 'DRIZZLE', 55: 'DRIZZLE',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  80: '🌦️', 81: '🌦️', 82: '🌦️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function getWeatherIcon(code) {
  if (WMO_CODES[code] === 'DRIZZLE') return '🌧️';
  return WMO_CODES[code] || '⛅';
}

async function getWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=auto`;
    const response = await axios.get(url);
    
    const data = response.data.current;
    
    return {
      temp: Math.round(data.temperature_2m),
      icon: getWeatherIcon(data.weather_code),
      desc: 'Huechuraba'
    };
  } catch (error) {
    console.error('[CLIMA] Error obteniendo datos:', error.message);
    return null; 
  }
}

module.exports = { getWeather };