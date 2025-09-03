import { VueMonitor } from './monitor'
import type { MonitorOptions } from './types'

const VueMonitorPlugin = {
  install(VueOrApp: any, options?: MonitorOptions) {
    if (!options || !options.reportUrl) {
      console.error('请提供 reportUrl 选项')
      return
    }

    // 判断是否 Vue 环境
    const isVue3 = VueOrApp?.config && VueOrApp?.config.globalProperties
    const isVue2 = VueOrApp?.prototype && VueOrApp?.version

    if (!isVue2 && !isVue3) {
      console.warn('[VueMonitor] 未检测到 Vue 环境，插件未生效')
      return
    }

    const monitor = new VueMonitor(options)
    monitor.initGlobalError()
    monitor.initBehavior()
    monitor.initPerformanceMonitor()

    if (isVue3) {
      monitor.initVue(VueOrApp, true)
      VueOrApp.config.globalProperties.$monitor = monitor
    } else {
      monitor.initVue(VueOrApp, false)
      VueOrApp.prototype.$monitor = monitor
    }
  }
}

export default VueMonitorPlugin
export { VueMonitor }
