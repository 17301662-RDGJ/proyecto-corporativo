export default defineNuxtRouteMiddleware((to) => {
  if (process.client) {
    const usuario = useState("usuario", () => null);

    if (!usuario.value) {
      const stored = localStorage.getItem("usuario");
      if (stored) {
        usuario.value = JSON.parse(stored);
      }
    }

    if (!usuario.value && to.path !== "/login") {
      return navigateTo("/login");
    }
  }
});