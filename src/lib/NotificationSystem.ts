export interface NotificationSettings {
  maxEngagementPerDay: number;
  quietHoursStart: number; // 0-23
  quietHoursEnd: number; // 0-23
}

export interface ActivityLog {
  timestamp: number;
  hour: number;
}

export class NotificationSystem {
  private static STORAGE_KEY = 'iluv_notification_state';
  private static ACTIVITY_KEY = 'iluv_user_activity';
  
  private static settings: NotificationSettings = {
    maxEngagementPerDay: 3,
    quietHoursStart: 22, // 10 PM
    quietHoursEnd: 8,    // 8 AM
  };

  /**
   * Request notification permission from the user
   */
  static async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  /**
   * Track user activity to determine active hours
   */
  static logActivity() {
    try {
      const now = new Date();
      const logs: ActivityLog[] = JSON.parse(localStorage.getItem(this.ACTIVITY_KEY) || '[]');
      
      // Add current activity
      logs.push({
        timestamp: now.getTime(),
        hour: now.getHours()
      });

      // Keep only last 7 days of activity to learn patterns dynamically
      const sevenDaysAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
      const recentLogs = logs.filter(log => log.timestamp > sevenDaysAgo);
      
      localStorage.setItem(this.ACTIVITY_KEY, JSON.stringify(recentLogs));
    } catch (e) {
      console.warn("Failed to log activity", e);
    }
  }

  /**
   * Get the user's most active hours based on recent usage history
   */
  static getActiveHours(): number[] {
    try {
      const logs: ActivityLog[] = JSON.parse(localStorage.getItem(this.ACTIVITY_KEY) || '[]');
      if (logs.length === 0) return [10, 14, 18]; // Default active hours fallback

      const hourCounts: Record<number, number> = {};
      logs.forEach(log => {
        hourCounts[log.hour] = (hourCounts[log.hour] || 0) + 1;
      });

      // Sort hours by frequency
      const sortedHours = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([hour]) => parseInt(hour));

      return sortedHours.slice(0, 3); // Top 3 most active hours
    } catch (e) {
      return [10, 14, 18];
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  static isQuietHour(date: Date = new Date()): boolean {
    const hour = date.getHours();
    const { quietHoursStart, quietHoursEnd } = this.settings;
    
    if (quietHoursStart > quietHoursEnd) {
      // e.g., 22 PM to 8 AM
      return hour >= quietHoursStart || hour < quietHoursEnd;
    } else {
      // e.g., 1 AM to 5 AM
      return hour >= quietHoursStart && hour < quietHoursEnd;
    }
  }

  /**
   * Trigger an IMMEDIATE transactional notification (e.g. task completed)
   * Transactional notifications bypass active hours & limits, but we can still respect quiet hours if desired,
   * though true transactional usually sends immediately. Here we send it immediately regardless.
   */
  static sendSuccessNotification(title: string, body: string) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    
    // Only send if tab is hidden (to prevent duplicate noise when actively looking at the app)
    if (document.visibilityState === "visible") return;

    // Deduplication check
    if (this.isDuplicateNotification(title + body)) return;

    new Notification(title, { 
      body, 
      icon: '/vite.svg',
      tag: 'transactional_success' 
    });
    
    this.recordNotificationSent(title + body);
  }

  /**
   * Evaluates if we should send an engagement notification based on learned patterns.
   * Call this periodically (e.g., via a Service Worker or background interval).
   */
  static checkAndSendEngagementNotification() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();
    
    // 1. Respect Quiet Hours
    if (this.isQuietHour(now)) return;

    // 2. Check Daily Limits
    if (this.getEngagementCountToday() >= this.settings.maxEngagementPerDay) return;

    // 3. Are we in the user's active hour right now?
    const activeHours = this.getActiveHours();
    if (!activeHours.includes(now.getHours())) return;

    // 4. Have we already sent one in this hour?
    const lastSentHour = this.getLastEngagementHour();
    if (lastSentHour === now.getHours()) return;

    // 5. Select personalized message
    const message = this.getRandomEngagementMessage();
    
    // Send it
    new Notification("iluv Intelligence", {
      body: message,
      icon: '/vite.svg',
      tag: 'engagement'
    });

    this.recordEngagementSent(now.getHours());
  }

  /* --- Internal Helpers --- */

  private static isDuplicateNotification(contentHash: string): boolean {
    try {
      const state = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      const recent: string[] = state.recentHashes || [];
      if (recent.includes(contentHash)) return true;
      return false;
    } catch {
      return false;
    }
  }

  private static recordNotificationSent(contentHash: string) {
    try {
      const state = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      let recent: string[] = state.recentHashes || [];
      recent.push(contentHash);
      if (recent.length > 20) recent = recent.slice(-20); // Keep last 20
      state.recentHashes = recent;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch(e) {}
  }

  private static getEngagementCountToday(): number {
    try {
      const state = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      const today = new Date().toDateString();
      if (state.engagementDate !== today) return 0;
      return state.engagementCount || 0;
    } catch {
      return 0;
    }
  }

  private static getLastEngagementHour(): number {
    try {
      const state = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      const today = new Date().toDateString();
      if (state.engagementDate !== today) return -1;
      return state.lastEngagementHour ?? -1;
    } catch {
      return -1;
    }
  }

  private static recordEngagementSent(hour: number) {
    try {
      const state = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      const today = new Date().toDateString();
      
      if (state.engagementDate !== today) {
        state.engagementDate = today;
        state.engagementCount = 0;
      }
      
      state.engagementCount++;
      state.lastEngagementHour = hour;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch(e) {}
  }

  private static getRandomEngagementMessage(): string {
    const messages = [
      "Ready to explore new ideas? Your next session awaits.",
      "Just checking in. Keep building your knowledge architecture.",
      "A quick reminder to review your recent insights.",
      "Your intelligence archive is ready when you are."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}
