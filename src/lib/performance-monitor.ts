import React from 'react';

/**
 * Enterprise Performance Monitoring
 * Tracks app performance and provides optimization insights
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  initialize(): void {
    if (typeof window === 'undefined') return;

    // Monitor navigation timing
    this.observeNavigationTiming();
    
    // Monitor resource loading
    this.observeResourceTiming();
    
    // Monitor paint timing
    this.observePaintTiming();
    
    // Monitor largest contentful paint
    this.observeLCP();
    
    // Monitor first input delay
    this.observeFID();
    
    // Monitor cumulative layout shift
    this.observeCLS();
  }

  /**
   * Track custom performance metrics
   */
  trackMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${name} = ${value}ms`, metadata);
    }
  }

  /**
   * Track component render time
   */
  trackComponentRender(componentName: string, renderTime: number): void {
    this.trackMetric(`component_render_${componentName}`, renderTime, {
      type: 'component_render',
      component: componentName
    });
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, duration: number, success: boolean): void {
    this.trackMetric(`api_call_${endpoint}`, duration, {
      type: 'api_call',
      endpoint,
      success
    });
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(table: string, operation: string, duration: number): void {
    this.trackMetric(`db_query_${table}_${operation}`, duration, {
      type: 'database_query',
      table,
      operation
    });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): Record<string, any> {
    const summary = {
      totalMetrics: this.metrics.length,
      timeRange: {
        start: this.metrics[0]?.timestamp,
        end: this.metrics[this.metrics.length - 1]?.timestamp
      },
      breakdown: {}
    };

    // Group metrics by type
    const grouped = this.metrics.reduce((acc, metric) => {
      const type = metric.metadata?.type || 'custom';
      if (!acc[type]) acc[type] = [];
      acc[type].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    // Calculate averages
    Object.entries(grouped).forEach(([type, metrics]) => {
      const values = metrics.map(m => m.value);
      summary.breakdown[type] = {
        count: metrics.length,
        average: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    });

    return summary;
  }

  /**
   * Observe navigation timing
   */
  private observeNavigationTiming(): void {
    if (!('performance' in window)) return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        this.trackMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart, {
          type: 'navigation',
          metric: 'page_load'
        });

        this.trackMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart, {
          type: 'navigation',
          metric: 'dom_ready'
        });
      }
    });
  }

  /**
   * Observe resource timing
   */
  private observeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming;
          this.trackMetric(`resource_load_${resource.name.split('/').pop()}`, resource.duration, {
            type: 'resource',
            url: resource.name,
            size: resource.transferSize
          });
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
    this.observers.push(observer);
  }

  /**
   * Observe paint timing
   */
  private observePaintTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.trackMetric(entry.name.replace('-', '_'), entry.startTime, {
          type: 'paint',
          metric: entry.name
        });
      });
    });

    observer.observe({ entryTypes: ['paint'] });
    this.observers.push(observer);
  }

  /**
   * Observe Largest Contentful Paint
   */
  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      this.trackMetric('largest_contentful_paint', lastEntry.startTime, {
        type: 'core_web_vital',
        metric: 'lcp'
      });
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.push(observer);
  }

  /**
   * Observe First Input Delay
   */
  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        this.trackMetric('first_input_delay', (entry.processingStart || entry.startTime) - entry.startTime, {
          type: 'core_web_vital',
          metric: 'fid'
        });
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
    this.observers.push(observer);
  }

  /**
   * Observe Cumulative Layout Shift
   */
  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value || 0;
        }
      });

      this.trackMetric('cumulative_layout_shift', clsValue, {
        type: 'core_web_vital',
        metric: 'cls'
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(observer);
  }

  /**
   * Clean up observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

// React hook for component performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const startTime = React.useRef<number>(Date.now());
  
  React.useEffect(() => {
    startTime.current = Date.now();
  });

  React.useEffect(() => {
    return () => {
      const renderTime = Date.now() - startTime.current;
      PerformanceMonitor.getInstance().trackComponentRender(componentName, renderTime);
    };
  });
};

// Decorator for tracking function performance
export const trackPerformance = (metricName: string) => {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      try {
        const result = await method.apply(this, args);
        const duration = Date.now() - startTime;
        PerformanceMonitor.getInstance().trackMetric(metricName, duration);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        PerformanceMonitor.getInstance().trackMetric(`${metricName}_error`, duration);
        throw error;
      }
    };
  };
};
