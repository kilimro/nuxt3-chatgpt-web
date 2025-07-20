<template>
  <div ref="chatMessagesRef" class="chat-messages" @scroll="handleScroll">
    <!-- 欢迎页面 -->
    <div v-if="!messages.length" class="welcome-container">
      <div class="welcome-space">
        <!-- 欢迎卡片 -->
        <a-card class="welcome-card" :bordered="false">
          <div class="welcome-header">
            <img
              src="https://wiki.920pdd.com/uploads/avatars/2025/07/20//DgmtBCbvPyZgSzPO.png"
              alt="AI Avatar"
              class="welcome-avatar"
            />
            <div class="welcome-content">
              <h2 class="welcome-title">你的私人助理MIANPRO</h2>
              <p class="welcome-description">基于先进的AI技术，为您提供智能对话体验</p>
            </div>
            <div class="welcome-actions">
              <a-button type="text" size="small" @click="handleShare" title="分享">
                <ShareAltOutlined />
              </a-button>
              <a-dropdown :trigger="['click']">
                <a-button type="text" size="small" title="更多操作">
                  <EllipsisOutlined />
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item key="about" @click="showAbout">
                      <InfoCircleOutlined />
                      关于 MIANPRO
                    </a-menu-item>
                    <a-menu-item key="help" @click="showHelp">
                      <QuestionCircleOutlined />
                      使用帮助
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="github" @click="openGitHub">
                      <GithubOutlined />
                      查看源码
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>
          </div>
        </a-card>

        <!-- 快捷提示 -->
        <div class="prompts-flex">
          <div class="prompt-section">
            <div class="prompt-header">
              <span class="prompt-label">热门话题</span>
              <a-button 
                type="text" 
                size="small" 
                :loading="loadingHotSearch"
                @click="fetchHotSearch"
                class="refresh-button"
              >
                <SyncOutlined />
              </a-button>
            </div>
            <div class="prompt-list">
              <div 
                v-for="item in hotTopics" 
                :key="item.key"
                class="prompt-item hot-topic"
                @click="handlePromptClick(item)"
              >
                <span class="prompt-number" :style="{ color: item.color }">{{ item.number }}</span>
                <span class="prompt-description">{{ item.description }}</span>
              </div>
              <!-- 调试信息 - 显示数据状态 -->
              <div v-if="loadingHotSearch" class="prompt-item debug-item">
                <span class="prompt-description">正在加载热搜数据...</span>
              </div>
            </div>
          </div>

          <div class="prompt-section">
            <div class="prompt-header">
              <span class="prompt-label">角色仓库</span>
            </div>
            <div class="prompt-list">
              <div 
                v-for="item in ROLE_REPOSITORY" 
                :key="item.key"
                class="prompt-item role-repository"
                @click="handlePromptClick(item)"
              >
                <component :is="item.icon" class="prompt-icon" />
                <div class="prompt-content">
                  <span class="prompt-title">{{ item.label }}</span>
                  <span class="prompt-description">{{ item.description }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息列表 - 使用官方样式 -->
    <div v-else class="message-list">
      <div class="bubble-list" :style="{ paddingInline: 'calc((100% - 700px) / 2)' }">
        <div 
          v-for="(message, index) in messages" 
          :key="index"
          class="bubble-item"
          :class="[
            `bubble-${message.role}`,
            { 'bubble-loading': loading && index === messages.length - 1 && message.role === 'assistant' }
          ]"
        >
          <!-- 用户消息 -->
          <div v-if="message.role === 'user'" class="bubble-user">
            <div class="user-content">
              {{ message.content }}
            </div>
            <a-avatar size="small" class="user-avatar">
              <UserOutlined />
            </a-avatar>
          </div>

          <!-- AI消息 -->
          <div v-else class="bubble-assistant">
            <a-avatar size="small" class="ai-avatar" :src="'https://api.920pdd.com/img/1f60b.webp'">
              <template #icon><RobotOutlined /></template>
            </a-avatar>
            <div class="ai-content-wrapper">
              <div class="ai-content" :class="{ 'loading-message': loading && index === messages.length - 1 }">
                <div v-if="loading && index === messages.length - 1" class="typing-indicator">
                  <a-spin size="small" />
                  <span class="typing-text">💗</span>
                </div>
                <div v-else class="message-text">
                  <MdPreview 
                    :modelValue="message.content" 
                    :codeFoldable="false"
                    :showCodeRowNumber="false"
                    class="markdown-content"
                  />
                </div>
              </div>
              <div class="ai-actions">
                <a-button type="text" size="small" @click="handleRegenerate">
                  <ReloadOutlined />
                </a-button>
                <a-button 
                  type="text" 
                  size="small" 
                  @click="handleVoiceRead(message.content)"
                  :loading="isReading && currentReadingMessage === message.timestamp.getTime().toString()"
                  :title="isReading && currentReadingMessage === message.timestamp.getTime().toString() ? '停止朗读' : '语音朗读'"
                >
                  <SoundOutlined v-if="!isReading || currentReadingMessage !== message.timestamp.getTime().toString()" />
                  <PauseOutlined v-else />
                </a-button>
                <a-button type="text" size="small" @click="handleCopy(message.content)">
                  <CopyOutlined />
                </a-button>
                <a-button type="text" size="small" @click="handleLike">
                  <LikeOutlined />
                </a-button>
                <a-button type="text" size="small" @click="handleDislike">
                  <DislikeOutlined />
                </a-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 关于弹窗 -->
  <a-modal
    v-model:open="showAboutModal"
    title="关于 MIANPRO"
    :footer="null"
    width="500px"
  >
    <div class="about-content">
      <div class="about-header">
        <img
          src="https://api.920pdd.com/img/222.png"
          alt="MIANPRO"
          class="about-avatar"
        />
        <div>
          <h3>MIANPRO AI助手</h3>
          <p>版本 1.0.0</p>
        </div>
      </div>
      <div class="about-description">
        <p>MIANPRO 是一个基于先进AI技术的智能助手，致力于为用户提供高质量的对话体验和问题解决方案。</p>
        <h4>主要特性：</h4>
        <ul>
          <li>🤖 智能对话：基于大语言模型的自然对话</li>
          <li>🎨 现代界面：简洁美观的用户界面</li>
          <li>🌙 主题切换：支持深浅色主题</li>
          <li>📱 响应式设计：完美适配各种设备</li>
          <li>🔧 灵活配置：丰富的个性化设置</li>
        </ul>
      </div>
    </div>
  </a-modal>


  <!-- 使用帮助弹窗 -->
  <a-modal
    v-model:open="showHelpModal"
    title="使用帮助"
    :footer="null"
    width="600px"
  >
    <div class="help-content">
      <a-collapse>
        <a-collapse-panel key="basic" header="基础使用">
          <p><strong>开始对话：</strong>在输入框中输入您的问题，按回车键或点击发送按钮。</p>
          <p><strong>新建对话：</strong>点击左侧边栏的"新建对话"按钮创建新的对话。</p>
          <p><strong>管理对话：</strong>在对话列表中可以重命名或删除对话。</p>
        </a-collapse-panel>
        <a-collapse-panel key="advanced" header="高级功能">
          <p><strong>语音输入：</strong>点击输入框右侧的麦克风图标进行语音输入。</p>
          <p><strong>文件上传：</strong>点击输入框左侧的附件图标上传文件。</p>
          <p><strong>模型设置：</strong>在设置中可以选择不同的AI模型和调整参数。</p>
        </a-collapse-panel>
        <a-collapse-panel key="settings" header="个性化设置">
          <p><strong>主题切换：</strong>在设置中可以切换深浅色主题。</p>
          <p><strong>API配置：</strong>可以配置自己的API密钥和地址。</p>
          <p><strong>系统提示词：</strong>设置AI的角色和行为方式。</p>
        </a-collapse-panel>
        <a-collapse-panel key="shortcuts" header="快捷键">
          <p><strong>Enter：</strong>发送消息</p>
          <p><strong>Shift + Enter：</strong>换行</p>
          <p><strong>Ctrl/Cmd + /：</strong>打开设置</p>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUpdated } from 'vue'
