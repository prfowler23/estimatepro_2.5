interface TimelineEntry {
  service: string;
  serviceName?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  dependencies: string[];
  weatherRisk?: 'low' | 'medium' | 'high';
  isOnCriticalPath?: boolean;
  crewSize?: number;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'delayed';
  confidence?: 'high' | 'medium' | 'low';
}

interface Timeline {
  entries: TimelineEntry[];
  totalDuration: number;
  criticalPath: string[];
}

interface ProjectInfo {
  name: string;
  location?: string;
  clientName?: string;
  projectManager?: string;
  estimateNumber?: string;
}

export class CalendarExportService {
  private readonly SERVICE_NAMES: Record<string, string> = {
    'WC': 'Window Cleaning',
    'GR': 'Glass Restoration',
    'BWP': 'Building Wash (Pressure)',
    'BWS': 'Building Wash (Soft)',
    'HBW': 'High-Rise Building Wash',
    'PWF': 'Pressure Wash (Flat)',
    'HFS': 'Hard Floor Scrubbing',
    'PC': 'Parking Cleaning',
    'PWP': 'Parking Pressure Wash',
    'IW': 'Interior Wall Cleaning',
    'DC': 'Deck Cleaning'
  };

  /**
   * Export timeline to ICS (iCalendar) format
   */
  exportToICS(timeline: Timeline, projectInfo: ProjectInfo, includeWeekends: boolean = false): string {
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//EstimatePro//Service Schedule//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${projectInfo.name} - Service Schedule`,
      `X-WR-CALDESC:Project timeline for ${projectInfo.name}`,
      'X-WR-TIMEZONE:America/New_York'
    ];
    
    // Add project milestone events
    if (timeline.entries.length > 0) {
      const projectStart = this.createProjectMilestone(
        timeline.entries[0].startDate,
        projectInfo,
        'PROJECT START'
      );
      icsLines.push(...projectStart);
      
      const projectEnd = this.createProjectMilestone(
        timeline.entries[timeline.entries.length - 1].endDate,
        projectInfo,
        'PROJECT END'
      );
      icsLines.push(...projectEnd);
    }
    
    // Add service events
    timeline.entries.forEach(entry => {
      const serviceEvents = this.createServiceEvents(entry, projectInfo, includeWeekends);
      icsLines.push(...serviceEvents);
    });
    
    // Add critical path events
    if (timeline.criticalPath.length > 0) {
      const criticalPathEvent = this.createCriticalPathEvent(timeline, projectInfo);
      icsLines.push(...criticalPathEvent);
    }
    
