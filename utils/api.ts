interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatCompletionOptions {
  model: string
  temperature?: number
  top_p?: number
  stream?: boolean
  messages: Message[]
  baseUrl?: string
  apiKey?: string
}

interface OpenAIError {
  error: {
    message: string
    type: string
    param: string | null
    code: string
  }
}

// 获取设置的辅助函数
function getSettings() {
  if (process.client) {
    const settings = localStorage.getItem('settings')
    return settings ? JSON.parse(settings) : {}
  }
  return {}
}

export async function* createChatCompletion(options: ChatCompletionOptions) {
  const globalSettings = getSettings()
  
  // 优先使用传入的参数，然后是全局设置
  const apiKey = options.apiKey || globalSettings.apiKey
  const apiEndpoint = options.baseUrl || globalSettings.apiEndpoint || 'https://api.openai.com'
  
  if (!apiKey) {
    throw new Error('请先配置API密钥（可通过设置页面或URL参数配置）')
  }
  
  console.log('使用API配置:', { 
    endpoint: apiEndpoint, 
    keyPrefix: apiKey.substring(0, 10) + '...',
    model: options.model 
  })
  
  // 添加调试日志
  console.log('=== API调用调试 ===')
  console.log('发送的消息:', options.messages)
  console.log('消息数量:', options.messages.length)
  console.log('第一条消息:', options.messages[0])
  console.log('是否包含系统消息:', options.messages.some(msg => msg.role === 'system'))
  console.log('================')
  
  try {
    const response = await fetch(`${apiEndpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ...options,
        stream: true
      })
    })

    if (!response.ok) {
      const error = await response.json() as OpenAIError
      throw new Error(error.error?.message || 'API请求失败')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    while (reader) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(line => line.trim() !== '')

      for (const line of lines) {
        if (line.includes('[DONE]')) {
          yield '[DONE]'
          break
        }

        try {
          const data = JSON.parse(line.replace('data: ', ''))
          const content = data.choices[0]?.delta?.content || ''
          if (content) yield content
        } catch (e) {
          console.error('解析响应失败:', e)
        }
      }
    }
  } catch (error) {
    throw error
  }
}

// 测试API连接
export async function testApiConnection(apiEndpoint: string, apiKey: string) {
  try {
    const response = await fetch(`${apiEndpoint}/v1/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      const error = await response.json() as OpenAIError
      throw new Error(error.error?.message || response.statusText)
    }

    const data = await response.json()
    return {
      success: true,
      data: data.data || [],
      message: `连接成功！找到 ${data.data?.length || 0} 个可用模型`
    }
  } catch (error: any) {
    return {
      success: false,
      message: error.message || '连接失败'
    }
  }
}