export default defineNuxtRouteMiddleware(() => {
  if (process.client) {
    const token = localStorage.getItem("token");

    if (!token) {
      // return navigateTo("/login");
      throw createError({
        statusCode: 401,
        statusMessage: "Sesión no válida",
      });
    }
  }
});
