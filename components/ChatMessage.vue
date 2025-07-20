<template>
  <div :class="[
    'flex gap-3 md:p-4 p-3 rounded-lg relative group',
    message.role === 'assistant' ? 'bg-muted/100' : 'bg-background',
    message.error ? 'border-red-200 bg-red-50 dark:bg-red-950/50' : ''
  ]">
    <div class="md:w-8 w-7 md:h-8 h-7 rounded-full mt-4 flex items-center justify-center text-primary-foreground text-sm md:text-base">
      <img 
        v-if="message.role === 'assistant'" 
        :src="'https://api.920pdd.com/img/1f60b.webp'"
        alt="AI Avatar"
        class="w-8 h-8 rounded-full object-cover"
      />
      <img 
        v-else 
        :src="'https://wiki.920pdd.com/uploads/avatars/2025/06/02/2/MOYiHBrMAuGiAHwc.png'"
        alt="User Avatar"
        class="w-8 h-8 rounded-full object-cover"
      />
    </div>
    <div class="flex-1 space-y-2 w-2 overflow-auto">
      <div :class="[
        'prose prose-neutral dark:prose-invert max-w-none md:prose-base prose-sm',
        message.error ? 'text-red-600 dark:text-red-400' : ''
      ]">
        <MdPreview :modelValue="messageContent" :codeFoldable="false" />
      </div>
      <div class="text-[10px] md:text-xs text-muted-foreground">
        {{ formattedTime }}
      </div>
    </div>
    
    <Button
      variant="ghost"
      size="icon"
      class="absolute right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
      @click.stop="copyContent"
    >
      <Copy v-if="!copied" class="h-4 w-4 text-muted-foreground hover:text-primary" />
      <Check v-else class="h-4 w-4 text-green-500" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
      @click.stop="confirmDelete"
    >
      <Trash2 class="h-4 w-4 text-muted-foreground hover:text-destructive" />
    </Button>

    <AlertDialog v-model:open="showDeleteDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除消息</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将永久删除该消息，无法恢复。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteDialog = false">取消</AlertDialogCancel>
          <AlertDialogAction @click="handleDelete">删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { MdPreview } from "md-editor-v3"
import "md-editor-v3/lib/style.css"
import { Trash2, Copy, Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useChatStore } from '@/stores/chat'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp: Date
  error?: boolean
}

const props = defineProps<{
  message: Message
}>()

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 使用计算属性优化渲染
const formattedTime = computed(() => {
  return formatTime(props.message.timestamp)
})

const messageContent = computed(() => {
  return props.message.content
})

const chatStore = useChatStore()
const showDeleteDialog = ref(false)

const emit = defineEmits<{
  delete: [timestamp: Date]
}>()

const confirmDelete = () => {
  showDeleteDialog.value = true
}

const handleDelete = () => {
  // 获取当前对话
  const currentChat = chatStore.currentChat
  if (!currentChat) return

  // 从当前对话中删除消息
  currentChat.messages = currentChat.messages.filter(
    msg => msg.timestamp.getTime() !== props.message.timestamp.getTime()
  )

  // 保存到 localStorage
  const chats = JSON.parse(localStorage.getItem('chats') || '[]')
  const chatIndex = chats.findIndex((chat: any) => chat.id === currentChat.id)
  
  if (chatIndex !== -1) {
    chats[chatIndex] = {
      ...currentChat,
      messages: currentChat.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toISOString() // 转换日期为字符串
      }))
    }
    localStorage.setItem('chats', JSON.stringify(chats))
  }

  showDeleteDialog.value = false
}

const copied = ref(false)

const copyContent = async () => {
  const input = document.createElement('input')
  input.value = props.message.content
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
  copied.value = true
}
</script> 