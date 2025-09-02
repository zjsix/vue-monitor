# VueMonitor

> 一个简单的 Vue.js（支持 Vue 2 和 Vue 3）监控插件，提供错误捕获、性能监控（还没写）、用户行为追踪等功能。

## 功能特点

- **Vue 错误捕获**：自动捕获 Vue 组件、方法和模板中的错误。
- **全局 JS 错误捕获**：监控原生 JavaScript 错误（`window.onerror`）和未处理的 Promise 异常（`window.onunhandledrejection`）以及资源加载错误。
- **用户行为追踪**：自动记录点击事件、输入事件以及扫码事件。
- **用户操作（Breadcrumb）记录**：保留最近的用户操作轨迹，方便调试和错误分析。
- **低侵入式**：不修改现有代码逻辑，也不会隐藏控制台报错。
- **Vue 2 & Vue 3 兼容**：支持Vue 2 和 Vue 3。
- **易于集成**：Vue 2 可通过 `Vue.use()` 使用，Vue 3 可通过 `app.use()` 使用。

## 安装

```bash
npm install @zjsix/vue-monitor
```

或者使用 CDN：

```html
<script src="https://cdn.jsdelivr.net/npm/@zjsix/vue-monitor/dist/umd/vue-monitor.js"></script>
```

## 使用示例

### Vue 2

```js
import Vue from 'vue';
import VueMonitor from '@zjsix/vue-monitor';
import pkg from '../package.json'

// 一般限制在生成环境才使用
if(process.env.NODE_ENV === 'production'){
    Vue.use(VueMonitor, {
        reportUrl: '/api/report', // 上传地址
        projectName: pkg.name, // 项目版本 可自己定义
        projectVersion: pkg.version, // 项目名称 可自己定义
        maxBreadcrumbs: 50, // 最大记录数 默认20
        errorThrottleTime: 1000 * 60, // 相同错误上报节流时间 默认1分钟
        filterInputAndScanData: false // 不过滤输入框和扫码数据，记录原始内容 默认过滤 过滤则只记录文本长度
    });
}

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

## API

### 全局实例 `$monitor`

- `this.$monitor.addBreadcrumb(breadcrumb: Breadcrumb)`：手动添加记录。
- `this.$monitor.reportError(error: ErrorInfo)`：手动上报错误。
