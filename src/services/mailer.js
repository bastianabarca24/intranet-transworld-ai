// src/services/mailer.js
const Brevo = require('@getbrevo/brevo');
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

// --- CONSTANTES DE FIRMA ---
const EMAIL_FOOTER_HTML = `
<br><hr style="border: 0; border-top: 1px solid #e0e0e0; margin-top: 20px; margin-bottom: 20px;">
<p style="font-size: 0.9rem; color: #555;">
  Para responder a este correo, por favor ingrese a la sección de tickets en la intranet.<br>
  Saludos cordiales,
</p>
<p style="font-size: 0.9rem; color: #555; margin-bottom: 0;">
  <strong>Area TI</strong>
</p>
<p style="font-size: 0.9rem; color: #555; margin-top: 5px;">
  Transworld Power & Telcom SpA
</p>
<img src="${APP_BASE_URL}/img/piedefirma.png" alt="Firma Transworld" style="max-width: 300px; height: auto; margin-top: 10px; border: none; outline: none;">
`;

const EMAIL_FOOTER_TEXT = `
--------------------------------------------------
Para responder a este correo, por favor ingrese a la sección de tickets en la intranet.

Saludos cordiales,
Area TI
Transworld Power & Telcom SpA
`;
// ----------------------------

// Configuración de la API de Brevo
const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY || process.env.SMTP_PASS
);

const sendMail = async ({ to, subject, text, html, bcc }) => {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  sendSmtpEmail.subject = subject;
  
  // Si hay texto plano, le adjuntamos la firma en texto plano
  if (text) {
    sendSmtpEmail.textContent = text + "\n\n" + EMAIL_FOOTER_TEXT;
  }
  
  // Si hay HTML, le adjuntamos la firma en HTML
  if (html) {
    // Cerramos los divs correctamente por si acaso
    sendSmtpEmail.htmlContent = html + EMAIL_FOOTER_HTML;
  }

  sendSmtpEmail.sender = { 
    name: "Intranet Transworld", 
    email: process.env.MAIL_FROM 
  };
  
  // Destinatario principal
  sendSmtpEmail.to = [{ email: to }];

  // Soporte para Copia Oculta (BCC) Múltiple
  if (bcc) {
    if (Array.isArray(bcc)) {
      sendSmtpEmail.bcc = bcc.map(correo => ({ email: correo }));
    } else {
      sendSmtpEmail.bcc = [{ email: bcc }];
    }
  }

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Correo enviado exitosamente vía API de Brevo');
    return data;
  } catch (error) {
    console.error('Error al enviar vía API de Brevo:', error);
    throw error;
  }
};

module.exports = { sendMail };