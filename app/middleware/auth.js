export default defineNuxtRouteMiddleware((to) => {
  if (process.client) {
    const usuario = useState("usuario");

    // Recuperar de localStorage si se perdió el estado
    if (!usuario.value) {
      const stored = localStorage.getItem("usuario");
      if (stored) {
        usuario.value = JSON.parse(stored);
      }
    }

    // Si no hay usuario → mandar a login
    if (!usuario.value && to.path !== "/login") {
      return navigateTo("/login");
    }
  }
});
