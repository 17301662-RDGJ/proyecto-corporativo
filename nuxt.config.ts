export default defineNuxtConfig({
  ssr: false,

  app: {
    head: {
      script: [
        {
          src: "https://www.google.com/recaptcha/api.js",
          async: true,
          defer: true,
        },
      ],
    },
  },

  modules: ["@nuxtjs/supabase"],

  // Le inyectamos las variables DIRECTAMENTE a la configuración del módulo
  supabase: {
    redirect: false,
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_KEY,
  },

  runtimeConfig: {
    public: {
      // Dejamos únicamente reCAPTCHA aquí, que sí lo necesita así
      recaptchaSiteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY,
    },
  },
});