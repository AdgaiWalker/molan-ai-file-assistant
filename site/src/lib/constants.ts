/**
 * 墨览官网落地页 — 文案、下载链接、产品能力等单一来源。
 * 文案口吻：专业冷静。所有用户可见字符串集中在此，不散落在 JSX（遵循 AGENTS.md §分离原则 #3）。
 */

import { PUBLIC_IDENTITY } from './publicIdentity.generated';
import { RELEASE_CHANNELS } from './releaseChannels.generated';

export const BRAND = {
  name: '墨览',
  slug: 'molan',
  tagline: '让 AI 能读你的文件',
  github: 'https://github.com/AdgaiWalker/molan-ai-file-assistant',
  description:
    '墨览把微信、QQ、GitHub、电脑里散落的 .md / .json / Office 文件，整成 AI 能读的格式。手机阅读，电脑转换，云端汇聚。',
} as const;

export const DOC_LINKS = {
  repo: BRAND.github,
  readme: `${BRAND.github}/blob/main/README.md`,
  cli: `${BRAND.github}/tree/main/desktop/cli`,
  privacy: '#/privacy',
  terms: '#/terms',
  deletion: '#/deletion',
  support: '#/support',
  license: `${BRAND.github}/blob/main/LICENSE`,
  todo: `${BRAND.github}/blob/main/TODO.md`,
  evidence: `${BRAND.github}/tree/main/desktop/cli/test-fixtures`,
} as const;

export const PUBLIC_DOC_PAGES = {
  privacy: {
    title: '隐私说明',
    intro: '墨览默认按“本地优先、显式授权、分层可撤回”工作。临时打开不等于上传，AI 读取也不是默认开启。',
    badge: PUBLIC_IDENTITY.statusLabel,
    summary: [
      '不登录也能阅读本地文件；临时打开不会自动上传。',
      '“收集到墨览”“同步到电脑 / 云端”“允许 AI 读取”是三个分开的动作。',
      '日志只记录请求、状态、错误码和耗时，不记录文件正文、提示词正文或密钥原文。',
    ],
    sections: [
      {
        heading: '当前仍待补的正式信息',
        bullets: [
          `主体名称：${PUBLIC_IDENTITY.legalEntityName}`,
          `支持邮箱：${PUBLIC_IDENTITY.supportEmail}`,
          `官方域名：${PUBLIC_IDENTITY.officialDomain}`,
        ],
      },
      {
        heading: '默认数据边界',
        bullets: [
          '本地打开、阅读、复制、编辑、分享优先在当前设备完成。',
          '只有你明确同步的文件、副本、派生 Markdown 或 AI 结果才会进入云端链路。',
          'AI 读取权限独立于同步权限，可以单独授权、单独撤回。',
        ],
      },
      {
        heading: '删除与撤回',
        bullets: [
          '支持区分删除当前设备副本、删除云端副本、向所有设备同步删除、撤回 AI 读取和注销账号。',
          '正式删除入口与导出入口仍待在账号与域名确定后补齐。',
        ],
      },
    ],
  },
  terms: {
    title: '服务条款',
    intro: '墨览提供文件阅读、转换、同步、AI 授权读取与结果回流能力，但 AI 输出仍需要你自行审核，不会静默覆盖原文件。',
    badge: PUBLIC_IDENTITY.statusLabel,
    summary: [
      '你需要确保自己有权处理、同步、分享或授权 AI 读取相关文件。',
      'AI 输出不保证绝对正确，重要文件仍应保留原件与备份。',
      '平台、渠道、同步和公开发布范围会随着验收进度继续调整。',
    ],
    sections: [
      {
        heading: '当前仍待补的正式信息',
        bullets: [`主体名称：${PUBLIC_IDENTITY.legalEntityName}`, `支持邮箱：${PUBLIC_IDENTITY.supportEmail}`],
      },
      {
        heading: '使用边界',
        bullets: [
          '墨览帮助你把文件整理成 AI 更易读取的格式，但不替代你对文件内容和 AI 结果的最终判断。',
          '如果某个平台仍标记为“准备中”，表示它还不是正式对外承诺的发布结果。',
        ],
      },
    ],
  },
  deletion: {
    title: '删除与注销说明',
    intro: '墨览会区分“删本机”“删云端”“删全部设备”“撤回 AI 权限”“撤销设备”“注销账号”几类动作，避免用户以为所有删除都是一回事。',
    badge: PUBLIC_IDENTITY.statusLabel,
    summary: [
      '删本机：只删当前设备副本，不影响其他设备和云端。',
      '删云端：清理云端副本，其他设备本地已存在的文件会按各自状态保留。',
      '删全部设备 / 注销账号：会进入更大范围的数据清理流程，需要明确提示影响范围。',
    ],
    sections: [
      {
        heading: '当前仍待补的正式信息',
        bullets: [
          `支持邮箱：${PUBLIC_IDENTITY.supportEmail}`,
          `正式删除入口 URL：${PUBLIC_IDENTITY.accountDeletionUrl}`,
        ],
      },
      {
        heading: '发布前仍需补齐',
        bullets: [
          '应用内“删除账号 / 删除数据 / 撤回设备”入口截图。',
          '商店审核所需的删除流程文本与演示账号。',
        ],
      },
    ],
  },
  support: {
    title: '支持与反馈',
    intro: '如果遇到文件打不开、同步不到电脑、AI 无法读取、结果回流异常、安装升级失败等问题，可以按统一模板反馈。',
    badge: PUBLIC_IDENTITY.statusLabel,
    summary: [
      `支持邮箱：${PUBLIC_IDENTITY.supportEmail}`,
      `官方域名：${PUBLIC_IDENTITY.officialDomain}`,
      '仓库入口：GitHub 已公开，可用于查看源码、契约和当前进度。',
    ],
    sections: [
      {
        heading: '反馈时请尽量附带',
        bullets: [
          '平台与设备、系统版本、墨览版本、来源 App',
          '文件格式和大小、操作步骤、预期结果、实际结果',
          '截图或录屏，以及可安全共享的最小复现对象',
        ],
      },
      {
        heading: '不要直接发送',
        bullets: [
          '完整账号密码、API Key、Token、Secret、私钥',
          '不适合外发的完整文件正文',
        ],
      },
    ],
  },
} as const;

