// backend/index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

let access_token = "";
let refresh_token = process.env.SPOTIFY_REFRESH_TOKEN;

app.use(cors());
app.use(express.json());

async function refreshAccessToken() {
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

    access_token = response.data.access_token;
    console.log('✅ Access token actualizado');
  } catch (err) {
    console.error('❌ Error actualizando el token:', err.response?.data || err.message);
  }
}

// 🎵 Buscar y reproducir canción
app.get('/play', async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ ok: false, error: 'Falta query' });

  try {
    await refreshAccessToken();

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

// 🔐 Rutas TEMPORALES para obtener refresh_token
app.get('/login', (req, res) => {
  const redirect_uri = 'https://spotify-wf26.onrender.com/callback';
  const scopes = 'user-read-playback-state user-modify-playback-state streaming';

  const authURL = 'https://accounts.spotify.com/authorize?' +
    new URLSearchParams({
      response_type: 'code',
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scopes,
      redirect_uri
    }).toString();

  res.redirect(authURL);
});

app.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  const redirect_uri = 'https://spotify-wf26.onrender.com/callback';

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirect_uri);

    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(
          process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
        ).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const refresh_token = response.data.refresh_token;
    res.send(`✅ Tu REFRESH TOKEN es:<br><br><code>${refresh_token}</code><br><br>¡Guárdalo en Render y elimina /login y /callback luego!`);
  } catch (err) {
    console.error('Error obteniendo token:', err.response?.data || err.message);
    res.send('❌ Error obteniendo token. Mira la consola de Render.');
  }
});

app.listen(port, () => {
  console.log(`🎵 Spotify backend activo en puerto ${port}`);
});

