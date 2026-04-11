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

  supabase: {
    redirect: false,
  },

runtimeConfig: {
    public: {
     // supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      //supabaseKey: process.env.NUXT_PUBLIC_SUPABASE_KEY,
      recaptchaSiteKey: process.env.NUXT_PUBLIC_RECAPTCHA_SITE_KEY,
    },
  },
});