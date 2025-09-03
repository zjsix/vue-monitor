import type { Breadcrumb, ErrorInfo, MonitorOptions } from './types'
import { formatDate, throttle } from './utils'

export class VueMonitor {
    private breadcrumbs: Breadcrumb[] = []
    private errorCache = new Map<string, number>()

    constructor(
        private options: MonitorOptions & { filterInputAndScanData?: boolean }
    ) {
        this.options.maxBreadcrumbs ||= 30
        this.options.errorThrottleTime ||= 60 * 1000
        this.options.filterInputAndScanData ??= true
    }

    private getErrorHash(e: { message?: string; stack?: string; url?: string }) {
        return `${e.message}-${e.stack}-${e.url}`
    }

    /** Vue 错误捕获 */
    initVue(VueOrApp: any, isVue3 = false) {
        const original = VueOrApp.config?.errorHandler

        if (isVue3) {
            VueOrApp.config.errorHandler = (err: unknown, instance: any, info: string) => {
                this.reportError({
                    message: err instanceof Error ? err.message : String(err),
                    stack: err instanceof Error ? err.stack : undefined,
                    info,
                    url: location.href,
                    timestamp: formatDate()
                })
                original?.call(VueOrApp, err, instance, info)
            }
        } else {
            VueOrApp.config.errorHandler = (err: Error, vm: any, info: string) => {
                this.reportError({
                    message: err.message,
                    stack: err.stack,
                    info,
                    url: location.href,
                    timestamp: formatDate()
                })
                original?.call(VueOrApp, err, vm, info)
            }
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
                    (target.className
                        ? typeof target.className === 'string'
                            ? `.${target.className.trim()}`
                            : `.${Array.from(target.className).map(c => String(c).trim()).join('.')}`
                        : ''),
                value,
                timestamp: formatDate()
            })

        const getTargetValue = (target: HTMLElement) => {
            if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
                return target.value
            } else if (target.isContentEditable) {
                return target.textContent || ''
            }
            return ''
        }

        // 点击事件
        document.addEventListener('click', e => add('click', e.target as HTMLElement))

        // 输入事件
        document.addEventListener('input', e => {
            const t = e.target as HTMLElement
            const v = getTargetValue(t)
            const value = this.options.filterInputAndScanData ? `length:${v.length}` : v
            add('input', t, value)
        })

        // 中文输入法支持
        let composing = false
        document.addEventListener('compositionstart', () => { composing = true })
        document.addEventListener('compositionend', (e: CompositionEvent) => {
            composing = false
            const target = e.target as HTMLElement
            const v = getTargetValue(target)
            const value = this.options.filterInputAndScanData ? `length:${v.length}` : v
            add('scan', target, value)
        })

        // 扫码枪
        document.addEventListener('keydown', e => {
            if (!composing && e.key === 'Enter') {
                const target = e.target as HTMLElement
                const v = getTargetValue(target)
                const value = this.options.filterInputAndScanData ? `length:${v.length}` : v
                add('scan', target, value)
            }
        })
    }

    private addBreadcrumb(b: Breadcrumb) {
        this.breadcrumbs.push(b)
        if (this.breadcrumbs.length > (this.options.maxBreadcrumbs || 20))
            this.breadcrumbs.shift()
    }

    /** 上报错误 */
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

        for (const [h, t] of this.errorCache.entries()) {
            if (now - t > limit) this.errorCache.delete(h)
        }

        if (this.errorCache.has(hash) && now - this.errorCache.get(hash)! < limit) {
            console.warn('重复错误被忽略', info.message)
            return
        }

        this.errorCache.set(hash, now)

        let payload = {
            projectName: this.options.projectName,
            projectVersion: this.options.projectVersion,
            error: info,
            breadcrumbs: this.breadcrumbs,
            ...(this.options.customData || {})
        }

        fetch(this.options.reportUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.options.customHeaders || {})
            },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(e => console.warn('上报错误失败:', e))
    }

    /** 性能监控 */
    initPerformanceMonitor() {
        if (typeof PerformanceObserver !== 'function') return

        const perfTypes = [
            'paint',
            'largest-contentful-paint',
            'first-input',
            'layout-shift'
        ]

        perfTypes.forEach(type => {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        this.addBreadcrumb({
                            type: 'performance',
                            target: type,
                            value: JSON.stringify({
                                name: entry.name,
                                startTime: entry.startTime,
                                duration: entry.duration
                            }),
                            timestamp: formatDate()
                        })
                    }
                })
                observer.observe({ type, buffered: true })
            } catch (e) {
                console.warn('监听页面核心性能指标报错', e)
            }
        })

        try {
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.addBreadcrumb({
                        type: 'performance',
                        target: 'longtask',
                        value: JSON.stringify({
                            name: entry.name,
                            startTime: entry.startTime,
                            duration: entry.duration
                        }),
                        timestamp: formatDate()
                    })
                }
            })
            longTaskObserver.observe({ type: 'longtask', buffered: true })
        } catch (e) {
            console.warn('监听页面长任务报错', e)
        }

        /** 掉帧监控 */
        function initFrameDropMonitor(addBreadcrumb: (b: Breadcrumb) => void) {
            let lastFrameTime = performance.now()
            let pendingFrameDrop: { frameTime: number; count: number } | null = null

            const pushBreadcrumb = throttle(() => {
                if (pendingFrameDrop) {
                    addBreadcrumb({
                        type: 'performance',
                        target: 'frame-drop',
                        value: JSON.stringify(pendingFrameDrop),
                        timestamp: formatDate()
                    })
                    pendingFrameDrop = null
                }
            }, 100)

            const tick = () => {
                const now = performance.now()
                const delta = now - lastFrameTime
                lastFrameTime = now

                if (!document.hidden && delta > 50) {
                    if (pendingFrameDrop) {
                        pendingFrameDrop.count += 1
                        pendingFrameDrop.frameTime = delta
                    } else {
                        pendingFrameDrop = { frameTime: delta, count: 1 }
                    }
                    pushBreadcrumb()
                }

                if (document.hidden) lastFrameTime = performance.now()

                requestAnimationFrame(tick)
            }

            requestAnimationFrame(tick)
        }

        initFrameDropMonitor((breadcrumb) => this.addBreadcrumb(breadcrumb))
    }
}
