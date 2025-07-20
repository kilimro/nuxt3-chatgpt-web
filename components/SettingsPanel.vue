<template>
  <div class="settings-panel bg-background text-foreground">
    <a-tabs v-model:activeKey="activeTab" type="card">
      <!-- 通用设置 -->
      <a-tab-pane key="general" tab="通用设置">
        <a-space direction="vertical" size="large" style="width: 100%">
          <!-- 主题设置 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">主题设置</h3>
            <a-radio-group v-model:value="settings.theme" @change="handleThemeChange">
              <a-radio value="light">浅色主题</a-radio>
              <a-radio value="dark">深色主题</a-radio>
              <a-radio value="system">跟随系统</a-radio>
            </a-radio-group>
          </div>

          <!-- 语言设置 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">语言设置</h3>
            <a-select v-model:value="settings.language" style="width: 200px">
              <a-select-option value="zh-CN">简体中文</a-select-option>
              <a-select-option value="en-US">English</a-select-option>
            </a-select>
          </div>

          <!-- 历史记录 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">历史记录</h3>
            <a-space direction="vertical">
              <a-switch 
                v-model:checked="settings.saveHistory" 
                checked-children="开启" 
                un-checked-children="关闭"
              />
              <span class="setting-desc">保存对话历史记录</span>
              <a-button danger @click="clearAllHistory">清空所有历史记录</a-button>
            </a-space>
          </div>
        </a-space>
      </a-tab-pane>

      <!-- 模型设置 -->
      <a-tab-pane key="model" tab="模型设置">
        <a-space direction="vertical" size="large" style="width: 100%">
          <!-- 默认模型 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">默认模型</h3>
            <a-select v-model:value="settings.defaultModel" style="width: 300px">
              <a-select-option value="gpt-3.5-turbo">GPT-3.5 Turbo</a-select-option>
              <a-select-option value="gpt-4">GPT-4</a-select-option>
              <a-select-option value="gpt-4-turbo">GPT-4 Turbo</a-select-option>
              <a-select-option 
                v-for="model in settings.customModels" 
                :key="model.id"
                :value="model.id"
              >
                {{ model.name }}
              </a-select-option>
            </a-select>
          </div>

          <!-- 自定义模型 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">自定义模型</h3>
            <div class="space-y-3">
              <div 
                v-for="(model, index) in settings.customModels" 
                :key="index"
                class="flex gap-2 items-center p-3 border rounded-lg"
              >
                <a-input 
                  v-model:value="model.name" 
                  placeholder="模型名称"
                  style="flex: 1"
                />
                <a-input 
                  v-model:value="model.id" 
                  placeholder="模型ID"
                  style="flex: 1"
                />
                <a-input 
                  v-model:value="model.baseUrl" 
                  placeholder="API地址(可选)"
                  style="flex: 1"
                />
                <a-input-password 
                  v-model:value="model.apiKey" 
                  placeholder="API密钥(可选)"
                  style="flex: 1"
                />
                <a-button 
                  type="text" 
                  danger 
                  @click="removeCustomModel(index)"
                  :icon="h(DeleteOutlined)"
                />
              </div>
              <a-button 
                type="dashed" 
                @click="addCustomModel"
                style="width: 100%"
                :icon="h(PlusOutlined)"
              >
                添加自定义模型
              </a-button>
            </div>
          </div>

          <!-- 温度设置 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">创造性 (Temperature)</h3>
            <a-slider 
              v-model:value="settings.temperature" 
              :min="0" 
              :max="2" 
              :step="0.1"
              :marks="{ 0: '保守', 1: '平衡', 2: '创新' }"
            />
            <span class="setting-desc text-muted-foreground">当前值: {{ settings.temperature }}</span>
          </div>

          <!-- 上下文长度 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">上下文消息数量</h3>
            <a-input-number 
              v-model:value="settings.contextCount" 
              :min="1" 
              :max="20"
              style="width: 120px"
            />
            <span class="setting-desc text-muted-foreground">每次对话携带的历史消息组数</span>
          </div>

          <!-- 系统提示词 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">系统提示词</h3>
            <a-textarea 
              v-model:value="settings.systemPrompt"
              :rows="4"
              placeholder="输入系统提示词，定义AI的角色和行为..."
            />
            <span class="setting-desc text-muted-foreground">
              系统提示词会在每次对话开始时发送给AI，用于定义AI的角色、行为和回答风格
            </span>
          </div>
        </a-space>
      </a-tab-pane>

      <!-- API设置 -->
      <a-tab-pane key="api" tab="API设置">
        <a-space direction="vertical" size="large" style="width: 100%">
          <!-- API地址 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">API 地址</h3>
            <a-input 
              v-model:value="settings.apiEndpoint"
              placeholder="https://api.openai.com"
              style="width: 400px"
            />
            <div class="setting-desc text-muted-foreground">
              OpenAI兼容的API地址，如果使用其他服务商请修改此地址
            </div>
          </div>

          <!-- API密钥 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">API 密钥</h3>
            <a-input-password 
              v-model:value="settings.apiKey"
              placeholder="sk-..."
              style="width: 400px"
            />
            <span class="setting-desc text-muted-foreground">您的API密钥将安全存储在本地</span>
          </div>

          <!-- 连接测试 -->
          <div class="setting-item bg-background">
            <h3 class="text-foreground">连接测试</h3>
            <a-button @click="testConnection" :loading="testing">
              测试连接
            </a-button>
            <div v-if="testResult" class="mt-2">
              <a-alert 
                :type="testResult.success ? 'success' : 'error'"
                :message="testResult.message"
                show-icon
              />
            </div>
          </div>
        </a-space>
      </a-tab-pane>

      <!-- 关于 -->
      <a-tab-pane key="about" tab="关于">
        <a-space direction="vertical" size="large" style="width: 100%">
          <div class="about-section bg-background text-foreground">
            <h2 class="text-foreground">MIANPROAI-Web</h2>
            <p class="text-foreground">版本: 1.0.0</p>
            <p class="text-foreground">基于 Nuxt3 + Vue3 + Ant Design Vue 构建的现代化 AI 对话应用</p>
          </div>

          <a-divider />

          <div class="about-section bg-background text-foreground">
            <h3 class="text-foreground">功能特性</h3>
            <ul>
              <li class="text-foreground">🎨 现代化的 Ant Design X 界面设计</li>
              <li class="text-foreground">🌙 支持深浅色主题切换</li>
              <li class="text-foreground">💬 流式对话体验</li>
              <li class="text-foreground">📱 响应式设计，支持移动端</li>
              <li class="text-foreground">🔧 丰富的配置选项</li>
            </ul>
          </div>

          <a-divider />

          <div class="about-section bg-background text-foreground">
            <h3 class="text-foreground">开源信息</h3>
            <p class="text-foreground">
              项目地址: 
              <a href="https://github.com/kilimro/chat-web" target="_blank">
                GitHub
              </a>
            </p>
            <p class="text-foreground">许可证: MIT License</p>
          </div>
        </a-space>
      </a-tab-pane>
    </a-tabs>

    <!-- 底部操作按钮 -->
    <div class="settings-footer">
      <a-space>
        <a-button @click="resetSettings" :loading="resetting">
          重置设置
        </a-button>
        <a-button 
          type="primary" 
          @click="saveSettings" 
          :loading="saving"
          :disabled="!hasChanges"
        >
          保存设置
        </a-button>
      </a-space>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { h } from 'vue'
