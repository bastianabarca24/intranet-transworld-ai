const db = require("../db");
const { ROLES } = require("../constants/roles");

/**
 * Sin correo o sin verificar → rol Deshabilitado.
 * Con correo (aunque no verificado) → siguen en la intranet (usuario_intranet = TRUE).
 * Sin correo → fuera de la intranet (usuario_intranet = FALSE).
 */
async function syncUnverifiedUsersToDisabled() {
  const sql = `
    UPDATE users
    SET role = $1,
        usuario_intranet = (email IS NOT NULL AND BTRIM(email) <> '')
    WHERE (
      email IS NULL
      OR BTRIM(email) = ''
      OR COALESCE(email_confirmed, FALSE) = FALSE
    )
    AND (
      role IS DISTINCT FROM $1
      OR usuario_intranet IS DISTINCT FROM (email IS NOT NULL AND BTRIM(email) <> '')
    )
    RETURNING id
  `;

  const result = await db.query(sql, [ROLES.DESHABILITADO]);
  return result.rowCount || 0;
}

module.exports = { syncUnverifiedUsersToDisabled };
