export default defineNuxtPlugin(() => {
  // 只在客户端执行
  if (process.client) {
    const urlParams = new URLSearchParams(window.location.search)
    const server = urlParams.get('server')
    const key = urlParams.get('key')
    
    // 如果URL中有server和key参数，保存到localStorage
    if (server && key) {
      console.log('检测到URL参数配置:', { server, key: key.substring(0, 10) + '...' })
      
      // 获取现有设置
      const existingSettings = JSON.parse(localStorage.getItem('settings') || '{}')
      
      // 更新API配置
      const updatedSettings = {
        ...existingSettings,
        apiEndpoint: server,
        apiKey: key,
        defaultModel: existingSettings.defaultModel || 'gpt-3.5-turbo'
      }
      
      // 保存到localStorage
      localStorage.setItem('settings', JSON.stringify(updatedSettings))
      
      console.log('URL参数配置已保存到本地存储')
      
      // 清理URL参数（可选，保持URL干净）
      const cleanUrl = window.location.origin + window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }
})