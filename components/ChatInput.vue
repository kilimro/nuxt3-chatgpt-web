<template>
  <form 
    class="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
    @submit.prevent="handleSubmit"
  >
    <Label for="message" class="sr-only">
      消息
    </Label>
    
    <!-- 文件预览区域 -->
    <div v-if="uploadedFiles.length > 0" class="uploaded-files-preview p-3 border-b">
      <div class="flex flex-wrap gap-2">
        <div 
          v-for="(file, index) in uploadedFiles" 
          :key="index"
          class="flex items-center gap-2 bg-muted rounded-md p-2 text-sm"
        >
          <File v-if="!isImage(file)" class="size-4" />
          <img v-else :src="file.preview" class="size-8 object-cover rounded" />
          <span class="truncate max-w-32">{{ file.name }}</span>
          <Button
            variant="ghost"
            size="icon"
            class="h-4 w-4"
            @click="removeFile(index)"
          >
            <X class="size-3" />
          </Button>
        </div>
      </div>
    </div>
    
    <Textarea
      id="message"
      v-model="input"
      :placeholder="isListening ? '正在听取语音...' : '输入消息...'"
      class="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
      @keydown="handleKeydown"
      :disabled="isListening"
    />
    <div class="flex items-center p-3 pt-0">
      <!-- 文件上传按钮 -->
      <Button 
        variant="ghost" 
        size="icon"
        type="button"
        @click="handleFileUpload"
      >
        <Paperclip class="size-4" :class="{'text-primary': uploadedFiles.length > 0}" />
        <span class="sr-only">上传文件</span>
      </Button>
      
      <!-- 隐藏的文件上传输入框 -->
      <input
        ref="fileInput"
        type="file"
        class="hidden"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        @change="onFileSelected"
      />
      
      <!-- 语音输入按钮 -->
      <Button 
        variant="ghost" 
        size="icon"
        type="button"
        @click="toggleVoiceInput"
        :class="{ 'text-red-500': isListening }"
      >
        <Mic v-if="!isListening" class="size-4" />
        <MicOff v-else class="size-4" />
        <span class="sr-only">语音输入</span>
      </Button>
      
      <Button 
        type="submit" 
        size="sm" 
        class="ml-auto gap-1.5"
        :disabled="isLoading || (!input.trim() && uploadedFiles.length === 0)"
      >
        <template v-if="!isLoading">
          发送消息
          <CornerDownLeft class="size-3.5" />
        </template>
        <template v-else>
          <Loader2 class="size-3.5 animate-spin" />
        </template>
      </Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onUnmounted } from 'vue'
import { CornerDownLeft, Loader2, Paperclip, File, Mic, MicOff, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createChatCompletion } from '@/utils/api'
import { useChatStore } from '@/stores/chat'
import { useModelStore } from '@/stores/model'

const chatStore = useChatStore()
const modelStore = useModelStore()

// 获取全局设置
const globalSettings = JSON.parse(localStorage.getItem('settings') || '{"contextCount": 5}')

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const props = defineProps<{
  contextMessages?: Array<{
    role: 'system' | 'assistant' | 'user'
    content: string
  }>
  model?: string
  temperature?: number
  topP?: number
}>()

const emit = defineEmits<{
  send: [message: string]
  receive: [message: string, isError?: boolean]
  complete: []
}>()

const input = ref('')
const isLoading = ref(false)

// 语音识别相关
const isListening = ref(false)
const recognition = ref<any>(null)
const isVoiceSupported = ref(false)

// 文件上传相关
const fileInput = ref<HTMLInputElement | null>(null)
const uploadedFiles = ref<Array<{
  name: string
  size: number
  type: string
  file: File
  preview?: string
}>>([])

const STREAM_TIMEOUT = 30000 // 30秒超时

// 添加节流时间间隔
const EMIT_THROTTLE = 100 // 100ms
const lastEmitTime = ref(0)

const handleFileUpload = () => {
  fileInput.value?.click()
}

const onFileSelected = async (event: Event) => {
  const files = Array.from((event.target as HTMLInputElement).files || [])
  
  for (const file of files) {
    // 检查文件大小 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(`文件 ${file.name} 超过 10MB 限制`)
      continue
    }
    
    const fileData: any = {
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }
    
    // 如果是图片，生成预览
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        fileData.preview = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
    
    uploadedFiles.value.push(fileData)
  }
  
  // 清空input
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const removeFile = (index: number) => {
  const file = uploadedFiles.value[index]
  if (file.preview) {
    URL.revokeObjectURL(file.preview)
  }
  uploadedFiles.value.splice(index, 1)
}

const isImage = (file: any) => {
  return file.type.startsWith('image/')
}

// 语音识别功能
const initVoiceRecognition = () => {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    recognition.value = new SpeechRecognition()
    
    recognition.value.continuous = false
    recognition.value.interimResults = false
    recognition.value.lang = 'zh-CN'
    
    recognition.value.onstart = () => {
      isListening.value = true
    }
    
    recognition.value.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      input.value += (input.value ? ' ' : '') + transcript
    }
    
    recognition.value.onerror = (event: any) => {
      console.error('语音识别错误:', event.error)
      isListening.value = false
    }
    
    recognition.value.onend = () => {
      isListening.value = false
    }
    
    isVoiceSupported.value = true
  }
}

