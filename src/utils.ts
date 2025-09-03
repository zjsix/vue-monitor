/**
 * 格式化日期
 * @param date Date | string | undefined，不传默认当前时间
 * @param format 格式字符串，不传默认 "YYYY-MM-DD HH:mm:ss"
 * @returns 格式化后的日期字符串
 */
export function formatDate(
    date?: Date | string,
    format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
    const d: Date = typeof date === 'string' ? new Date(date) : (date ?? new Date());

    if (isNaN(d.getTime())) {
        throw new Error('Invalid date provided');
    }

    const pad = (n: number): string => String(n).padStart(2, '0');

    const map: Record<string, string> = {
        YYYY: d.getFullYear().toString(),
        MM: pad(d.getMonth() + 1),
        DD: pad(d.getDate()),
        HH: pad(d.getHours()),
        mm: pad(d.getMinutes()),
        ss: pad(d.getSeconds())
    };

    return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (key) => map[key]);
}


/**
 * 节流函数
 * @param func 需要节流的函数
 * @param wait 节流时间间隔，单位毫秒
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let lastTime = 0;
    return function(this: any, ...args: any[]) {
        const now = Date.now();
        if (now - lastTime >= wait) {
            lastTime = now;
            func.apply(this, args);
        }
    } as T;
}