import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Comfy Portal",
  description: "Your AI Image Generation Assistant",
  cleanUrls: true,
  // base: '/comfy-portal/', // Comment out for local dev, uncomment for deployment
  
  themeConfig: {
    // logo: '/assets/logo.png', // Assuming logo exists, adjust if needed
    socialLinks: [
      { icon: 'github', link: 'https://github.com/ShunL12324/comfy-portal' }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Comfy Portal'
    }
  },

  locales: {
    root: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/' },
          { text: 'Privacy', link: '/privacy' },
          { text: 'Terms', link: '/terms' }
        ],
        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Introduction', link: '/guide/' },
              { text: 'Local Server', link: '/guide/local-server' },
              { text: 'Remote Server', link: '/guide/remote-server' },
              { text: 'RunPod Server', link: '/guide/remote-server-runpod' },
              { text: 'Workflow JSON', link: '/guide/workflow-json' },
              { text: 'FAQ', link: '/guide/faq' }
            ]
          }
        ]
      }
    },
    zh: {
      label: '简体中文',
      lang: 'zh',
      link: '/zh/',
      themeConfig: {
        nav: [
          { text: '指南', link: '/zh/guide/local-server' }, // Pointing to first guide as index is missing
          { text: '隐私政策', link: '/zh/privacy' },
          { text: '服务条款', link: '/zh/terms' }
        ],
        sidebar: [
          {
            text: '指南',
            items: [
              { text: '本地服务器', link: '/zh/guide/local-server' },
              { text: '远程服务器', link: '/zh/guide/remote-server' },
              { text: 'RunPod 服务器', link: '/zh/guide/remote-server-runpod' },
              { text: '工作流 JSON', link: '/zh/guide/workflow-json' },
              { text: '常见问题', link: '/zh/guide/faq' }
            ]
          }
        ]
      }
    }
  }
})
