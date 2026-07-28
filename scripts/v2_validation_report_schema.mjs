export const reportStatus = {
  pending: '待执行模板',
  completed: '已执行',
};

const schemas = {
  device: [
    { label: '任务ID', kind: 'text' },
    { label: '设备 / 系统', kind: 'text' },
    { label: '墨览版本', kind: 'text' },
    { label: '来源App / 版本', kind: 'text' },
    { label: '样例文件 / 大小 / hash', kind: 'text' },
    { label: '操作步骤', kind: 'text' },
    { label: '目标指标', kind: 'text' },
    { label: '实测结果', kind: 'text' },
    { label: '截图或录屏路径', kind: 'path_list' },
    { label: '是否通过', kind: 'verdict' },
  ],
  cross: [
    { label: '任务ID', kind: 'text' },
    { label: '账号 / 设备', kind: 'text' },
    { label: '来源文件ID / 版本 / hash', kind: 'text' },
    { label: '同步事件ID', kind: 'text' },
    { label: '电脑落盘与派生对象', kind: 'path_or_text' },
    { label: 'AI读取入口', kind: 'text' },
    { label: '结果ID / 来源版本', kind: 'text' },
    { label: '故障注入', kind: 'text' },
    { label: '恢复结果', kind: 'text' },
    { label: '证据路径', kind: 'path_list' },
  ],
  ai_read: [
    { label: '任务ID', kind: 'text' },
    { label: '真实 AI 客户端', kind: 'text' },
    { label: 'CLI / MCP 入口', kind: 'text' },
    { label: '来源文件 / hash', kind: 'text' },
    { label: '派生 Markdown / hash', kind: 'text' },
    { label: '授权前拒绝证据', kind: 'path_or_url_list' },
    { label: '授权后读取证据', kind: 'path_or_url_list' },
    { label: '撤回后拒绝证据', kind: 'path_or_url_list' },
    { label: '日志或录屏路径', kind: 'path_or_url_list' },
    { label: '是否通过', kind: 'verdict' },
  ],
  result_return: [
    { label: '任务ID', kind: 'text' },
    { label: '真实 AI 客户端', kind: 'text' },
    { label: '来源文件 / 来源版本 / hash', kind: 'text' },
    { label: '结果类型（Markdown / JSON）', kind: 'text' },
    { label: '结果ID', kind: 'text' },
    { label: '写回入口（CLI / MCP）', kind: 'text' },
    { label: '桌面确认结果', kind: 'path_or_text' },
    { label: 'Android 录屏路径', kind: 'path_or_url_list' },
    { label: 'iOS 录屏路径', kind: 'path_or_url_list' },
    { label: '是否通过', kind: 'verdict' },
  ],
  release: [
    { label: '任务ID', kind: 'text' },
    { label: '平台 / 渠道', kind: 'text' },
    { label: '版本 / 构建号', kind: 'text' },
    { label: '产物文件', kind: 'path_list' },
    { label: '签名主体', kind: 'text' },
    { label: 'SHA256', kind: 'text' },
    { label: '安装 / 升级 / 回滚结果', kind: 'text' },
    { label: '隐私与权限检查', kind: 'text' },
    { label: '下载或测试链接', kind: 'path_or_url_list' },
    { label: '已知问题', kind: 'text' },
  ],
};

export function reportFieldDefinitions(reportKind) {
  return schemas[reportKind] ?? [{ label: '待补模板', kind: 'text' }];
}

export function reportFields(reportKind) {
  return reportFieldDefinitions(reportKind).map((item) => item.label);
}

export function templateBlock(reportKind, batch) {
  const fields = reportFieldDefinitions(reportKind);
  const overrides = {
    task_id: batch.tasks.length === 1 ? batch.tasks[0] : batch.tasks.join(' / '),
  };
  const firstFieldValue = new Map([
    ['任务ID', overrides.task_id],
  ]);

  return [
    '```text',
    ...fields.map((field) => `${field.label}：${firstFieldValue.get(field.label) ?? ''}`),
    '```',
  ].join('\n');
}

export function placeholderValue(value) {
  return !value || /^(待补|待执行|TODO|未填|TBD)$/i.test(value.trim());
}

export function positiveVerdict(value) {
  return /^(是|通过|pass|passed|true|ok|yes)$/i.test((value ?? '').trim());
}