import { message } from 'ant-design-vue'
import { MdPreview } from "md-editor-v3"
import "md-editor-v3/lib/style.css"
import { 
  ShareAltOutlined,
  EllipsisOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  GithubOutlined,
  ReloadOutlined,
  CopyOutlined,
  LikeOutlined,
  DislikeOutlined,
  HeartOutlined,
  SmileOutlined,
  CommentOutlined,
  PaperClipOutlined,
  UserOutlined,
  RobotOutlined,
  SyncOutlined,
  SoundOutlined,
  PauseOutlined
} from '@ant-design/icons-vue'
import type { Message } from '~/types/chat'

const props = defineProps<{
  messages: Message[]
  loading?: boolean
}>()

const emit = defineEmits<{
  send: [message: string]
  regenerate: [messageId: string]
  copy: [content: string]
  like: [messageId: string]
  dislike: [messageId: string]
}>()

// 获取DOM引用
const chatMessagesRef = ref<HTMLElement>()

// 热搜数据
const hotTopics = ref([])
const loadingHotSearch = ref(false)

// 是否应该自动滚动（用户没有手动滚动时才自动滚动）
const shouldAutoScroll = ref(true)

// 弹窗状态
const showAboutModal = ref(false)
const showHelpModal = ref(false)

// 语音朗读相关
const isReading = ref(false)
const currentReadingMessage = ref<string | null>(null)
const speechSynthesis = ref<SpeechSynthesis | null>(null)
const currentUtterance = ref<SpeechSynthesisUtterance | null>(null)

