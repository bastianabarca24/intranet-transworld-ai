const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');
require('dotenv').config(); // Carga tus variables del .env

// 1. Configurar las credenciales que guardamos en el .env
const msalConfig = {
    auth: {
        clientId: process.env.MS_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.MS_TENANT_ID}`,
        clientSecret: process.env.MS_CLIENT_SECRET,
    }
};

const cca = new ConfidentialClientApplication(msalConfig);

async function ejecutarPrueba() {
    try {
        console.log("🔑 1. Solicitando token de acceso a Microsoft Azure...");
        const tokenResponse = await cca.acquireTokenByClientCredential({
            scopes: ['https://graph.microsoft.com/.default']
        });
        console.log("✅ Token obtenido con éxito.");

        // 2. Inicializar el cliente de Microsoft Graph con el token
        const client = Client.init({
            authProvider: (done) => done(null, tokenResponse.accessToken)
        });

        console.log("🔍 2. Conectando con tu sitio de SharePoint...");
        // Intentamos consultar los datos del sitio usando el SP_SITE_ID
        const sitio = await client.api(`/sites/${process.env.SP_SITE_ID}`).get();

        console.log("\n🎉 ¡CONEXIÓN 100% EXITOSA! 🎉");
        console.log(`📡 Conectado al sitio: "${sitio.displayName}"`);
        console.log(`🌐 URL de SharePoint: ${sitio.webUrl}`);

    } catch (error) {
        console.error("\n❌ Error en la conexión:");
        console.error(error.message);
    }
}

ejecutarPrueba();