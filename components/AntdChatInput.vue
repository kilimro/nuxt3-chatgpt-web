<template>
  <div class="chat-input-container">
    <!-- 快捷提示 -->
    <div class="sender-prompts">
      <div class="prompts-list">
        <div 
          v-for="item in SENDER_PROMPTS" 
          :key="item.key"
          class="prompt-item"
          @click="handlePromptClick(item)"
        >
          <component :is="item.icon" class="prompt-icon" />
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>

    <!-- 附件上传区域 -->
    <div v-if="attachmentsVisible" class="attachments-header">
      <div class="attachments-title">
        <span>上传文件</span>
        <Button type="text" size="small" @click="setAttachmentsVisible(false)">
          <CloseOutlined />
        </Button>
      </div>
      <div class="attachments-content">
        <div class="upload-container">
          <Upload
            :before-upload="handleBeforeUpload"
            :file-list="attachedFiles"
            @change="handleFileChange"
            @remove="handleFileRemove"
            multiple
            :accept="acceptedFileTypes"
            :max-count="5"
            :show-upload-list="true"
          >
            <div class="upload-area" @drop="handleDrop" @dragover="handleDragOver">
              <CloudUploadOutlined class="upload-icon" />
              <div class="upload-text">
                <div class="upload-title">上传文件</div>
                <div class="upload-description">
                  支持图片、文档、音频、视频等格式<br>
                  单个文件最大 10MB，最多 5 个文件
                </div>
              </div>
            </div>
          </Upload>
          
          <!-- 文件预览区域 -->
          <div v-if="attachedFiles.length > 0" class="file-preview-area">
            <div class="file-preview-title">已选择的文件：</div>
            <div class="file-preview-list">
              <div 
                v-for="(file, index) in attachedFiles" 
                :key="file.uid"
                class="file-preview-item"
              >
                <div class="file-info">
                  <div class="file-icon">
                    <FileImageOutlined v-if="isImageFile(file)" />
                    <FileTextOutlined v-else-if="isDocumentFile(file)" />
                    <VideoCameraOutlined v-else-if="isVideoFile(file)" />
                    <AudioOutlined v-else-if="isAudioFile(file)" />
                    <FileOutlined v-else />
                  </div>
                  <div class="file-details">
                    <div class="file-name">{{ file.name }}</div>
                    <div class="file-size">{{ formatFileSize(file.size) }}</div>
                  </div>
                </div>
                <Button 
                  type="text" 
                  size="small" 
                  danger
                  @click="removeFile(index)"
                >
                  <DeleteOutlined />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 语音输入模态框 -->
    <a-modal
      v-model:open="voiceModalVisible"
      title="语音输入"
      :footer="null"
      width="400px"
      centered
    >
      <div class="voice-input-container">
        <div class="voice-status">
          <div class="voice-icon" :class="{ recording: isRecording, processing: isProcessing }">
            <AudioOutlined v-if="!isRecording && !isProcessing" />
            <div v-else-if="isRecording" class="recording-animation">
              <div class="wave"></div>
              <div class="wave"></div>
              <div class="wave"></div>
            </div>
            <LoadingOutlined v-else class="processing-icon" />
          </div>
          <div class="voice-text">
            <div v-if="!isRecording && !isProcessing" class="voice-ready">
              点击开始录音
            </div>
            <div v-else-if="isRecording" class="voice-recording">
              正在录音... {{ recordingTime }}s
            </div>
            <div v-else class="voice-processing">
              正在识别语音...
            </div>
          </div>
        </div>
        
        <div class="voice-controls">
          <Button 
            v-if="!isRecording && !isProcessing"
            type="primary" 
            size="large"
            @click="startRecording"
            :disabled="!isVoiceSupported"
          >
            <AudioOutlined />
            开始录音
          </Button>
          
          <div v-else-if="isRecording" class="recording-controls">
            <Button 
              type="default" 
              size="large"
              @click="stopRecording"
            >
              <StopOutlined />
              停止录音
            </Button>
            <Button 
              type="text" 
              size="large"
              @click="cancelRecording"
            >
              取消
            </Button>
          </div>
        </div>
        
        <!-- 识别结果 -->
        <div v-if="voiceResult" class="voice-result">
          <div class="voice-result-title">识别结果：</div>
          <div class="voice-result-text">{{ voiceResult }}</div>
          <div class="voice-result-actions">
            <Button type="primary" @click="useVoiceResult">
              使用此文本
            </Button>
            <Button @click="startRecording">
              重新录音
            </Button>
          </div>
        </div>
        
        <!-- 错误提示 -->
        <div v-if="voiceError" class="voice-error">
          <ExclamationCircleOutlined />
          <div class="voice-error-content">
            <div class="voice-error-message">{{ voiceError }}</div>
            <div v-if="voiceError.includes('麦克风权限')" class="voice-error-help">
              <div class="permission-steps">
                <div class="step-title">如何开启麦克风权限：</div>
                <div class="step-item">1. 点击地址栏左侧的锁图标 🔒</div>
                <div class="step-item">2. 选择"麦克风"权限</div>
                <div class="step-item">3. 设置为"允许"</div>
                <div class="step-item">4. 刷新页面后重试</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 不支持提示 -->
        <div v-if="!isVoiceSupported" class="voice-unsupported">
          <ExclamationCircleOutlined />
          您的浏览器不支持语音识别功能
        </div>
      </div>
    </a-modal>

    <!-- 输入框 -->
    <div class="sender-wrapper">
      <div class="sender-container">
        <!-- 前缀按钮 - 附件 -->
        <div class="sender-prefix">
          <Button
            type="text"
            @click="toggleAttachments"
            class="attachment-button"
          >
            <PaperClipOutlined />
          </Button>
        </div>

        <!-- 输入区域 -->
        <div class="sender-input">
          <textarea
            v-model="inputValue"
            :placeholder="loading ? 'AI 正在思考中...' : '请输入您的问题或使用技能'"
            :disabled="loading"
            class="input-textarea"
            @keydown="handleKeydown"
            rows="1"
            ref="textareaRef"
          />
        </div>

        <!-- 后缀按钮组 -->
        <div class="sender-actions">
          <Button
            type="text"
            class="speech-button"
            @click="openVoiceInput"
          >
            <AudioOutlined />
          </Button>
          
          <Button
            v-if="loading"
            type="default"
            size="small"
            @click="handleCancel"
            class="cancel-button"
          >
            <StopOutlined />
          </Button>
          
          <Button
            v-else
            type="primary"
            size="small"
            @click="handleSend"
            :disabled="!inputValue.trim()"
            class="send-button"
          >
            <SendOutlined />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { message, Upload } from 'ant-design-vue'