/** Hero 区文案 —— antfu 风格：一段话，无标题/副标题分层 */
export const HERO = {
  /** 主段落（左对齐，整句入场）。简洁、口语、不堆术语 */
  lead: '墨览把微信、QQ、电脑里散落的文件，整成 AI 能读的格式。',
  ctaPrimary: '加入候补',
  ctaSecondary: 'GitHub',
} as const;

/** 文件汇聚叙事 — 散落来源（区块2 左侧） */
export const FILE_SOURCES = [
  { id: 'wechat', label: '微信', color: '#07c160', file: '会议纪要.md' },
  { id: 'qq', label: 'QQ', color: '#12b7f5', file: 'api-response.json' },
  { id: 'github', label: 'GitHub', color: '#24292e', file: 'README.md' },
  { id: 'desktop', label: '电脑', color: '#5f6368', file: '季度报告.docx' },
] as const;

/** 三端（区块3） */
export const PLATFORMS = [
  {
    id: 'mobile',
    name: '手机阅读器',
    role: '收集端',
    desc: '微信 / QQ / 文件管理器里的 .md / .json 一键打开阅读、复制、轻编辑、转 PDF 分享。',
    points: ['一键打开', '提示词快贴', '转 PDF / Word'],
  },
  {
    id: 'desktop',
    name: '桌面转换工具',
    role: '标准化端',
    desc: 'Word / PDF / PPT / Excel 批量转 Markdown，置顶快贴窗随用随贴，给 AI / Agent 调用。',
    points: ['批量转换', '置顶快贴窗', 'Office → Markdown'],
  },
  {
    id: 'cli',
    name: 'CLI · molan',
    role: 'AI 调用端',
    desc: '一行命令把 Office 文件转成 AI 可读的 Markdown，结构化 JSON 输出，供 AI / Agent / 脚本调用。',
    points: ['molan convert', '--json 输出', 'Agent 友好'],
  },
] as const;

/** 文件流转（区块4）—— 3 步：收到 → 墨览处理 → AI 读取 */
export const FLOW_STEPS = [
  {
    id: 1,
    label: '收到文件',
    detail: '微信、QQ、GitHub、电脑里散落的 .md / .json / Office',
    tags: ['微信', 'QQ', 'GitHub'],
  },
  {
    id: 2,
    label: '墨览处理',
    detail: '一键打开阅读、复制提示词、Office 转 Markdown',
    tags: ['阅读', '转换', '复制'],
  },
  {
    id: 3,
    label: 'AI 读取',
    detail: '结构化输出，AI / Agent / MCP 稳定读取，决定下一步',
    tags: ['Markdown', 'JSON', 'Agent'],
  },
] as const;

