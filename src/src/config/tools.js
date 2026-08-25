/**
 * 动态工具配置文件
 * 所有工具卡片在此集中管理
 * status: 'online' | 'coming_soon'
 * icon: Tabler Icons 组件名（kebab-case）
 */
export const tools = [
  {
    id: 'realtime-clipboard',
    title: '网页极速剪贴板',
    desc: '免登录房间式剪贴板，支持文本、图片和文件跨端实时同步',
    category: '协作同步',
    icon: 'IconClipboardText',
    route: '/clipboard',
    status: 'online',
    isNew: true,
    keywords: ['剪贴板', '同步', '二维码', '图片', '文件', 'Socket.io'],
  },
  {
    id: 'media-downloader',
    title: '社交平台无水印解析',
    desc: '支持小红书、微博链接识别，提取无水印原图/视频与文案',
    category: '媒体/去水印',
    icon: 'IconDownload',
    route: '/tools/media-downloader',
    status: 'online',
    keywords: ['无水印', '小红书', '微博', '解析', '下载', '视频'],
  },
  {
    id: 'photo-bg-changer',
    title: '证件照一键换底',
    desc: 'AI 智能抠图 + 常用证件底色，快速生成标准证件照',
    category: '媒体/去水印',
    icon: 'IconCamera',
    route: '/tools/photo-bg-changer',
    status: 'online',
    keywords: ['证件照', '换底', '抠图', '背景', '照片', 'AI'],
  },
  {
    id: 'cidr-calculator',
    title: 'CIDR 子网划分校验器',
    desc: '纯前端 IPv4 子网划分、重叠检测、可视化区间与 ACL 导出',
    category: '实用计算',
    icon: 'IconNetwork',
    route: '/tools/cidr-calculator',
    status: 'online',
    isNew: true,
    keywords: ['CIDR', '子网划分', 'IP', '重叠检测', 'ACL', '网络'],
  },
  {
    id: 'text-formatter',
    title: '文本格式化工具',
    desc: 'JSON格式化、Base64编解码、正则测试、Markdown预览等文本处理利器',
    category: '文本处理',
    icon: 'IconFileText',
    route: '/tools/coming-soon',
    status: 'coming_soon',
    keywords: ['JSON', '格式化', 'Base64', '正则', 'Markdown'],
  },
  {
    id: 'image-compress',
    title: '图片压缩转换',
    desc: '在线图片批量压缩、格式转换(PNG/JPEG/WebP)、尺寸调整',
    category: '媒体/去水印',
    icon: 'IconPhoto',
    route: '/tools/coming-soon',
    status: 'coming_soon',
    keywords: ['图片压缩', '格式转换', 'WebP', 'PNG', 'JPEG'],
  },
  {
    id: 'color-palette',
    title: '调色板生成器',
    desc: '智能配色方案生成、渐变色预览、Tailwind CSS色板一键复制',
    category: '实用计算',
    icon: 'IconPalette',
    route: '/tools/coming-soon',
    status: 'coming_soon',
    keywords: ['配色', '调色板', '渐变色', 'Tailwind', '颜色'],
  },
  {
    id: 'unit-converter',
    title: '全能单位换算',
    desc: '长度、重量、温度、存储容量、汇率等多种单位在线换算',
    category: '实用计算',
    icon: 'IconArrowsExchange',
    route: '/tools/coming-soon',
    status: 'coming_soon',
    keywords: ['换算', '单位', '汇率', '长度', '重量'],
  },
];

/**
 * 工具分类（用于首页导航）
 */
export const categories = [
  { id: 'all',       label: '全部' },
  { id: '协作同步',   label: '协作同步' },
  { id: '媒体/去水印', label: '媒体/去水印' },
  { id: '文本处理',   label: '文本处理' },
  { id: '实用计算',   label: '实用计算' },
];

/**
 * 按分类过滤工具
 */
export function getToolsByCategory(category) {
  if (!category || category === 'all') return tools;
  return tools.filter(t => t.category === category);
}

/**
 * 根据 id 获取工具详情
 */
export function getToolById(id) {
  return tools.find(t => t.id === id);
}