import { 
  PaperClipOutlined,
  CloudUploadOutlined,
  ScheduleOutlined,
  AppstoreOutlined,
  FileSearchOutlined,
  AppstoreAddOutlined,
  AudioOutlined,
  SendOutlined,
  StopOutlined,
  CloseOutlined,
  DeleteOutlined,
  FileImageOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  FileOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons-vue'
import { Button } from 'ant-design-vue'

defineProps<{
  loading?: boolean
}>()

const emit = defineEmits<{
  send: [message: string]
  cancel: []
}>()

const inputValue = ref('')
const attachmentsVisible = ref(false)
const attachedFiles = ref([])
const textareaRef = ref<HTMLTextAreaElement>()

// 语音输入相关
const voiceModalVisible = ref(false)
const isRecording = ref(false)
const isProcessing = ref(false)
const voiceResult = ref('')
const voiceError = ref('')
const recordingTime = ref(0)
const isVoiceSupported = ref(false)

// 语音识别相关变量
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []
let recordingTimer: NodeJS.Timeout | null = null
let recognition: any = null

// 支持的文件类型
const acceptedFileTypes = ref([
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', // 图片
  '.pdf', '.doc', '.docx', '.txt', '.rtf', // 文档
  '.mp3', '.wav', '.ogg', '.m4a', // 音频
  '.mp4', '.avi', '.mov', '.wmv', '.flv', // 视频
  '.zip', '.rar', '.7z', // 压缩包
].join(','))

// 快捷提示数据
const SENDER_PROMPTS = [
  {
    key: '1',
    label: 'AI助手',
    description: '帮我制定一个高效的学习计划',
    icon: ScheduleOutlined,
  },
  {
    key: '2',
    label: '代码生成',
    description: '帮我写一个Python数据分析脚本',
    icon: AppstoreOutlined,
  },
  {
    key: '3',
    label: '文案创作',
    description: '帮我写一篇关于AI发展的文章',
    icon: FileSearchOutlined,
  },
  {
    key: '4',
    label: '智能问答',
    description: '解释一下机器学习的基本概念',
    icon: AppstoreAddOutlined,
  },
]

const handlePromptClick = (item: any) => {
  inputValue.value = item.description
  handleSend()
}

const handleSend = () => {
  if (!inputValue.value.trim()) return
  
  // 构建消息内容
  let messageContent = inputValue.value
  
  // 如果有附件，添加到消息中
  if (attachedFiles.value.length > 0) {
    const fileDescriptions = attachedFiles.value.map(file => {
      if (isImageFile(file)) {
        return `[图片: ${file.name}]`
      } else if (isDocumentFile(file)) {
        return `[文档: ${file.name}]`
      } else if (isAudioFile(file)) {
        return `[音频: ${file.name}]`
      } else if (isVideoFile(file)) {
        return `[视频: ${file.name}]`
      } else {
        return `[文件: ${file.name}]`
      }
    }).join('\n')
    
    messageContent += '\n\n附件：\n' + fileDescriptions
  }
  
  emit('send', messageContent)
  inputValue.value = ''
  
  // 清空附件
  attachedFiles.value = []
  attachmentsVisible.value = false
  
  autoResize()
  
  // 添加调试日志
  const globalSettings = process.client ? JSON.parse(localStorage.getItem('settings') || '{}') : {}
  console.log('=== 系统提示词调试 ===')
  console.log('globalSettings:', globalSettings)
  console.log('systemPrompt:', globalSettings.systemPrompt)
  console.log('===================')
}

const handleCancel = () => {
  emit('cancel')
}

// 语音输入功能
const openVoiceInput = () => {
  voiceModalVisible.value = true
  voiceResult.value = ''
  voiceError.value = ''
}

const startRecording = async () => {
  try {
    voiceError.value = ''
    
    // 首先检查麦克风权限
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        if (permission.state === 'denied') {
          voiceError.value = '麦克风权限被拒绝。请在浏览器设置中允许此网站使用麦克风。'
          return
        }
      } catch (e) {
        // 某些浏览器可能不支持 permissions API，继续执行
      }
    }
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // 使用 Web Speech API
      startSpeechRecognition()
    } else {
      // 使用 MediaRecorder API 录音
      await startMediaRecording()
    }
  } catch (error) {
    console.error('录音失败:', error)
    if (error instanceof Error && error.name === 'NotAllowedError') {
      voiceError.value = '麦克风权限被拒绝。请点击地址栏的锁图标，允许此网站使用麦克风。'
    } else {
      voiceError.value = '录音失败，请检查麦克风权限和设备连接。'
    }
  }
}

