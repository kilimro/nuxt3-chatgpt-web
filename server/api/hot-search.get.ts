export default defineEventHandler(async (event) => {
  console.log('=== 热搜API被调用 ===')
  
  try {
    const url = 'https://api.920pdd.com/API/60s/xw.php?type=json'
    
    console.log('请求URL:', url)
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      signal: AbortSignal.timeout(15000) // 15秒超时
    })
    
    console.log('API响应状态:', response.status)
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('获取到数据条数:', data.length)
    
    // 验证数据格式
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('API返回数据格式错误或为空')
    }
    
    // 验证数据结构
    if (!data[0].rank || !data[0].word) {
      throw new Error('API返回数据结构不正确')
    }
    
    // 转换为前端需要的格式，取前6条
    const hotSearchList = data.slice(0, 6).map((item: any) => ({
      key: `hot-${item.rank}`,
      number: item.rank.toString(),
      description: item.word,
      color: getNumberColor(item.rank)
    }))
    
    console.log('转换后的数据:', hotSearchList.map(item => item.description))
    
    return {
      success: true,
      data: hotSearchList
    }
    
  } catch (error) {
    console.error('=== 热搜API错误 ===')
    console.error('错误类型:', error.name)
    console.error('错误消息:', error.message)
    
    // 返回备用数据
    const fallbackData = [
      {
        key: 'hot-1',
        description: '中国女篮不敌日本 无缘亚洲杯决赛',
        number: '1',
        color: '#f93a4a'
      },
      {
        key: 'hot-2',
        description: '12306回应高铁不要食用方便面提醒',
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
        description: '偷渡出境男子：被打七八百棍血流三碗',
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
    
    console.log('使用备用数据')
    
    return {
      success: false,
      data: fallbackData,
      error: error.message
    }
  }
})

// 根据排名返回对应颜色
function getNumberColor(rank: number): string {
  switch (rank) {
    case 1: return '#f93a4a'
    case 2: return '#ff6565'
    case 3: return '#ff8f1f'
    case 4: return '#ffa940'
    case 5: return '#faad14'
    case 6: return '#00000040'
    default: return '#00000040'
  }
}