    icsLines.push('END:VCALENDAR');
    return icsLines.join('\\r\\n');
  }
  
  /**
   * Create service events (can be multiple events for multi-day services)
   */
  private createServiceEvents(entry: TimelineEntry, projectInfo: ProjectInfo, includeWeekends: boolean): string[] {
    const events: string[] = [];
    
    // Main service event
    const mainEvent = this.createEvent(entry, projectInfo, 'service');
    events.push(...mainEvent);
    
    // Add preparation event (day before start)
    if (entry.duration > 1) {
      const prepDate = new Date(entry.startDate);
      prepDate.setDate(prepDate.getDate() - 1);
      
      // Skip if prep day is weekend and weekends not included
      if (includeWeekends || (prepDate.getDay() !== 0 && prepDate.getDay() !== 6)) {
        const prepEvent = this.createPreparationEvent(entry, projectInfo, prepDate);
        events.push(...prepEvent);
      }
    }
    
    // Add daily reminder events for long services (>3 days)
    if (entry.duration > 3) {
      const reminderEvents = this.createDailyReminders(entry, projectInfo, includeWeekends);
      events.push(...reminderEvents);
    }
    
    return events;
  }
  
  /**
   * Create main service event
   */
  private createEvent(entry: TimelineEntry, projectInfo: ProjectInfo, type: 'service' | 'milestone' | 'reminder'): string[] {
    const uid = `${entry.service}-${type}-${Date.now()}@estimatepro.com`;
    const dtstart = this.formatDate(entry.startDate);
    const dtend = this.formatDate(this.addDays(entry.endDate, 1)); // ICS end date is exclusive
    const serviceName = this.SERVICE_NAMES[entry.service] || entry.serviceName || entry.service;
    
    const summary = `${projectInfo.name} - ${serviceName}`;
    const description = this.buildDescription(entry, projectInfo);
    const categories = this.getEventCategories(entry);
    
    const event = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${this.formatDate(new Date())}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${this.escapeText(summary)}`,
      `DESCRIPTION:${this.escapeText(description)}`,
      `CATEGORIES:${categories.join(',')}`,
      `STATUS:CONFIRMED`,
      `TRANSP:OPAQUE`
    ];
    
    // Add location if available
    if (projectInfo.location) {
      event.push(`LOCATION:${this.escapeText(projectInfo.location)}`);
    }
    
    // Add priority based on critical path
    if (entry.isOnCriticalPath) {
      event.push('PRIORITY:1'); // High priority
      event.push('X-MICROSOFT-CDO-IMPORTANCE:2'); // High importance for Outlook
    } else {
      event.push('PRIORITY:5'); // Normal priority
    }
    
    // Add weather risk as custom property
    if (entry.weatherRisk) {
      event.push(`X-WEATHER-RISK:${entry.weatherRisk.toUpperCase()}`);
    }
    
    // Add alarms for critical path items
    if (entry.isOnCriticalPath) {
      event.push(...this.createAlarms());
    }
    
    event.push('END:VEVENT');
    return event;
  }
  
  /**
   * Create project milestone events
   */
  private createProjectMilestone(date: Date, projectInfo: ProjectInfo, milestoneType: string): string[] {
    const uid = `milestone-${milestoneType.toLowerCase().replace(' ', '-')}-${Date.now()}@estimatepro.com`;
    const dtstart = this.formatDate(date);
    
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${this.formatDate(new Date())}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtstart}`,
      `SUMMARY:${this.escapeText(`${projectInfo.name} - ${milestoneType}`)}`,
      `DESCRIPTION:${this.escapeText(`Project milestone: ${milestoneType} for ${projectInfo.name}`)}`,
      'CATEGORIES:PROJECT,MILESTONE',
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    ];
  }
  
  /**
   * Create preparation event
   */
  private createPreparationEvent(entry: TimelineEntry, projectInfo: ProjectInfo, prepDate: Date): string[] {
    const uid = `prep-${entry.service}-${Date.now()}@estimatepro.com`;
    const dtstart = this.formatDate(prepDate);
    const serviceName = this.SERVICE_NAMES[entry.service] || entry.serviceName || entry.service;
    
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${this.formatDate(new Date())}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtstart}`,
      `SUMMARY:${this.escapeText(`${projectInfo.name} - Prep for ${serviceName}`)}`,
      `DESCRIPTION:${this.escapeText(`Preparation and setup for ${serviceName} service`)}`,
      'CATEGORIES:PREPARATION,SETUP',
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    ];
  }
  
  /**
   * Create critical path summary event
   */
  private createCriticalPathEvent(timeline: Timeline, projectInfo: ProjectInfo): string[] {
    const uid = `critical-path-${Date.now()}@estimatepro.com`;
    const startDate = timeline.entries[0]?.startDate || new Date();
    const endDate = timeline.entries[timeline.entries.length - 1]?.endDate || new Date();
    
    const description = `Critical Path Services: ${timeline.criticalPath.join(', ')}\\n\\n` +
                       'These services directly impact project completion date. Any delays will extend the overall timeline.';
    
    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${this.formatDate(new Date())}`,
      `DTSTART;VALUE=DATE:${this.formatDate(startDate)}`,
      `DTEND;VALUE=DATE:${this.formatDate(this.addDays(endDate, 1))}`,
      `SUMMARY:${this.escapeText(`${projectInfo.name} - Critical Path`)}`,
      `DESCRIPTION:${this.escapeText(description)}`,
      'CATEGORIES:CRITICAL-PATH,PLANNING',
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'PRIORITY:1',
      'END:VEVENT'
    ];
  }
  
  /**
   * Create daily reminder events for long services
   */
  private createDailyReminders(entry: TimelineEntry, projectInfo: ProjectInfo, includeWeekends: boolean): string[] {
    const reminders: string[] = [];
    const current = new Date(entry.startDate);
    const end = new Date(entry.endDate);
    let dayCount = 1;
    
    while (current < end) {
      current.setDate(current.getDate() + 1);
      
      // Skip weekends if not included
      if (!includeWeekends && (current.getDay() === 0 || current.getDay() === 6)) {
        continue;
      }
      
      if (current < end) {
        dayCount++;
        const serviceName = this.SERVICE_NAMES[entry.service] || entry.serviceName || entry.service;
        const uid = `reminder-${entry.service}-day${dayCount}-${Date.now()}@estimatepro.com`;
        
        const reminder = [
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${this.formatDate(new Date())}`,
          `DTSTART;VALUE=DATE:${this.formatDate(current)}`,
          `DTEND;VALUE=DATE:${this.formatDate(current)}`,
          `SUMMARY:${this.escapeText(`${projectInfo.name} - ${serviceName} (Day ${dayCount})`)}`,
          `DESCRIPTION:${this.escapeText(`Continuation of ${serviceName} service - Day ${dayCount} of ${entry.duration}`)}`,
          'CATEGORIES:SERVICE,CONTINUATION',
          'STATUS:CONFIRMED',
          'TRANSP:TRANSPARENT',
          'END:VEVENT'
        ];
        
        reminders.push(...reminder);
      }
    }
    
    return reminders;
  }
  
  /**
   * Build detailed event description
   */
  private buildDescription(entry: TimelineEntry, projectInfo: ProjectInfo): string {
    const serviceName = this.SERVICE_NAMES[entry.service] || entry.serviceName || entry.service;
    let description = `Service: ${serviceName} (${entry.service})\\n`;
    description += `Duration: ${entry.duration} day${entry.duration !== 1 ? 's' : ''}\\n`;
    
    if (entry.crewSize) {
      description += `Crew Size: ${entry.crewSize} people\\n`;
    }
    
    if (entry.dependencies.length > 0) {
      description += `Dependencies: ${entry.dependencies.join(', ')}\\n`;
    }
    
    if (entry.weatherRisk) {
      description += `Weather Risk: ${entry.weatherRisk.charAt(0).toUpperCase() + entry.weatherRisk.slice(1)}\\n`;
    }
    
    if (entry.confidence) {
      description += `Confidence Level: ${entry.confidence.charAt(0).toUpperCase() + entry.confidence.slice(1)}\\n`;
    }
    
    if (entry.isOnCriticalPath) {
      description += '\\n⚠️ CRITICAL PATH: Delays will impact project completion\\n';
    }
    
    description += '\\n---\\n';
    description += `Project: ${projectInfo.name}\\n`;
    
    if (projectInfo.clientName) {
      description += `Client: ${projectInfo.clientName}\\n`;
    }
    
    if (projectInfo.projectManager) {
      description += `Project Manager: ${projectInfo.projectManager}\\n`;
    }
    
    if (projectInfo.estimateNumber) {
      description += `Estimate #: ${projectInfo.estimateNumber}\\n`;
    }
    
    description += `Generated by EstimatePro on ${new Date().toLocaleDateString()}`;
    
    return description;
  }
  
  /**
   * Get event categories for filtering
   */
  private getEventCategories(entry: TimelineEntry): string[] {
    const categories = ['SERVICE', 'CLEANING'];
    
    if (entry.isOnCriticalPath) {
      categories.push('CRITICAL-PATH');
    }
    
    if (entry.weatherRisk === 'high') {
      categories.push('WEATHER-SENSITIVE');
    }
    
    if (entry.service.includes('W')) {
      categories.push('WASHING');
    }
    
    if (entry.service.includes('C')) {
      categories.push('CLEANING');
    }
    
    if (entry.service.includes('P')) {
      categories.push('PRESSURE-WASHING');
    }
    
    return categories;
  }
  
  /**
   * Create alarm reminders for critical events
   */
  private createAlarms(): string[] {
    return [
      'BEGIN:VALARM',
      'TRIGGER:-P1D', // 1 day before
      'REPEAT:1',
      'DURATION:PT15M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Critical path service starts tomorrow',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:PT0M', // At start time
      'ACTION:DISPLAY',
      'DESCRIPTION:Critical path service starts today',
      'END:VALARM'
    ];
  }
  
  /**
   * Format date for ICS (YYYYMMDD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('T')[0];
  }
  
  /**
   * Add days to date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
  
  /**
   * Escape text for ICS format
   */
  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '');
  }
  
  /**
   * Download ICS file
   */
  downloadICS(timeline: Timeline, projectInfo: ProjectInfo, includeWeekends: boolean = false): void {
    const icsContent = this.exportToICS(timeline, projectInfo, includeWeekends);
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-schedule.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }
  
  /**
   * Export to Google Calendar URL
   */
  exportToGoogleCalendar(entry: TimelineEntry, projectInfo: ProjectInfo): string {
    const serviceName = this.SERVICE_NAMES[entry.service] || entry.serviceName || entry.service;
    const title = encodeURIComponent(`${projectInfo.name} - ${serviceName}`);
    const details = encodeURIComponent(this.buildDescription(entry, projectInfo).replace(/\\n/g, '\n'));
    const location = encodeURIComponent(projectInfo.location || '');
    
    const startDate = this.formatDateForGoogle(entry.startDate);
    const endDate = this.formatDateForGoogle(this.addDays(entry.endDate, 1));
    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;
  }
  
  /**
   * Format date for Google Calendar (YYYYMMDD)
   */
  private formatDateForGoogle(date: Date): string {
    return this.formatDate(date);
  }
  
  /**
   * Export to Outlook Web URL
   */
  exportToOutlookWeb(entry: TimelineEntry, projectInfo: ProjectInfo): string {
    const serviceName = this.SERVICE_NAMES[entry.service] || entry.serviceName || entry.service;
    const subject = encodeURIComponent(`${projectInfo.name} - ${serviceName}`);
    const body = encodeURIComponent(this.buildDescription(entry, projectInfo).replace(/\\n/g, '\n'));
    const location = encodeURIComponent(projectInfo.location || '');
    
    const startTime = entry.startDate.toISOString();
    const endTime = this.addDays(entry.endDate, 1).toISOString();
    
    return `https://outlook.live.com/calendar/0/deeplink/compose?subject=${subject}&startdt=${startTime}&enddt=${endTime}&body=${body}&location=${location}`;
  }
  
  /**
   * Validate timeline before export
   */
  validateTimelineForExport(timeline: Timeline): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!timeline.entries || timeline.entries.length === 0) {
      errors.push('Timeline has no entries to export');
    }
    
    timeline.entries.forEach((entry, index) => {
      if (!entry.service) {
        errors.push(`Entry ${index + 1}: Missing service identifier`);
      }
      
      if (!entry.startDate || !entry.endDate) {
        errors.push(`Entry ${index + 1}: Missing start or end date`);
      }
      
      if (entry.startDate && entry.endDate && entry.startDate > entry.endDate) {
        errors.push(`Entry ${index + 1}: Start date is after end date`);
      }
      
      if (entry.duration <= 0) {
        errors.push(`Entry ${index + 1}: Invalid duration`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}