// 处理用户手动滚动
const handleScroll = () => {
  if (!chatMessagesRef.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.value
  // 如果用户滚动到接近底部（50px内），则启用自动滚动
  shouldAutoScroll.value = scrollHeight - scrollTop - clientHeight < 50
}

// 滚动到底部函数
const scrollToBottom = async () => {
  if (!shouldAutoScroll.value) return
  
  await nextTick()
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

// 监听消息变化
watch(() => props.messages, (newMessages, oldMessages) => {
  // 当消息数量增加时滚动到底部
  if (newMessages && newMessages.length > (oldMessages?.length || 0)) {
    // 有新消息时启用自动滚动
    shouldAutoScroll.value = true
    nextTick(() => {
      scrollToBottom()
    })
  }
})
// 组件更新后滚动
onUpdated(() => {
  scrollToBottom()
})

// 组件挂载后如果有消息就滚动到底部
onMounted(() => {
  if (props.messages.length > 0) {
    nextTick(() => {
      scrollToBottom()
    })
  }
})

// 获取热搜数据
const fetchHotSearch = async () => {
  console.log('=== fetchHotSearch 函数开始执行 ===')
  loadingHotSearch.value = true

  try {
    const res = await fetch('https://api.920pdd.com/API/60s/xw.php?type=json')
    if (!res.ok) throw new Error('网络请求失败')
    const data = await res.json()
    // 只取前6条，并映射成你需要的格式
    hotTopics.value = (data.slice(0, 6) as Array<{ word: string }>).map((item: { word: string }, idx: number) => ({
      key: `hot-${idx + 1}`,
      description: item.word,
      number: (idx + 1).toString(),
      color: [
        '#f93a4a', '#ff6565', '#ff8f1f', '#ffa940', '#faad14', '#00000040'
      ][idx] || '#000'
    }))
  } catch (error) {
    console.error('获取热搜数据失败:', error)
    // 使用备用数据
    const fallbackData = [
      {
        key: 'hot-1',
        description: '12306回应高铁不要食用方便面提醒',
        number: '1',
        color: '#f93a4a'
      },
      {
        key: 'hot-2',
        description: '偷渡出境男子：被打七八百棍血流三碗',
        number: '2',
        color: '#ff6565'
      },
      {
        key: 'hot-3',
        description: '2025三伏天日历请查收',
        number: '3',
        color: '#ff8f1f'
      },
      {
        key: 'hot-4',
        description: '中国女篮不敌日本 无缘亚洲杯决赛',
        number: '4',
        color: '#ffa940'
      },
      {
        key: 'hot-5',
        description: '卡车司机带16岁儿子出车 双双遇难',
        number: '5',
        color: '#faad14'
      },
      {
        key: 'hot-6',
        description: '净网2025：网警打击涉汛网络谣言',
        number: '6',
        color: '#00000040'
      }
    ]
    hotTopics.value = fallbackData
    message.error('网络请求失败，使用备用数据')
  } finally {
    loadingHotSearch.value = false
    console.log('=== fetchHotSearch 完成 ===')
  }
}

// 组件挂载时获取热搜数据
onMounted(() => {
  fetchHotSearch()
})

// 组件卸载时停止朗读
onUnmounted(() => {
  stopReading()
})

// 角色仓库数据 - 按照官方格式
const ROLE_REPOSITORY = [
  {
    key: 'role-1',
    icon: HeartOutlined,
    label: 'AI助手',
    description: '帮我制定一个高效的学习计划',
  },
  {
    key: 'role-2',
    icon: SmileOutlined,
    label: '代码生成',
    description: '帮我写一个Python数据分析脚本',
  },
  {
    key: 'role-3',
    icon: CommentOutlined,
    label: '文案创作',
    description: '帮我写一篇关于AI发展的文章',
  },
  {
    key: 'role-4',
    icon: PaperClipOutlined,
    label: '智能问答',
    description: '解释一下机器学习的基本概念',
  }
]

const handlePromptClick = (item: any) => {
  console.log('=== 点击热搜词条 ===', item)
  // 直接调用父组件的发送方法
  if (item.description) {
    console.log('发送消息:', item.description)
    emit('send', item.description)
  }
}

const handleRegenerate = () => {
  const lastMessage = props.messages[props.messages.length - 1]
  if (lastMessage) {
    emit('regenerate', lastMessage.timestamp.getTime().toString())
  }
}

const handleCopy = (content: string) => {
  emit('copy', content)
}

const handleLike = () => {
  const lastMessage = props.messages[props.messages.length - 1]
  if (lastMessage) {
    emit('like', lastMessage.timestamp.getTime().toString())
  }
}

const handleDislike = () => {
  const lastMessage = props.messages[props.messages.length - 1]
  if (lastMessage) {
    emit('dislike', lastMessage.timestamp.getTime().toString())
  }
}

// 分享功能
const handleShare = async () => {
  const shareData = {
    title: 'MIANPRO AI助手',
    text: '我发现了一个很棒的AI助手，快来试试吧！',
    url: window.location.href
  }

  try {
    if (navigator.share && navigator.canShare(shareData)) {
      await navigator.share(shareData)
      message.success('分享成功！')
    } else {
      // 降级到复制链接
      await navigator.clipboard.writeText(window.location.href)
      message.success('链接已复制到剪贴板！')
    }
  } catch (error) {
    console.error('分享失败:', error)
    // 再次降级到手动复制
    try {
      await navigator.clipboard.writeText(window.location.href)
      message.success('链接已复制到剪贴板！')
    } catch (clipboardError) {
      message.error('分享失败，请手动复制链接')
    }
  }
}

// 关于弹窗
const showAbout = () => {
  showAboutModal.value = true
}

// 意见反馈
const showHelp = () => {
  showHelpModal.value = true
}

// 打开GitHub
const openGitHub = () => {
  window.open('https://github.com/kilimro/nuxt3-chatgpt-web', '_blank')
}

// 语音朗读功能
const handleVoiceRead = (content: string) => {
  const messageId = props.messages.find(msg => msg.content === content)?.timestamp.getTime().toString()
  
  // 如果正在朗读同一条消息，则停止
  if (isReading.value && currentReadingMessage.value === messageId) {
    stopReading()
    return
  }
  
  // 如果正在朗读其他消息，先停止
  if (isReading.value) {
    stopReading()
  }
  
  // 检查浏览器支持
  if (!('speechSynthesis' in window)) {
    message.error('您的浏览器不支持语音朗读功能')
    return
  }
  
  try {
    speechSynthesis.value = window.speechSynthesis
    
    // 清理Markdown格式，只保留纯文本
    const cleanText = content
      .replace(/```[\s\S]*?```/g, '代码块')  // 代码块
      .replace(/`([^`]+)`/g, '$1')          // 行内代码
      .replace(/\*\*([^*]+)\*\*/g, '$1')    // 粗体
      .replace(/\*([^*]+)\*/g, '$1')        // 斜体
      .replace(/#{1,6}\s+/g, '')            // 标题
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 链接
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '图片$1') // 图片
      .replace(/>\s+/g, '')                 // 引用
      .replace(/[-*+]\s+/g, '')             // 列表
      .replace(/\d+\.\s+/g, '')             // 有序列表
      .replace(/\n+/g, '。')                // 换行转句号
      .trim()
    
    if (!cleanText) {
      message.warning('没有可朗读的文本内容')
      return
    }
    
    currentUtterance.value = new SpeechSynthesisUtterance(cleanText)
    currentUtterance.value.lang = 'zh-CN'
    currentUtterance.value.rate = 0.9
    currentUtterance.value.pitch = 1
    currentUtterance.value.volume = 1
    
    // 朗读开始
    currentUtterance.value.onstart = () => {
      isReading.value = true
      currentReadingMessage.value = messageId || null
    }
    
    // 朗读结束
    currentUtterance.value.onend = () => {
      isReading.value = false
      currentReadingMessage.value = null
      currentUtterance.value = null
    }
    
    // 朗读错误
    currentUtterance.value.onerror = (event) => {
      console.error('语音朗读错误:', event.error)
      isReading.value = false
      currentReadingMessage.value = null
      currentUtterance.value = null
      message.error('语音朗读失败，请重试')
    }
    
    speechSynthesis.value.speak(currentUtterance.value)
    
  } catch (error) {
    console.error('语音朗读初始化失败:', error)
    message.error('语音朗读功能初始化失败')
  }
}

// 停止朗读
const stopReading = () => {
  if (speechSynthesis.value && isReading.value) {
    speechSynthesis.value.cancel()
    isReading.value = false
    currentReadingMessage.value = null
    currentUtterance.value = null
  }
}
</script>

<style scoped>
.chat-messages {
  height: 100%;
  overflow-y: auto;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chat-messages::-webkit-scrollbar {
  display: none;
}

/* 欢迎页面样式 */
.welcome-container {
  padding: 32px calc((100% - 700px) / 2);
}

.welcome-space {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.welcome-card {
  background: #fff;
  border-radius: 12px;
}

.welcome-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.welcome-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  flex-shrink: 0;
}

.welcome-content {
  flex: 1;
}

.welcome-title {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

.welcome-description {
  margin: 0;
  color: #8c8c8c;
  font-size: 14px;
}

.welcome-actions {
  display: flex;
  gap: 8px;
}

/* 提示区域样式 - 按照官方设计 */
.prompts-flex {
  display: flex;
  gap: 16px;
}

.prompt-section {
  flex: 1;
  background: linear-gradient(123deg, #e5f4ff 0%, #efe7ff 100%);
  border-radius: 12px;
  padding: 16px;
}

.prompt-header {
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.prompt-label {
  font-weight: 600;
  color: #000000e0;
  font-size: 16px;
}

.refresh-button {
  color: #000000a6;
  padding: 4px;
  height: auto;
  width: auto;
  min-width: auto;
}

.refresh-button:hover {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.1);
}

.prompt-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #ffffffa6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.prompt-item:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}

.prompt-number {
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.prompt-icon {
  font-size: 16px;
  color: #000000a6;
  flex-shrink: 0;
}

.prompt-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prompt-title {
  font-weight: 500;
  color: #000000e0;
  font-size: 14px;
}

.prompt-description {
  color: #000000a6;
  font-size: 12px;
  line-height: 1.4;
}

/* 调试样式 */
.debug-item {
  background: #fff3cd !important;
  border: 1px solid #ffeaa7 !important;
}

.debug-item .prompt-description {
  color: #856404 !important;
  font-weight: 500 !important;
}

/* 弹窗样式 */
.about-content {
  padding: 16px 0;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.about-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
}

.about-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.about-header p {
  margin: 4px 0 0 0;
  color: #8c8c8c;
  font-size: 14px;
}

.about-description h4 {
  margin: 16px 0 8px 0;
  font-size: 16px;
  font-weight: 500;
}

.about-description ul {
  margin: 8px 0;
  padding-left: 20px;
}

.about-description li {
  margin: 8px 0;
  line-height: 1.5;
}

.help-content {
  padding: 8px 0;
}

.help-content p {
  margin: 8px 0;
  line-height: 1.6;
}

.help-content strong {
  color: #1677ff;
}

/* 深色模式适配 */
.dark .about-header h3 {
  color: #fff;
}

.dark .about-header p {
  color: #999;
}

.dark .about-description h4 {
  color: #fff;
}

.dark .help-content strong {
  color: #1677ff;
}
/* 消息列表样式 - 按照官方Bubble.List样式 */
.message-list {
  height: 100%;
}

.bubble-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 0;
}

.bubble-item {
  display: flex;
  width: 100%;
}

/* 用户消息样式 - 右对齐 */
.bubble-user {
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.user-content {
  background: #1677ff;
  color: #fff;
  padding: 8px 12px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.5;
  max-width: 70%;
  word-wrap: break-word;
}

.user-avatar {
  background: #1677ff;
  color: #fff;
  flex-shrink: 0;
}

/* AI消息样式 - 左对齐 */
.bubble-assistant {
  display: flex;
  justify-content: flex-start;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.ai-avatar {
  background: #f5f5f5;
  color: #666;
  flex-shrink: 0;
}

.ai-content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 70%;
}

.ai-content {
  background: #f5f5f5;
  color: #262626;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
}

.loading-message {
  background-image: linear-gradient(90deg, #ff6b23 0%, #af3cb8 31%, #53b6ff 89%);
  background-size: 100% 2px;
  background-repeat: no-repeat;
  background-position: bottom;
}

.typing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-text {
  font-size: 16px;
}

.message-text {
  margin: 0;
  line-height: 1.6;
}

/* Markdown 内容样式 */
.markdown-content {
  background: transparent !important;
}

.markdown-content :deep(.md-editor-preview) {
  background: transparent !important;
  color: inherit !important;
  padding: 0 !important;
}

.markdown-content :deep(.md-editor-preview-wrapper) {
  padding: 0 !important;
}

/* 代码块样式修复 */
.markdown-content :deep(.md-editor-preview pre) {
  background: rgba(0, 0, 0, 0.05) !important;
  border-radius: 6px !important;
  padding: 12px !important;
  margin: 8px 0 !important;
  overflow-x: auto !important;
  border: none !important;
}

.dark .markdown-content :deep(.md-editor-preview pre) {
  background: rgba(255, 255, 255, 0.05) !important;
}

.markdown-content :deep(.md-editor-preview code) {
  background: rgba(0, 0, 0, 0.1) !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  font-size: 0.9em !important;
  color: inherit !important;
}

.dark .markdown-content :deep(.md-editor-preview code) {
  background: rgba(255, 255, 255, 0.1) !important;
}

/* 修复代码块内的行号和语法高亮 */
.markdown-content :deep(.md-editor-preview pre code) {
  background: transparent !important;
  padding: 0 !important;
  color: inherit !important;
}

/* 确保弹窗层级正确 */
.markdown-content {
  position: relative;
  z-index: 1;
}

/* 重置可能过高的z-index */
.markdown-content :deep(.md-editor) {
  z-index: auto !important;
}

.markdown-content :deep(.md-editor-preview) {
  z-index: auto !important;
}

.markdown-content :deep(.md-editor-preview h1),
.markdown-content :deep(.md-editor-preview h2),
.markdown-content :deep(.md-editor-preview h3),
.markdown-content :deep(.md-editor-preview h4),
.markdown-content :deep(.md-editor-preview h5),
.markdown-content :deep(.md-editor-preview h6) {
  color: inherit !important;
  margin: 0.5em 0 !important;
}

.markdown-content :deep(.md-editor-preview p) {
  color: inherit !important;
  margin: 0.5em 0 !important;
  line-height: 1.6 !important;
}

.markdown-content :deep(.md-editor-preview code) {
  background: rgba(0, 0, 0, 0.1) !important;
  padding: 2px 4px !important;
  border-radius: 3px !important;
  font-size: 0.9em !important;
}

.dark .markdown-content :deep(.md-editor-preview code) {
  background: rgba(255, 255, 255, 0.1) !important;
}

.markdown-content :deep(.md-editor-preview pre) {
  background: rgba(0, 0, 0, 0.05) !important;
  border-radius: 6px !important;
  padding: 12px !important;
  margin: 8px 0 !important;
  overflow-x: auto !important;
}

.dark .markdown-content :deep(.md-editor-preview pre) {
  background: rgba(255, 255, 255, 0.05) !important;
}

.markdown-content :deep(.md-editor-preview blockquote) {
  border-left: 4px solid #1677ff !important;
  padding-left: 12px !important;
  margin: 8px 0 !important;
  color: inherit !important;
  background: rgba(22, 119, 255, 0.05) !important;
  border-radius: 0 4px 4px 0 !important;
}

.markdown-content :deep(.md-editor-preview ul),
.markdown-content :deep(.md-editor-preview ol) {
  padding-left: 20px !important;
  margin: 8px 0 !important;
}

.markdown-content :deep(.md-editor-preview li) {
  margin: 4px 0 !important;
  color: inherit !important;
}

.ai-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  align-items: center;
}

.ai-actions .ant-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 4px;
}

.bubble-assistant:hover .ai-actions {
  opacity: 1;
}

/* 深色模式 */
.dark .welcome-card {
  background: #141414;
}

.dark .welcome-title {
  color: #fff;
}

.dark .welcome-description {
  color: #8c8c8c;
}

.dark .prompt-section {
  background: linear-gradient(123deg, #111b26 0%, #1a1a2e 100%);
}

.dark .prompt-label {
  color: #fff;
}

.dark .refresh-button {
  color: #ffffff66;
}

.dark .refresh-button:hover {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.15);
}

.dark .prompt-item {
  background: rgba(255, 255, 255, 0.1);
}

.dark .prompt-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.dark .prompt-title {
  color: #fff;
}

.dark .ai-content {
  background: #1f1f1f;
  color: #fff;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .welcome-container {
    padding: 32px 16px;
  }
  
  .bubble-list {
    padding-inline: 16px !important;
  }
  
  .prompts-flex {
    flex-direction: column;
  }
  
  .user-content,
  .ai-content-wrapper {
    max-width: 85%;
  }
}
</style>