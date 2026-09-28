# SAJA Perfumes – Catálogo + Panel

- `index.html` → catálogo público (lo que ve el cliente)
- `admin.html` → panel privado (no hay ningún enlace a él desde el catálogo)
- `logo.png` → coloca aquí tu logo (misma carpeta que index.html)

## Pasos en Firebase (una sola vez) – https://console.firebase.google.com/project/saja-859b4
1. **Authentication › Comenzar › Sign-in method › Correo electrónico/contraseña › Habilitar.**
2. **Firestore Database › Crear base de datos** (modo producción, región us-central o la más cercana).
3. **Firestore › Reglas**: copia todo el contenido de `firestore.rules`, pégalo y presiona **Publicar** (vuelve a pegarlas si ya lo habías hecho: se agregaron Gastos y Cotizaciones).
4. Sube la carpeta a tu hosting (Firebase Hosting, Netlify, Vercel…). Debe abrirse por `https://`,
   no con doble clic al archivo.
5. Abre `tusitio.com/admin.html` y entra con **carlos / sajacarlos21@** (el primer inicio crea la cuenta).
   Hazlo en cuanto publiques el sitio.
6. En **Inicio**, presiona **Importar catálogo inicial** (472 perfumes con precios, existencias y 439 fotos).

## Roles
- **Administrador**: todo (caja, inventario, adeudos, clientes, reportes, configuración).
- **Empleado**: Punto de venta, Abonos, Productos, Inventario y Cajas. Puede vender, dar entrada de mercancía, agregar productos, recibir abonos y registrar salidas de caja.
  Para borrar, cancelar o editar se le piden usuario y contraseña de un administrador.
