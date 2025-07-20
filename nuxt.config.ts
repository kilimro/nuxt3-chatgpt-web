// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: false },
  ssr: false,
  modules: [
    'shadcn-nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/color-mode',
    'nuxt-lucide-icons',
    '@pinia/nuxt'
  ],
  css: [
    '@/assets/css/main.css',
    'ant-design-vue/dist/reset.css'
  ],
  // @ts-ignore - shadcn-nuxt 模块会注入这些类型
  shadcn: {
    prefix: '',
    componentDir: './components/ui'
  },
  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'system',
    hid: 'nuxt-color-mode-script',
    globalName: '__NUXT_COLOR_MODE__',
    componentName: 'ColorScheme',
    classPrefix: '',
    storageKey: 'nuxt-color-mode',
    dataValue: 'theme'
  },
  nitro: {
    compressPublicAssets: true,
    // 添加开发服务器配置
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    optimizeDeps: {
      include: ['md-editor-v3'],
      exclude: []
    },
    ssr: {
      noExternal: ['md-editor-v3']
    },
    // 添加服务器配置
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      hmr: {
        protocol: 'ws',
        host: '0.0.0.0',
        port: 24678
      }
    }
  },
  // 修改生成配置
  experimental: {
    payloadExtraction: false
  },
  // 添加路由配置
  router: {
    options: {
      // hashMode: true  // 删除此行
    }
  },
  app: {
    baseURL: '/',
    buildAssetsDir: '_nuxt',
    // 允许iframe嵌入
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        { name: 'keywords', content: 'MIANPROAI,MIANPROAI-Web,AI,ChatGPT,AI聊天机器人,AI聊天,AI聊天助手,AI聊天工具,AI聊天软件,AI聊天应用,AI聊天服务,AI聊天平台,AI聊天开发,AI聊天技术,AI聊天工具,AI聊天软件,AI聊天应用,AI聊天服务,AI聊天平台,AI聊天开发,AI聊天技术' },
        { name: 'description', content: 'MIANPROAI-Web是一款基于ChatGPT的AI聊天机器人，支持多种语言，支持多种模型，支持多种API，支持多种文档，支持多种设置，支持多种功能，支持多种应用，支持多种服务，支持多种平台，支持多种开发，支持多种技术' }
      ],
      title: 'MIANPROAI-Web',
    }
  },
  // 添加安全头配置，允许iframe嵌入
  nitro: {
    compressPublicAssets: true,
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'ALLOWALL',
          'Content-Security-Policy': "frame-ancestors *;"
        }
      }
    },
    // 添加头部配置
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        { name: 'keywords', content: 'MIANPROAI,MIANPROAI-Web,AI,ChatGPT,AI聊天机器人,AI聊天,AI聊天助手,AI聊天工具,AI聊天软件,AI聊天应用,AI聊天服务,AI聊天平台,AI聊天开发,AI聊天技术,AI聊天工具,AI聊天软件,AI聊天应用,AI聊天服务,AI聊天平台,AI聊天开发,AI聊天技术' },
        { name: 'description', content: 'MIANPROAI-Web是一款基于ChatGPT的AI聊天机器人，支持多种语言，支持多种模型，支持多种API，支持多种文档，支持多种设置，支持多种功能，支持多种应用，支持多种服务，支持多种平台，支持多种开发，支持多种技术' }
      ],
      title: 'MIANPROAI-Web',
    }
  }
})