const startSpeechRecognition = () => {
  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
  recognition = new SpeechRecognition()
  
  recognition.continuous = true
  recognition.interimResults = true
  recognition.lang = 'zh-CN'
  
  recognition.onstart = () => {
    isRecording.value = true
    recordingTime.value = 0
    startTimer()
  }
  
  recognition.onresult = (event: any) => {
    let finalTranscript = ''
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript
      }
    }
    
    if (finalTranscript) {
      voiceResult.value = finalTranscript
    }
  }
  
  recognition.onerror = (event: any) => {
    console.error('语音识别错误:', event.error)
    
    switch (event.error) {
      case 'not-allowed':
        voiceError.value = '麦克风权限被拒绝。请点击地址栏的锁图标，允许此网站使用麦克风。'
        break
      case 'no-speech':
        voiceError.value = '未检测到语音，请重新尝试录音。'
        break
      case 'audio-capture':
        voiceError.value = '无法访问麦克风，请检查设备连接。'
        break
      case 'network':
        voiceError.value = '网络错误，请检查网络连接后重试。'
        break
      case 'service-not-allowed':
        voiceError.value = '语音识别服务不可用，请稍后重试。'
        break
      default:
        voiceError.value = `语音识别失败: ${event.error}`
    }
    
    stopRecording()
  }
  
  recognition.onend = () => {
    isRecording.value = false
    stopTimer()
  }
  
  recognition.start()
}

const startMediaRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []
    
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data)
    }
    
    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' })
      await processAudioBlob(audioBlob)
      
      // 停止所有音频轨道
      stream.getTracks().forEach(track => track.stop())
    }
    
    mediaRecorder.start()
    isRecording.value = true
    recordingTime.value = 0
    startTimer()
  } catch (error) {
    console.error('MediaRecorder 启动失败:', error)
    
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        voiceError.value = '麦克风权限被拒绝。请点击地址栏的锁图标，允许此网站使用麦克风。'
      } else if (error.name === 'NotFoundError') {
        voiceError.value = '未找到麦克风设备，请检查设备连接。'
      } else {
        voiceError.value = '无法启动录音功能，请检查麦克风权限。'
      }
    } else {
      voiceError.value = '录音功能启动失败，请重试。'
    }
    
    throw error
  }
}

const processAudioBlob = async (audioBlob: Blob) => {
  isProcessing.value = true
  
  try {
    // 这里可以调用语音识别API
    // 暂时显示提示信息
    voiceResult.value = '语音文件已录制完成，请手动输入识别结果'
    message.info('语音录制完成，请手动输入识别的文字内容')
  } catch (error) {
    console.error('语音处理失败:', error)
    voiceError.value = '语音处理失败'
  } finally {
    isProcessing.value = false
  }
}

