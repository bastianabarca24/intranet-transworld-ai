🏢 Intranet Corporativa Transworld

Plataforma integral de gestión interna, comunicación y capacitación desarrollada para centralizar las operaciones de los colaboradores de Transworld. Construida con un enfoque modular, esta intranet facilita desde la lectura de comunicados oficiales hasta el seguimiento del aprendizaje continuo mediante su propio sistema LMS (Transworld Academy).

🚀 Características Principales

Dashboard Interactivo (Inicio): Panel central con indicadores financieros en tiempo real (Dólar, Euro, UF), clima, feed de LinkedIn de la empresa, menú de almuerzo semanal, próximos cumpleaños y carrusel de noticias destacadas.

Transworld Academy (LMS): Sistema de gestión de aprendizaje estructurado por áreas (Equipamiento Activo, Fibra Óptica, Infraestructura, Safety Machine). Incluye seguimiento de progreso de videos, evaluaciones con nota mínima de aprobación, y un completo Dashboard de KPIs para medir el rendimiento de los colaboradores.

Gestión de Recursos Humanos: Directorio de personal, visualizador de organigrama dinámico y accesos directos a portales externos (Rex+, ACHS, Caja Los Andes).

Comunicaciones y Noticias: Módulo para la creación, edición y publicación de noticias y eventos corporativos con soporte multimedia y notificaciones automáticas por correo electrónico.

Repositorio Documental (Procesos): Gestor de archivos categorizado (Procedimientos, Protocolos, Reglamento Interno) con distintos niveles de permisos de lectura y escritura según el rol del usuario.

Módulo de Soporte TI (Tickets): Sistema de Help Desk interno para la creación, asignación y seguimiento de incidencias, con historial de respuestas, adjuntos y alertas por correo.

Directorio de Aplicaciones: Repositorio centralizado para descargar herramientas de la empresa (APK, enlaces de PC y códigos QR para iOS).

🛠️ Stack Tecnológico

Backend: Node.js con Express.js.

Base de Datos: PostgreSQL (consultas nativas mediante pg pool).

Frontend: Motor de plantillas EJS, HTML5, CSS3 nativo y JavaScript (Vanilla).

Autenticación y Seguridad: Sesiones nativas, encriptación PBKDF2 para contraseñas y middleware de roles oficiales (`Usuario`, `Administrador`, `Deshabilitado`).

Almacenamiento Multimedia y Documental: SharePoint mediante Microsoft Graph para imágenes, videos, documentos y adjuntos expuestos internamente bajo rutas `/content/...`.

Notificaciones: Nodemailer para el envío de alertas transaccionales (confirmaciones de cuenta, tickets, nuevas noticias).

Gráficos y Datos: Chart.js (Dashboard de KPIs) y consumo de APIs de terceros (clima, divisas, LinkedIn).

🔒 Estructura de Roles y Permisos

El sistema está diseñado con un modelo de Control de Acceso Basado en Roles (RBAC). Los roles oficiales actuales son:

- `Usuario`: puede iniciar sesión y navegar las funcionalidades habilitadas para colaboradores.
- `Administrador`: puede iniciar sesión y acceder a paneles y acciones de administración.
- `Deshabilitado`: no puede iniciar sesión en la intranet.

Los roles históricos por área (`rrhh`, `marketing`, `gerencia`, `ventas`, etc.) se conservan solo como alias de compatibilidad en rutas protegidas y se tratan como permisos de `Administrador` cuando corresponde.

🔗 Almacenamiento en SharePoint

La intranet usa SharePoint como almacenamiento unificado mediante Microsoft Graph. Los archivos se guardan bajo `Content-Intranet-Transworld/public/content` y se sirven desde la aplicación con URLs internas `/content/...`.

Variables de entorno requeridas para la integración:

- `MS_CLIENT_ID`
- `MS_TENANT_ID`
- `MS_CLIENT_SECRET`
- `SP_SITE_ID`
