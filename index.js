// backend/index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🔄 Refrescar access token usando refresh_token dinámico
async function refreshAccessToken(refresh_token) {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', refresh_token);

    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    return response.data.access_token;
  } catch (err) {
    console.error('❌ Error actualizando token:', err.response?.data || err.message);
    throw new Error('Token inválido');
  }
}

// 🎵 Buscar y reproducir canción con el token del usuario
app.get('/play', async (req, res) => {
  const query = req.query.query;
  const userRefreshToken = req.query.token || req.headers['authorization']?.replace('Bearer ', '');

  if (!query) return res.status(400).json({ ok: false, error: 'Falta query' });
  if (!userRefreshToken) return res.status(400).json({ ok: false, error: 'Falta refresh_token' });

  try {
    const access_token = await refreshAccessToken(userRefreshToken);

    const searchRes = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${access_token}` },
      params: { q: query, type: 'track', limit: 1 }
    });

    const track = searchRes.data.tracks.items[0];
    if (!track) return res.json({ ok: false, error: 'No encontrado' });

    await axios.put('https://api.spotify.com/v1/me/player/play', {
      uris: [track.uri]
    }, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    res.json({ ok: true, title: `${track.name} - ${track.artists[0].name}` });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ ok: false, error: 'Error al reproducir' });
  }
});

// 🚀 Iniciar servidor
app.listen(port, () => {
  console.log(`🎵 Spotify backend activo en puerto ${port}`);
});