/** 能力网格（区块5） */
export const FEATURES = [
  {
    id: 'read',
    title: 'Markdown / JSON 阅读',
    desc: '表格、代码块、目录、深色模式。JSON 树形折叠、搜索、复制 JSONPath。',
    icon: 'read',
  },
  {
    id: 'prompt',
    title: '提示词快贴',
    desc: '常用提示词收藏、搜索、一键复制，从文件提取 prompt / rules / 命令片段。',
    icon: 'prompt',
  },
  {
    id: 'office',
    title: 'Office → Markdown',
    desc: 'Word / PDF / PPT / Excel 转 Markdown，让 AI 直接读得懂。',
    icon: 'office',
  },
  {
    id: 'convert',
    title: '格式转换',
    desc: 'Markdown ↔ Word、Markdown → PDF，转换后直接分享回微信 / QQ。',
    icon: 'convert',
  },
  {
    id: 'cloud',
    title: '云存储汇聚',
    desc: '跨设备汇聚，文件不默认上传，用户主动设为"有用资源"才同步。',
    icon: 'cloud',
  },
  {
    id: 'ai',
    title: 'AI 可读输出',
    desc: 'CLI 输出结构化 JSON，AI / Agent / MCP 稳定读取，决定下一步。',
    icon: 'ai',
  },
] as const;

/** 信任徽章（区块6） */
export const TRUST = [
  { id: 'offline', title: '离线优先', desc: '无网也能打开、阅读、编辑、复制、转换。' },
  { id: 'private', title: '文件不上传', desc: '默认本地处理，云端只存你主动同步的。' },
  { id: 'opensource', title: '开源', desc: '代码公开，可审计，可自部署。' },
  { id: 'local', title: '本地优先', desc: '客户端是事实来源，云端只是汇聚点。' },
] as const;

export { RELEASE_CHANNELS };

/** 预约/候补区文案 —— 放在 Hero 之后，是主转化入口 */
export const EARLY_ACCESS = {
  eyebrow: '抢先体验',
  title: '第一时间拿到墨览',
  subtitle: '手机端还在打磨。留个邮箱，好了第一时间通知你。',
  placeholder: 'your@email.com',
  button: '通知我',
  successTitle: '已加入候补名单',
  successDesc: '我们会在墨览上线时第一时间邮件你。也可以先试试桌面版和 CLI。',
  socialProof: '已有开发者加入候补',
  githubCta: '先看 GitHub',
} as const;

/** FAQ（区块8） */
export const FAQS = [
  {
    q: '墨览安全吗？会上传我的文件吗？',
    a: '默认不上传。打开、阅读、编辑、转换都在本地完成。只有你主动点"保存到云端"或"设为有用资源"时，文件才会同步。',
  },
  {
    q: '能打开哪些文件？',
    a: '.md / .markdown / .json 直接阅读；Word / PDF / PPT / Excel 通过桌面端或 CLI 转成 Markdown 后阅读。',
  },
  {
    q: '需要联网才能用吗？',
    a: '不需要。核心链路——打开、阅读、复制、编辑、基础转换、分享——全部离线可用。',
  },
  {
    q: '和 WPS / 钉钉文档有什么区别？',
    a: '墨览不做完整办公套件，专注一件事：把散落的文件整成 AI 能读的格式。它是 AI 工作流的入口，不是办公编辑器。',
  },
  {
    q: '要钱吗？',
    a: '核心功能免费，开源。云端同步和 AI 高级能力后续可能推出付费档。',
  },
] as const;

/** Footer 导航 */
export const FOOTER_LINKS = {
  product: [
    { label: '预约', href: '#early-access' },
    { label: '能力', href: '#features' },
    { label: '三端', href: '#platforms' },
  ],
  resource: [
    { label: 'GitHub', href: DOC_LINKS.repo },
    { label: 'CLI 文档', href: DOC_LINKS.cli },
    { label: '使用教程', href: DOC_LINKS.readme },
    { label: '支持与反馈', href: DOC_LINKS.support },
  ],
  legal: [
    { label: '隐私说明', href: DOC_LINKS.privacy },
    { label: '服务条款', href: DOC_LINKS.terms },
    { label: '删除与注销', href: DOC_LINKS.deletion },
    { label: '开源协议', href: DOC_LINKS.license },
  ],
} as const;
