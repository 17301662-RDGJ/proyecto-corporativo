export default defineNuxtRouteMiddleware(async (to) => {
  const { usuario, validarRuta, init } = usePermisos();

  // 🔥 Inicializar
  await init();

  // 🔥 NO validar login (clave)
  if (to.path === "/login") return;

  // 🔐 Si no hay usuario → login
  if (!usuario.value) {
    return navigateTo("/login");
  }

  // 🔥 Evitar loop en dashboard
  if (to.path === "/dashboard") return;

  // 🔐 Validar acceso
  const permitido = await validarRuta(to.path);

  if (!permitido) {
    return navigateTo("/dashboard"); // ahora sí seguro
  }

  // ✅ NO regresar nada si todo está bien
});