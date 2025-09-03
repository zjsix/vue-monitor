export interface Breadcrumb {
  type: string
  target?: string
  value?: string
  timestamp: string
}

export interface ErrorInfo {
  message: string
  stack?: string
  info?: string
  url: string
  timestamp: string
}

export interface MonitorOptions {
  reportUrl: string
  projectName?: string
  projectVersion?: string
  maxBreadcrumbs?: number,
  errorThrottleTime?: number,
  filterInputAndScanData?: boolean,
  customHeaders?: Record<string, string>,
  customData?: Record<string, any>
}

export interface CachedError {
  hash: string;
  lastTime: number;
}