import { useModelStore } from '@/stores/model'

const colorMode = useColorMode()
const chatStore = useChatStore()
const modelStore = useModelStore()

const activeTab = ref('general')
const testing = ref(false)
const saving = ref(false)
const resetting = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

// 默认设置
const defaultSettings = {
  theme: 'system',
  language: 'zh-CN',
  saveHistory: true,
  defaultModel: 'gpt-3.5-turbo',
  temperature: 0.7,
  contextCount: 5,
  systemPrompt: '',
  apiEndpoint: 'https://api.openai.com',
  apiKey: '',
  customModels: []
}

// 当前设置
const settings = reactive({ ...defaultSettings })

// 原始设置（用于比较是否有变化）
const originalSettings = ref({ ...defaultSettings })

// 检查是否有变化
const hasChanges = computed(() => {
  return JSON.stringify(settings) !== JSON.stringify(originalSettings.value)
})

// 加载设置
const loadSettings = () => {
  if (process.client) {
    const saved = localStorage.getItem('settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        Object.assign(settings, { ...defaultSettings, ...parsed })
        originalSettings.value = JSON.parse(JSON.stringify(settings))
        
        // 同步主题设置到colorMode
        if (parsed.theme) {
          colorMode.preference = parsed.theme
        }
      } catch (e) {
        console.error('Failed to load settings:', e)
        message.error('设置加载失败，使用默认设置')
      }
    }
    
    // 确保settings中的theme与colorMode同步
    settings.theme = colorMode.preference
    originalSettings.value.theme = colorMode.preference
  }
}

