const axios = require("axios");
const db = require("../db");
const qs = require("querystring");

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const ORG_ID = process.env.LINKEDIN_ORG_ID;

function getRedirectUri() {
  if (process.env.LINKEDIN_CALLBACK_URL?.trim()) {
    return process.env.LINKEDIN_CALLBACK_URL.trim();
  }
  const base = (process.env.APP_BASE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}/auth/linkedin/callback`;
}

const TOKEN_KEY = "linkedin_token";
const REFRESH_KEY = "linkedin_refresh_token";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";

function logLinkedInError(context, error) {
  const details = error.response?.data;
  const detailStr =
    typeof details === "object" ? JSON.stringify(details) : details || error.message;
  console.error(`[LINKEDIN] ${context}:`, detailStr);
  return detailStr;
}

async function saveTokens(accessToken, refreshToken) {
  await db.query(
    `INSERT INTO system_config (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [TOKEN_KEY, accessToken],
  );

  if (refreshToken) {
    await db.query(
      `INSERT INTO system_config (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [REFRESH_KEY, refreshToken],
    );
  }
}

async function getAccessToken() {
  const { rows } = await db.query(
    "SELECT value FROM system_config WHERE key = $1",
    [TOKEN_KEY],
  );
  return rows.length > 0 ? rows[0].value : null;
}

async function getRefreshToken() {
  const { rows } = await db.query(
    "SELECT value FROM system_config WHERE key = $1",
    [REFRESH_KEY],
  );
  return rows.length > 0 ? rows[0].value : null;
}

// 1. Iniciar Login manual
function getAuthorizationUrl() {
  const scope = "r_organization_social";
  const redirectUri = getRedirectUri();
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
}

// 2. Canjear código
async function exchangeCodeForToken(code) {
  const values = {
    grant_type: "authorization_code",
    code: code,
    redirect_uri: getRedirectUri(),
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  };

  try {
    const response = await axios.post(TOKEN_URL, qs.stringify(values), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token } = response.data;
    await saveTokens(access_token, refresh_token);

    if (!refresh_token) {
      console.warn(
        "[LINKEDIN] No se recibió refresh_token. La renovación automática no estará disponible hasta volver a autorizar.",
      );
    }

    return access_token;
  } catch (error) {
    const detail = logLinkedInError("Error autenticando", error);
    throw new Error(`Error autenticando con LinkedIn: ${detail}`);
  }
}

// 2b. Renovar access token con refresh token
async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error(
      "No hay refresh token guardado. Visite /auth/linkedin/login para reautorizar.",
    );
  }

  const values = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  };

  try {
    const response = await axios.post(TOKEN_URL, qs.stringify(values), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token } = response.data;
    await saveTokens(access_token, refresh_token || refreshToken);
    console.log("[LINKEDIN] Access token renovado automáticamente.");
    return access_token;
  } catch (error) {
    logLinkedInError("Error renovando token", error);
    throw error;
  }
}

function parsePosts(response) {
  if (!response.data || !response.data.elements) return [];

  const posts = [];
  for (const post of response.data.elements) {
    try {
      let text = "Publicación de Transworld";
      let imageUrl = "/img/fondo-home.png";
      const postUrl = `https://www.linkedin.com/feed/update/${post.id}`;

      if (
        post.specificContent &&
        post.specificContent["com.linkedin.ugc.ShareContent"]
      ) {
        const shareContent =
          post.specificContent["com.linkedin.ugc.ShareContent"];
        if (
          shareContent.shareCommentary &&
          shareContent.shareCommentary.text
        ) {
          text = shareContent.shareCommentary.text;
        }
      }

      const contentStr = JSON.stringify(post.specificContent || {});
      const urlsMatch = contentStr.match(
        /https:\/\/media\.licdn\.com\/dms\/image[^\s"\\]+/g,
      );

      if (urlsMatch && urlsMatch.length > 0) {
        imageUrl = urlsMatch[0];
      } else if (
        post.specificContent &&
        post.specificContent["com.linkedin.ugc.ShareContent"]
      ) {
        const mediaList =
          post.specificContent["com.linkedin.ugc.ShareContent"].media || [];
        if (
          mediaList.length > 0 &&
          mediaList[0].thumbnails &&
          mediaList[0].thumbnails.length > 0
        ) {
          imageUrl = mediaList[0].thumbnails[0].url;
        } else if (mediaList.length > 0 && mediaList[0].originalUrl) {
          imageUrl = mediaList[0].originalUrl;
        }
      }

      posts.push({ texto: text, imagen_url: imageUrl, enlace_url: postUrl });
    } catch (parseError) {
      console.log("[LINKEDIN] Error al procesar un post específico.");
    }
  }

  return posts.slice(0, 3);
}

async function fetchUgcPosts(accessToken) {
  const organizationUrn = `urn:li:organization:${ORG_ID}`;
  return axios.get(
    `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(organizationUrn)})&count=5`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
      },
    },
  );
}

// 3. Obtener Posts
async function getCompanyPosts() {
  let accessToken = await getAccessToken();
  if (!accessToken) return [];

  try {
    const response = await fetchUgcPosts(accessToken);
    return parsePosts(response);
  } catch (error) {
    if (error.response?.status !== 401) {
      logLinkedInError("Error obteniendo posts", error);
      return [];
    }

    try {
      accessToken = await refreshAccessToken();
      const response = await fetchUgcPosts(accessToken);
      return parsePosts(response);
    } catch (refreshError) {
      logLinkedInError("Renovación automática fallida", refreshError);
      console.error(
        "[LINKEDIN] Token inválido o expirado. Reautorice en /auth/linkedin/login",
      );
      return [];
    }
  }
}

module.exports = { getAuthorizationUrl, exchangeCodeForToken, getCompanyPosts };
