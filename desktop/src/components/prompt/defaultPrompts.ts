import type { PromptItem } from './model';

export const DEFAULT_PROMPTS: readonly PromptItem[] = [
  {
    id: 'prd-breakdown',
    title: 'PRD 需求拆解模板',
    group: '最近复制',
    tags: ['prd', '需求分析'],
    content: '请帮我把这份 PRD 拆解为功能、用户需求、核心流程、边界条件和可执行 to-do。',
  },
  {
    id: 'api-doc',
    title: '接口文档解读',
    group: '最近复制',
    tags: ['api', '文档'],
    content: '请阅读这份接口文档，整理核心接口、参数、返回结构、错误码和调用注意事项。',
  },
  {
    id: 'code-review',
    title: '代码 Review 清单',
    group: '收藏',
    tags: ['code', 'review', 'quality'],
    content: '请对以下代码进行 Review，重点关注可读性、性能、安全性、异常处理，并给出改进建议。',
  },
  {
    id: 'unit-test',
    title: '生成单元测试',
    group: '开发常用',
    tags: ['test'],
    content: '请为这段代码生成单元测试，覆盖正常路径、边界条件和异常路径。',
  },
  {
    id: 'refactor',
    title: '重构建议',
    group: '开发常用',
    tags: ['refactor'],
    content: '请提出这段代码的重构建议，优先提升可读性和可维护性，不改变现有行为。',
  },
];
