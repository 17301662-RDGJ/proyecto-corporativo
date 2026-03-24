export default defineNuxtConfig({
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

  supabase: {
    redirect: false,
  },

  runtimeConfig: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY,

    public: {
      recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
    },
  },
});