const stopRecording = () => {
  if (recognition) {
    recognition.stop()
  }
  
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
  
  isRecording.value = false
  stopTimer()
}

const cancelRecording = () => {
  stopRecording()
  voiceResult.value = ''
  voiceError.value = ''
}

const useVoiceResult = () => {
  if (voiceResult.value) {
    inputValue.value = voiceResult.value
    voiceModalVisible.value = false
    voiceResult.value = ''
  }
}

const startTimer = () => {
  recordingTimer = setInterval(() => {
    recordingTime.value++
  }, 1000)
}

const stopTimer = () => {
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }
}

const toggleAttachments = () => {
  attachmentsVisible.value = !attachmentsVisible.value
}

const setAttachmentsVisible = (visible: boolean) => {
  attachmentsVisible.value = visible
}

// 文件上传功能
const handleBeforeUpload = (file: File) => {
  // 检查文件大小 (10MB)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    message.error('文件大小不能超过 10MB')
    return false
  }
  
  // 检查文件数量
  if (attachedFiles.value.length >= 5) {
    message.error('最多只能上传 5 个文件')
    return false
  }
  
  return false // 阻止自动上传
}

const handleFileChange = (info: any) => {
  attachedFiles.value = info.fileList.filter((file: any) => file.status !== 'error')
}

const handleFileRemove = (file: any) => {
  const index = attachedFiles.value.findIndex((f: any) => f.uid === file.uid)
  if (index > -1) {
    attachedFiles.value.splice(index, 1)
  }
}

const removeFile = (index: number) => {
  attachedFiles.value.splice(index, 1)
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const files = Array.from(e.dataTransfer?.files || [])
  
  files.forEach(file => {
    if (handleBeforeUpload(file) !== false) {
      attachedFiles.value.push({
        uid: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        originFileObj: file
      })
    }
  })
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
}

// 文件类型判断
const isImageFile = (file: any) => {
  return file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file.name)
}

const isDocumentFile = (file: any) => {
  return file.type?.includes('document') || file.type?.includes('pdf') || 
         /\.(pdf|doc|docx|txt|rtf)$/i.test(file.name)
}

const isVideoFile = (file: any) => {
  return file.type?.startsWith('video/') || /\.(mp4|avi|mov|wmv|flv)$/i.test(file.name)
}

const isAudioFile = (file: any) => {
  return file.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(file.name)
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
  nextTick(() => {
    autoResize()
  })
}

const autoResize = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
  }
}

// 检查语音支持
onMounted(() => {
  isVoiceSupported.value = 'webkitSpeechRecognition' in window || 
                          'SpeechRecognition' in window || 
                          'mediaDevices' in navigator
})

// 清理资源
onUnmounted(() => {
  if (recordingTimer) {
    clearInterval(recordingTimer)
  }
  
  if (recognition) {
    recognition.stop()
  }
  
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  }
})
</script>

<style scoped>
.chat-input-container {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 快捷提示样式 */
.sender-prompts {
  width: 100%;
}

.prompts-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.prompt-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}

.prompt-item:hover {
  background: #e6f4ff;
  border-color: #1677ff;
  color: #1677ff;
}

.prompt-icon {
  font-size: 14px;
}

/* 附件上传样式 */
.attachments-header {
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fff;
}

.attachments-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 500;
}

.attachments-content {
  padding: 16px;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #1677ff;
  background: #f0f8ff;
}

.upload-icon {
  font-size: 48px;
  color: #d9d9d9;
  margin-bottom: 16px;
}

.upload-title {
  font-size: 16px;
  color: #262626;
  margin-bottom: 8px;
}

.upload-description {
  font-size: 14px;
  color: #8c8c8c;
}

/* 文件预览样式 */
.file-preview-area {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.file-preview-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #262626;
}

.file-preview-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-preview-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.file-icon {
  font-size: 20px;
  color: #1677ff;
}

.file-details {
  flex: 1;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 2px;
}

.file-size {
  font-size: 12px;
  color: #8c8c8c;
}

/* 语音输入样式 */
.voice-input-container {
  text-align: center;
  padding: 20px;
}

.voice-status {
  margin-bottom: 24px;
}

.voice-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 32px;
  background: #f5f5f5;
  color: #1677ff;
  transition: all 0.3s;
}

.voice-icon.recording {
  background: #ff4d4f;
  color: white;
  animation: pulse 1.5s infinite;
}

