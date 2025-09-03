# VueMonitor

> 一个简单的 Vue.js（支持 Vue 2 和 Vue 3）监控插件，提供错误捕获、性能监控、用户行为追踪等功能。  
> 可搭配 [vue-monitor-view](https://github.com/zjsix/vue-monitor-view) 使用，方便查看错误信息。

---

## 功能特点

- **Vue 错误捕获**：自动捕获 Vue 组件、方法和模板中的错误。
- **全局 JS 错误捕获**：监控原生 JavaScript 错误（`window.onerror`）、未处理的 Promise 异常（`window.onunhandledrejection`）及资源加载错误。
- **用户行为追踪**：自动记录点击事件、输入事件（支持脱敏）、扫码事件。
- **性能监控**：自动采集核心 Web Vitals（如 LCP、FID、CLS、INP、长任务、掉帧等），并记录到用户操作记录中。
- **用户操作（Breadcrumb）记录**：保留最近的用户操作轨迹，方便调试和错误分析。
- **低侵入式**：不修改现有代码逻辑，也不会隐藏控制台报错。
- **易于集成**：Vue 2 可通过 `Vue.use()` 使用，Vue 3 可通过 `app.use()` 使用。
- **自定义上报**：支持自定义 header、body、附加数据等。

---

## 安装

```bash
npm install @zjsix/vue-monitor
```

---

## 使用示例

### Vue 2

```js
import Vue from 'vue';
import VueMonitor from '@zjsix/vue-monitor';
import pkg from '../package.json';

Vue.use(VueMonitor, {
    reportUrl: '/api/report', // 必填：日志上报接口
    projectName: pkg.name,
    projectVersion: pkg.version,
    maxBreadcrumbs: 50,
    errorThrottleTime: 60000,
    filterInputAndScanData: true,
    customHeaders: { 'Authorization': 'Bearer xxx' },
    customData: { env: 'prod' }
});

new Vue({
  el: '#app'
});
```

### Vue 3

```js
import { createApp } from 'vue';
import VueMonitor from '@zjsix/vue-monitor';
import App from './App.vue';

const app = createApp(App);

app.use(VueMonitor, {
  reportUrl: '/api/report',
  projectName: 'vue3-test',
  projectVersion: '1.0.0'
});

app.mount('#app');
```

---

## 配置项说明

| 选项名                   | 类型                        | 说明                                                         | 默认值         |
|--------------------------|-----------------------------|--------------------------------------------------------------|---------------|
| reportUrl                | string                      | 日志上报接口地址                                             | 必填          |
| projectName              | string                      | 项目名称                                                     | 可选          |
| projectVersion           | string                      | 项目版本                                                     | 可选          |
| maxBreadcrumbs           | number                      | 最大用户行为记录数                                             | 30            |
| errorThrottleTime        | number                      | 相同错误上报节流时间（ms）                                   | 60000         |
| filterInputAndScanData   | boolean                     | 是否过滤输入框和扫码数据（true 只记录长度，false 记录原文）   | true          |
| customHeaders            | Record<string, string>       | 上报请求自定义 header                                        | 可选          |
| customData               | Record<string, any>          | 上报请求附加自定义数据                                       | 可选          |


---

## API

### 全局实例 `$monitor`

- `this.$monitor.addBreadcrumb(breadcrumb: Breadcrumb)`：手动添加用户操作记录。
- `this.$monitor.reportError(error: ErrorInfo | Error)`：手动上报错误。

### 类型定义

```typescript
interface Breadcrumb {
  type: string;        // 行为类型，如 click、input、scan、performance 等
  target: string;      // 目标元素描述
  value?: string;      // 行为值（如输入内容、扫码内容、性能数据等）
  timestamp: string;   // 时间戳
}

interface ErrorInfo {
  message: string;
  stack?: string;
  url?: string;
  timestamp: string;
  [key: string]: any;
}
```

---

## 性能监控说明

- 自动采集 LCP、FID、CLS、INP、长任务、掉帧等核心 Web Vitals。
- 性能数据会以 `performance` 类型记录到用户行为记录中，便于分析。

---

## 隐私与安全

- 默认情况下，输入框和扫码数据只记录长度，不记录原文内容，保护用户隐私。
- 如需记录原文内容，可将 `filterInputAndScanData` 设为 `false`，请确保符合相关隐私合规要求。

---

## 贡献

欢迎提 issue 或 PR！如有建议或需求请在 [GitHub](https://github.com/zjsix/vue-monitor) 提出。

---

如需自定义更多功能，可参考源码或 issue 交流