const toggleVoiceInput = () => {
  if (!isVoiceSupported.value) {
    alert('您的浏览器不支持语音识别功能')
    return
  }
  
  if (isListening.value) {
    recognition.value?.stop()
  } else {
    recognition.value?.start()
  }
}

const handleSubmit = async () => {
  if ((!input.value.trim() && uploadedFiles.value.length === 0) || isLoading.value) return
  
  let message = input.value

  // 如果有文件，添加到消息末尾
  if (uploadedFiles.value.length > 0) {
    const fileDescriptions = uploadedFiles.value.map(file => {
      if (file.type.startsWith('image/')) {
        return `[图片: ${file.name}]`
      } else if (file.type.startsWith('video/')) {
        return `[视频: ${file.name}]`
      } else if (file.type.startsWith('audio/')) {
        return `[音频: ${file.name}]`
      } else {
        return `[文件: ${file.name}]`
      }
    }).join('\n')
    
    message += '\n\n附件：\n' + fileDescriptions
  }

  input.value = ''
  
  // 清空文件
  uploadedFiles.value.forEach((file, index) => {
    if (file.preview) {
      URL.revokeObjectURL(file.preview)
    }
  })
  uploadedFiles.value = []
  
  isLoading.value = true
  
  // 先发送用户消息并触发滚动
  emit('send', message)
  
  const currentChat = chatStore.currentChat
  if (!currentChat) throw new Error('未找到当前对话')

  // 获取全局设置
  const globalSettings = process.client ? JSON.parse(localStorage.getItem('settings') || '{}') : {}
  
  console.log('Props model:', props.model)
  console.log('Current chat settings model:', currentChat.settings.model)
  
  // 使用props传入的model,如果没有则使用当前对话的设置
  const modelToUse = props.model || currentChat.settings.model
  console.log('Model to use:', modelToUse)
  
  // 查找模型配置，优先使用自定义模型的配置
  let modelConfig = modelStore.allModels.find(m => m.id === modelToUse)
  
  // 如果没找到模型配置，使用全局设置
  const apiKey = modelConfig?.apiKey || globalSettings.apiKey
  const baseUrl = modelConfig?.baseUrl || globalSettings.apiEndpoint || 'https://api.openai.com'
  
  if (!apiKey) {
    emit('receive', '请先在设置中配置API密钥', true)
    isLoading.value = false
    return
  }

  let response = ''
  let timeoutId: NodeJS.Timeout | null = null

  try {
    // 在发送请求前添加日志
    console.log('Sending request with settings:', {
      model: modelToUse,
      temperature: props.temperature,
      topP: props.topP
    })

    // 构建息数组
    const messages = [
      // 0. 系统提示词 - 如果设置了的话
      ...(globalSettings.systemPrompt && globalSettings.systemPrompt.trim() ? [{
        role: 'system' as const,
        content: globalSettings.systemPrompt.trim()
      }] : []),
      
      // 1. 上下文对话列表 - 确保非空且内容不为空  
      ...(props.contextMessages?.filter(msg => msg.content.trim()) || []),
      
      // 2. 历史消息
      ...currentChat.messages
        .slice(-(globalSettings.contextCount * 2))
        .map(msg => ({
          role: msg.role,
          content: msg.content
        })),

      // 3. 当前用户消息
      {
        role: 'user',
        content: message
      }
    ]

    // 添加详细的调试日志
    console.log('=== ChatInput 系统提示词调试 ===')
    console.log('globalSettings:', globalSettings)
    console.log('systemPrompt:', globalSettings.systemPrompt)
    console.log('构建的消息数组:', messages)
    console.log('==============================')

    // 在发送请求前添加日志
    console.log('Sending request with settings:', {
      model: modelToUse,
      temperature: props.temperature,
      topP: props.topP
    })

    // 使用props传入的参数
    for await (const chunk of createChatCompletion({
      model: modelToUse,
      messages,
      temperature: props.temperature ?? currentChat.settings.temperature,
      top_p: props.topP ?? currentChat.settings.topP,
      baseUrl: baseUrl,
      apiKey: apiKey,
      stream: true
    })) {
      if (chunk === '[DONE]') {
        break
      }
      
      response += chunk
      const now = Date.now()
      if (now - lastEmitTime.value >= EMIT_THROTTLE) {
        emit('receive', response)
        lastEmitTime.value = now
      }
    }
    
    // 确保发送最后一次更
    emit('receive', response)
    emit('complete')
  } catch (error: any) {
    console.error('发送消息失败:', error)
    emit('receive', error.message || '请求失败，请检查API设置', true)
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    isLoading.value = false
  }
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    if (e.shiftKey) {
      // Shift + Enter: 换行
      return
    } else {
      // 仅 Enter: 发送
      e.preventDefault()
      handleSubmit()
    }
  }
}

onMounted(() => {
  initVoiceRecognition()
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理文件预览
  uploadedFiles.value.forEach(file => {
    if (file.preview) {
      URL.revokeObjectURL(file.preview)
    }
  })
  
  // 停止语音识别
  if (recognition.value && isListening.value) {
    recognition.value.stop()
  }
})
</script>

<style scoped>
.resize-none {
  resize: none;
}

.uploaded-files-preview {
  background: hsl(var(--muted));
}
</style>