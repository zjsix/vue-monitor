import type { Breadcrumb, ErrorInfo, MonitorOptions } from './types'
import { formatDate } from './utils'

export class VueMonitor {
    private breadcrumbs: Breadcrumb[] = []
    private errorCache = new Map<string, number>()
    private errorQueue: Array<{ hash: string; time: number }> = []

    constructor(
        private options: MonitorOptions & { filterInputAndScanData?: boolean }
    ) {
        this.options.maxBreadcrumbs ||= 20
        this.options.errorThrottleTime ||= 60 * 1000
        this.options.filterInputAndScanData ??= true
    }

    private getErrorHash(e: { message?: string; stack?: string; url?: string }) {
        return `${e.message}-${e.stack}-${e.url}`
    }

    /** Vue 错误捕获 */
    initVue(VueOrApp: any, isVue3 = false) {
        const original = VueOrApp.config?.errorHandler
        VueOrApp.config.errorHandler = (err: Error, vm: any, info: string) => {
            this.reportError({
                message: err.message,
                stack: err.stack,
                info,
                url: location.href,
                timestamp: formatDate()
            })
            original?.call(VueOrApp, err, vm, info) ?? console.error(err)
        }
    }

    /** 全局错误捕获 */
    initGlobalError() {
        function wrap<T extends (...args: any[]) => any>(
            fn: T | null | undefined,
            cb: T
        ): T {
            return (((...args: Parameters<T>) => {
                cb(...args)
                return fn?.(...args)
            }) as T)
        }

        window.onerror = wrap(window.onerror, (msg, src, line, col, err) =>
            this.reportError({
                message: String(msg) || 'unknown error',
                stack: err?.stack,
                url: location.href,
                timestamp: formatDate()
            })
        )

        window.onunhandledrejection = wrap(window.onunhandledrejection, (e: any) =>
            this.reportError({
                message: e.reason?.toString() || 'unhandled promise rejection',
                stack: e.reason?.stack,
                url: location.href,
                timestamp: formatDate()
            })
        )

        window.addEventListener(
            'error',
            (e: Event) => {
                const el = e.target as HTMLElement
                const map: Record<string, string> = {
                    SCRIPT: 'script load error',
                    LINK: 'link load error',
                    IMG: 'image load error'
                }
                const type = map[el.tagName]
                if (type) {
                    this.reportError({
                        message: type,
                        url: (el as any).src || (el as any).href,
                        timestamp: formatDate()
                    })
                }
            },
            true
        )
    }

    /** 用户行为记录 */
    initBehavior() {
        const add = (type: string, target: HTMLElement, value?: string) =>
            this.addBreadcrumb({
                type,
                target:
                    target.tagName +
                    (target.id ? `#${target.id}` : '') +
                    (target.className ? `.${target.className}` : ''),
                value,
                timestamp: formatDate()
            })

        document.addEventListener('click', e =>
            add('click', e.target as HTMLElement)
        )

        document.addEventListener('input', e => {
            const t = e.target as HTMLInputElement;
            if (!t || typeof t.value !== 'string') return;
            const v = this.options.filterInputAndScanData
                ? `length:${t.value.length}`
                : t.value
            add('input', t, v)
        })

        // 扫码监听
        let buf = '',
            last = 0
        document.addEventListener('keydown', e => {
            const now = Date.now()
            if (now - last > 50) buf = ''
            last = now
            if (e.key === 'Enter' && buf) {
                const v = this.options.filterInputAndScanData
                    ? `length:${buf.length}`
                    : buf
                this.addBreadcrumb({ type: 'scan', target: 'document', value: v, timestamp: formatDate() })
                buf = ''
            } else if (e.key.length === 1) buf += e.key
        })
    }

    private addBreadcrumb(b: Breadcrumb) {
        this.breadcrumbs.push(b)
        if (this.breadcrumbs.length > (this.options.maxBreadcrumbs || 20))
            this.breadcrumbs.shift()
    }

    reportError(err: ErrorInfo | Error) {
        const info: ErrorInfo =
            err instanceof Error
                ? {
                    message: err.message,
                    stack: err.stack,
                    url: location.href,
                    timestamp: formatDate()
                }
                : err

        const hash = this.getErrorHash(info)
        const now = Date.now()
        const limit = this.options.errorThrottleTime!

        // 清理过期缓存
        while (this.errorQueue[0] && now - this.errorQueue[0].time > limit) {
            this.errorCache.delete(this.errorQueue.shift()!.hash)
        }

        if (this.errorCache.get(hash) && now - this.errorCache.get(hash)! < limit) {
            console.warn('重复错误被忽略', info.message)
            return
        }

        this.errorCache.set(hash, now)
        this.errorQueue.push({ hash, time: now })

        fetch(this.options.reportUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectName: this.options.projectName,
                projectVersion: this.options.projectVersion,
                error: info,
                breadcrumbs: this.breadcrumbs
            }),
            keepalive: true
        }).catch(e => console.warn('上报错误失败:', e))
    }
}

export const VueMonitorPlugin = {
    install(VueOrApp: any, opt: MonitorOptions) {
        const monitor = new VueMonitor(opt)
        const isVue3 = !!(VueOrApp.config && VueOrApp.config.globalProperties)
        monitor.initVue(VueOrApp, isVue3)
        monitor.initGlobalError()
        monitor.initBehavior()
            ; (window as any).VueMonitorInstance = monitor
    }
}