.voice-icon.processing {
  background: #1677ff;
  color: white;
}

.recording-animation {
  display: flex;
  gap: 4px;
  align-items: center;
}

.wave {
  width: 4px;
  height: 20px;
  background: white;
  border-radius: 2px;
  animation: wave 1.2s infinite ease-in-out;
}

.wave:nth-child(2) {
  animation-delay: 0.1s;
}

.wave:nth-child(3) {
  animation-delay: 0.2s;
}

.processing-icon {
  font-size: 32px;
  animation: spin 1s linear infinite;
}

.voice-text {
  font-size: 16px;
  color: #262626;
}

.voice-recording {
  color: #ff4d4f;
  font-weight: 500;
}

.voice-processing {
  color: #1677ff;
  font-weight: 500;
}

.voice-controls {
  margin-bottom: 24px;
}

.recording-controls {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.voice-result {
  background: #f0f8ff;
  border: 1px solid #d4edda;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  text-align: left;
}

.voice-result-title {
  font-weight: 500;
  margin-bottom: 8px;
  color: #262626;
}

.voice-result-text {
  background: white;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 12px;
  min-height: 40px;
  text-align: left;
}

.voice-result-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.voice-error,
.voice-unsupported {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
  color: #ff4d4f;
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
}

.voice-error-content {
  flex: 1;
}

.voice-error-message {
  margin-bottom: 8px;
  font-weight: 500;
}

.voice-error-help {
  font-size: 12px;
  color: #8c8c8c;
}

.permission-steps {
  margin-top: 8px;
}

.step-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: #595959;
}

.step-item {
  margin-bottom: 2px;
  padding-left: 8px;
}

/* 输入框样式 */
.sender-wrapper {
  width: 100%;
}

.sender-container {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fff;
  transition: all 0.2s;
  min-height: 48px;
}

.sender-container:focus-within {
  border-color: #1677ff;
  box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1);
}

.sender-prefix {
  display: flex;
  align-items: center;
  height: 32px;
}

.attachment-button {
  color: #8c8c8c;
  font-size: 18px;
  padding: 6px;
  height: 32px;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.attachment-button:hover {
  color: #1677ff;
  background: #f0f8ff;
}

.sender-input {
  flex: 1;
  display: flex;
  align-items: center;
}

.input-textarea {
  width: 100%;
  border: none;
  outline: none;
  resize: none;
  font-size: 14px;
  line-height: 1.5;
  background: transparent;
  min-height: 24px;
  max-height: 120px;
  overflow-y: auto;
  padding: 4px 0;
}

.input-textarea::placeholder {
  color: #bfbfbf;
}

.sender-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
}

.speech-button {
  color: #8c8c8c;
  font-size: 18px;
  padding: 6px;
  height: 32px;
  width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.speech-button:hover {
  color: #1677ff;
  background: #f0f8ff;
}

.send-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.cancel-button {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

/* 深色模式 */
.dark .prompt-item {
  background: #1f1f1f;
  border-color: #434343;
  color: #fff;
}

.dark .prompt-item:hover {
  background: #111b26;
  border-color: #1677ff;
}

.dark .attachments-header {
  background: #141414;
  border-color: #434343;
}

.dark .attachments-title {
  border-bottom-color: #303030;
  color: #fff;
}

.dark .upload-area {
  background: #1f1f1f;
  border-color: #434343;
}

.dark .upload-area:hover {
  background: #111b26;
  border-color: #1677ff;
}

.dark .sender-container {
  background: #141414;
  border-color: #434343;
}

.dark .sender-container:focus-within {
  border-color: #1677ff;
}

.dark .input-textarea {
  color: #fff;
}

.dark .input-textarea::placeholder {
  color: #595959;
}

.dark .file-preview-title {
  color: #fff;
}

.dark .file-preview-item {
  background: #1f1f1f;
  border-color: #434343;
}

.dark .file-name {
  color: #fff;
}

.dark .file-size {
  color: #999;
}

.dark .voice-text {
  color: #fff;
}

.dark .voice-result {
  background: #1f1f1f;
  border-color: #434343;
}

.dark .voice-result-title {
  color: #fff;
}

.dark .voice-result-text {
  background: #141414;
  border-color: #434343;
  color: #fff;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-input-container {
    max-width: 100%;
    padding: 0 16px;
  }
  
  .prompts-list {
    flex-direction: column;
  }
  
  .prompt-item {
    justify-content: center;
  }
  
  .voice-icon {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }
  
  .recording-controls {
    flex-direction: column;
    align-items: center;
  }
}

/* 动画效果 */
@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(255, 77, 79, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0);
  }
}

@keyframes wave {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>