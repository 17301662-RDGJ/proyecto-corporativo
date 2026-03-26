export default defineNuxtRouteMiddleware((to) => {
  if (process.client) {
    const user = useSupabaseUser();

    if (!user.value && to.path !== "/login") {
      return navigateTo("/login");
    }
  }
});
