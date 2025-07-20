<template>
  <div class="antd-x-layout bg-background text-foreground">
    <!-- 侧边栏 -->
    <div class="antd-x-sider bg-muted border-r border-border" :class="{ open: showSidebar }">
      <!-- Logo -->
      <div class="antd-x-logo text-foreground">
        <img
          src="https://api.920pdd.com/img/222.png"
          draggable="false"
          alt="logo"
          width="24"
          height="24"
        />
        <span>MIANPROCHAT</span>
      </div>

      <!-- 新建对话按钮 -->
      <a-button
        type="default"
        class="antd-x-add-btn"
        @click="createNewChat"
      >
        <template #icon>
          <PlusOutlined />
        </template>
        新建对话
      </a-button>

      <!-- 对话列表 -->
      <div class="antd-x-conversations">
        <a-list
          :data-source="groupedChats"
          :split="false"
        >
          <template #renderItem="{ item }">
            <div v-if="item.isGroup" class="conversation-group">
              <div class="group-title text-muted-foreground">{{ item.title }}</div>
            </div>
            <a-list-item
              v-else
              class="conversation-item hover:bg-accent"
              :class="{ active: item.id === chatStore.currentChatId }"
              @click="selectChat(item.id)"
            >
              <a-list-item-meta>
                <template #title>
                  <div v-if="editingChatId === item.id" class="conversation-edit">
                    <a-input
                      v-model:value="editingTitle"
                      size="small"
                      @blur="handleEditComplete(item.id)"
                      @press-enter="handleEditComplete(item.id)"
                      @keydown.esc="cancelEdit"
                    />
                  </div>
                  <div v-else class="conversation-title">{{ item.title }}</div>
                </template>
                <template #description>
                  <div class="conversation-time text-muted-foreground">{{ formatTime(item.createdAt) }}</div>
                </template>
              </a-list-item-meta>
              <template #actions>
                <a-dropdown :trigger="['click']">
                  <a-button type="text" size="small">
                    <EllipsisOutlined />
                  </a-button>
                  <template #overlay>
                    <a-menu>
                      <a-menu-item key="rename" @click="startRename(item)">
                        <EditOutlined />
                        重命名
                      </a-menu-item>
                      <a-menu-item key="delete" danger @click="confirmDelete(item.id)">
                        <DeleteOutlined />
                        删除
                      </a-menu-item>
                    </a-menu>
                  </template>
                </a-dropdown>
              </template>
            </a-list-item>
          </template>
        </a-list>
      </div>

      <!-- 清空所有对话按钮 -->
      <div class="clear-all-section">
        <div class="clear-all-item" @click="confirmClearAll">
          <DeleteOutlined class="clear-all-icon" />
          <span class="clear-all-text">清空所有对话</span>
        </div>
      </div>

      <!-- 底部用户信息 -->
      <div class="antd-x-sider-footer border-t border-border">
        <a-avatar size="small" :src="'https://wiki.920pdd.com/uploads/avatars/2025/06/02/2/MOYiHBrMAuGiAHwc.png'">
          <template #icon>U</template>
        </a-avatar>
        <a-space>
          <!-- GitHub链接 -->
          <a-button 
            type="text" 
            size="small" 
            @click="openGitHub"
            title="查看源码"
          >
            <GithubOutlined />
          </a-button>
          <!-- 设置按钮 -->
          <a-button type="text" size="small" @click="showSettings = true">
            <SettingOutlined />
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="antd-x-chat bg-background">
      <!-- 消息列表 -->
      <div class="antd-x-chat-list bg-background">
        <AntdChatMessages
          :messages="chatStore.currentChat?.messages || []"
          :loading="isLoading"
          @send="handleSend"
          @regenerate="handleRegenerate"
          @copy="handleCopy"
          @like="handleLike"
          @dislike="handleDislike"
        />
      </div>

      <!-- 输入区域 -->
      <div class="antd-x-sender bg-background">
        <AntdChatInput
          :loading="isLoading"
          @send="handleSend"
          @cancel="handleCancel"
        />
      </div>
    </div>

    <!-- 移动端遮罩 -->
    <div
      v-if="showSidebar"
      class="mobile-overlay"
      @click="showSidebar = false"
    ></div>

    <!-- 设置弹窗 -->
    <a-modal
      v-model:open="showSettings"
      title="设置"
      width="800px"
      :footer="null"
    >
      <SettingsPanel />
    </a-modal>

    <!-- 删除确认弹窗 -->
    <a-modal
      v-model:open="showDeleteConfirm"
      title="确认删除"
      @ok="handleDelete"
      @cancel="showDeleteConfirm = false"
    >
      <p>确定要删除这个对话吗？此操作无法撤销。</p>
    </a-modal>

    <!-- 清空所有对话确认弹窗 -->
    <a-modal
      v-model:open="showClearAllConfirm"
      title="确认清空所有对话"
      @ok="handleClearAll"
      @cancel="showClearAllConfirm = false"
      ok-text="确认清空"
      cancel-text="取消"
      ok-type="danger"
    >
      <p>确定要清空所有对话吗？此操作将删除所有对话记录，无法撤销。</p>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { useChatStore } from '@/stores/chat'