// 保存设置
const saveSettings = async () => {
  if (!hasChanges.value) {
    message.info('没有需要保存的更改')
    return
  }

  saving.value = true
  
  try {
    // 验证设置
    if (!settings.apiKey.trim()) {
      message.warning('请填写API密钥')
      saving.value = false
      return
    }

    if (!settings.apiEndpoint.trim()) {
      message.warning('请填写API地址')
      saving.value = false
      return
    }

    // 验证自定义模型
    for (const model of settings.customModels) {
      if (!model.name.trim() || !model.id.trim()) {
        message.warning('自定义模型的名称和ID不能为空')
        saving.value = false
        return
      }
    }

    // 保存到localStorage
    localStorage.setItem('settings', JSON.stringify(settings))
    
    // 添加调试日志
    console.log('=== 保存设置调试 ===')
    console.log('保存的设置:', settings)
    console.log('系统提示词:', settings.systemPrompt)
    console.log('================')
    
    // 更新原始设置
    originalSettings.value = JSON.parse(JSON.stringify(settings))
    
    // 重新加载模型store中的自定义模型
    modelStore.loadCustomModels()
    
    // 应用主题设置
    colorMode.preference = settings.theme
    
    message.success('设置保存成功')
  } catch (error) {
    console.error('保存设置失败:', error)
    message.error('设置保存失败')
  } finally {
    saving.value = false
  }
}

// 重置设置
const resetSettings = async () => {
  resetting.value = true
  
  try {
    Object.assign(settings, defaultSettings)
    localStorage.removeItem('settings')
    originalSettings.value = JSON.parse(JSON.stringify(defaultSettings))
    
    // 重置主题
    colorMode.preference = 'system'
    
    // 重新加载模型
    modelStore.loadCustomModels()
    
    message.success('设置已重置')
  } catch (error) {
    console.error('重置设置失败:', error)
    message.error('重置设置失败')
  } finally {
    resetting.value = false
  }
}

// 主题变化处理
const handleThemeChange = (e: any) => {
  settings.theme = e.target.value
  colorMode.preference = e.target.value
}

// 清空历史记录
const clearAllHistory = () => {
  chatStore.chats = []
  chatStore.currentChatId = null
  chatStore.saveChats()
  message.success('历史记录已清空')
}

// 测试连接
const testConnection = async () => {
  if (!settings.apiKey.trim()) {
    message.warning('请先填写API密钥')
    return
  }

  if (!settings.apiEndpoint.trim()) {
    message.warning('请先填写API地址')
    return
  }

  testing.value = true
  testResult.value = null
  
  try {
    const response = await fetch(`${settings.apiEndpoint}/v1/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // 10秒超时
    })

    if (response.ok) {
      const data = await response.json()
      testResult.value = {
        success: true,
        message: `连接成功！找到 ${data.data?.length || 0} 个可用模型`
      }
    } else {
      const error = await response.json()
      testResult.value = {
        success: false,
        message: `连接失败：${error.error?.message || response.statusText}`
      }
    }
  } catch (error: any) {
    testResult.value = {
      success: false,
      message: `连接失败：${error.message || '网络错误'}`
    }
  } finally {
    testing.value = false
  }
}

// 添加自定义模型
const addCustomModel = () => {
  settings.customModels.push({
    name: '',
    id: '',
    baseUrl: '',
    apiKey: ''
  })
}

// 删除自定义模型
const removeCustomModel = (index: number) => {
  const removedModel = settings.customModels[index]
  settings.customModels.splice(index, 1)
  
  // 如果删除的是当前选中的模型，重置为默认模型
  if (settings.defaultModel === removedModel.id) {
    settings.defaultModel = 'gpt-3.5-turbo'
  }
}

// 监听colorMode变化，同步到settings
watch(() => colorMode.preference, (newTheme) => {
  if (settings.theme !== newTheme) {
    settings.theme = newTheme
  }
})

// 组件挂载时加载设置
onMounted(() => {
  loadSettings()
})

// 页面离开前提醒保存
onBeforeUnmount(() => {
  if (hasChanges.value) {
    // 这里可以添加确认对话框
    console.warn('有未保存的设置更改')
  }
})
</script>

<style scoped>
.settings-panel {
  min-height: 500px;
  position: relative;
  padding-bottom: 80px; /* 为底部按钮留出空间 */
}

.setting-item {
  margin-bottom: 24px;
}

.setting-item h3 {
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.setting-desc {
  font-size: 12px;
  color: #8c8c8c;
  margin-left: 8px;
  margin-top: 8px;
  display: block;
}

.about-section h2 {
  color: #1677ff;
  margin-bottom: 16px;
}

.about-section h3 {
  margin-bottom: 12px;
  color: #262626;
}

.about-section ul {
  padding-left: 20px;
}

.about-section li {
  margin-bottom: 8px;
  line-height: 1.6;
}

.settings-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 24px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
  text-align: right;
}

.dark .settings-footer {
  background: #1a1a1a;
  border-top-color: #2a2a2a;
}

.space-y-3 > * + * {
  margin-top: 12px;
}

/* 深色模式适配 */
.dark .setting-item h3 {
  color: #ffffff;
}

.dark .setting-desc {
  color: #999999;
}

.dark .about-section h3 {
  color: #ffffff;
}

.dark .about-section p,
.dark .about-section li {
  color: #ffffff;
}
</style>