import { createChatCompletion } from '@/utils/api'
import { 
  PlusOutlined,
  EllipsisOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  GithubOutlined
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

const chatStore = useChatStore()
const showSidebar = ref(false)
const isLoading = ref(false)
const showSettings = ref(false)
const showDeleteConfirm = ref(false)
const chatToDelete = ref<string | null>(null)
const editingChatId = ref<string | null>(null)
const editingTitle = ref('')
const showClearAllConfirm = ref(false)

// 检查URL参数配置
onMounted(() => {
  if (process.client) {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}')
    if (settings.apiEndpoint && settings.apiKey) {
      console.log('检测到API配置:', { 
        endpoint: settings.apiEndpoint,
        hasKey: !!settings.apiKey 
      })
    }
  }
})

// 分组对话列表
const groupedChats = computed(() => {
  const groups: any[] = []
  const today = dayjs()
  const yesterday = dayjs().subtract(1, 'day')
  
  const todayChats = chatStore.chats.filter(chat => 
    dayjs(chat.createdAt).isSame(today, 'day')
  )
  const yesterdayChats = chatStore.chats.filter(chat => 
    dayjs(chat.createdAt).isSame(yesterday, 'day')
  )
  const olderChats = chatStore.chats.filter(chat => 
    dayjs(chat.createdAt).isBefore(yesterday, 'day')
  )

  if (todayChats.length > 0) {
    groups.push({ isGroup: true, title: '今天' })
    groups.push(...todayChats)
  }
  
  if (yesterdayChats.length > 0) {
    groups.push({ isGroup: true, title: '昨天' })
    groups.push(...yesterdayChats)
  }
  
  if (olderChats.length > 0) {
    groups.push({ isGroup: true, title: '更早' })
    groups.push(...olderChats)
  }

  return groups
})

const formatTime = (date: Date) => {
  return dayjs(date).format('MM-DD HH:mm')
}

const createNewChat = () => {
  chatStore.createChat()
  showSidebar.value = false
}

const selectChat = (id: string) => {
  chatStore.selectChat(id)
  showSidebar.value = false
}

const confirmDelete = (id: string) => {
  chatToDelete.value = id
  showDeleteConfirm.value = true
}

const handleDelete = () => {
  if (chatToDelete.value) {
    chatStore.deleteChat(chatToDelete.value)
    message.success('对话已删除')
  }
  showDeleteConfirm.value = false
  chatToDelete.value = null
}

const startRename = (chat: any) => {
  editingChatId.value = chat.id
  editingTitle.value = chat.title
}

const handleEditComplete = (chatId: string) => {
  if (editingTitle.value.trim()) {
    chatStore.updateChatTitle(chatId, editingTitle.value.trim())
    message.success('重命名成功')
  }
  editingChatId.value = null
}

const cancelEdit = () => {
  editingChatId.value = null
}

const handleSend = async (message: string) => {
  if (!message.trim() || isLoading.value) return
  
  isLoading.value = true
  
  // 添加用户消息
  chatStore.addMessage({
    role: 'user',
    content: message
  })
  
  try {
    const currentChat = chatStore.currentChat
    if (!currentChat) return
    
    // 构建消息历史
    const messages = currentChat.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
    
    let response = ''
    let isFirstChunk = true
    
    // 流式响应
    for await (const chunk of createChatCompletion({
      model: currentChat.settings?.model || 'gpt-3.5-turbo',
      messages: [
        ...messages,
        { role: 'user', content: message }
      ],
      temperature: currentChat.settings?.temperature || 0.7,
      stream: true
    })) {
      if (chunk === '[DONE]') break
      
      // 第一个chunk时添加助手消息
      if (isFirstChunk) {
        chatStore.addMessage({
          role: 'assistant',
          content: chunk
        })
        response = chunk
        isFirstChunk = false
      } else {
        response += chunk
        chatStore.updateLastMessage(response)
      }
    }
    
    // 自动生成标题
    if (currentChat.messages.length <= 2 && currentChat.title === '新对话') {
      const title = message.slice(0, 20) + (message.length > 20 ? '...' : '')
      chatStore.updateChatTitle(currentChat.id, title)
    }
    
  } finally {
    isLoading.value = false
  }
}

const handleCancel = () => {
  isLoading.value = false
}

const handleRegenerate = (messageId: string) => {
  const currentChat = chatStore.currentChat
  if (!currentChat) return
  
  // 找到要重新生成的消息
  const messageIndex = currentChat.messages.findIndex(
    msg => msg.timestamp.getTime().toString() === messageId
  )
  
  if (messageIndex > 0) {
    // 获取上一条用户消息
    const userMessage = currentChat.messages[messageIndex - 1]
    if (userMessage.role === 'user') {
      // 删除当前助手消息
      currentChat.messages.splice(messageIndex, 1)
      chatStore.saveChats()
      
      // 重新发送
      handleSend(userMessage.content)
    }
  }
}

const handleCopy = (content: string) => {
  navigator.clipboard.writeText(content).then(() => {
    message.success('已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败')
  })
}

const handleLike = (messageId: string) => {
  message.success('感谢您的反馈')
}

const handleDislike = (messageId: string) => {
  message.info('我们会继续改进')
}

const confirmClearAll = () => {
  showClearAllConfirm.value = true
}

const handleClearAll = () => {
  // 清空所有对话
  chatStore.chats = []
  chatStore.currentChatId = null
  chatStore.saveChats()
  
  // 创建一个新对话
  chatStore.createChat()
  
  message.success('所有对话已清空')
  showClearAllConfirm.value = false
}

const openGitHub = () => {
  window.open('https://github.com/kilimro/nuxt3-chatgpt-web', '_blank')
}

onMounted(() => {
  chatStore.init()
})
</script>

<style scoped>
.conversation-group {
  padding: 8px 16px;
}

.group-title {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: 500;
}

.conversation-item {
  padding: 8px 16px;
  cursor: pointer;
  border-radius: 8px;
  margin: 2px 0;
  transition: all 0.2s;
}

.conversation-item:hover {
  background-color: #f5f5f5;
}

.conversation-item.active {
  background-color: #e6f7ff;
  border-left: 3px solid #1677ff;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-edit {
  width: 100%;
}

.conversation-time {
  font-size: 12px;
  color: #8c8c8c;
}

.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

.clear-all-section {
  padding: 8px 16px;
  margin-top: auto;
}

.clear-all-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #ff4d4f;
  font-size: 14px;
}

.clear-all-item:hover {
  background-color: rgba(255, 77, 79, 0.1);
}

.clear-all-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.clear-all-text {
  font-weight: 500;
}

@media (max-width: 768px) {
  .mobile-overlay {
    display: block;
  }
}

/* 深色模式 */
.dark .clear-all-item {
  color: #ff7875;
}

.dark .clear-all-item:hover {
  background-color: rgba(255, 120, 117, 0.15);
}
</style>