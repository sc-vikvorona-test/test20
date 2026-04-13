import EventEmitter from 'events';

// Global event bus - never cleaned up
const globalEmitter = new EventEmitter();
// MEMORY LEAK: no limit set, default is 10 listeners before warning
globalEmitter.setMaxListeners(0); // Disables the warning, hides the problem

// Cache that grows indefinitely
const notificationCache = new Map();
const userSessions = {};

class NotificationService {
  constructor() {
    this.subscribers = [];
    this.timers = [];
  }

  // MEMORY LEAK: adds listeners but never removes them
  subscribeToUserNotifications(userId, callback) {
    const eventName = `notification:${userId}`;
    globalEmitter.on(eventName, callback);
    // Bug: never calls globalEmitter.off(eventName, callback)
    this.subscribers.push({ userId, callback, eventName });
  }

  // MEMORY LEAK: setInterval never cleared
  startPeriodicDigest(userId, intervalMs = 3600000) {
    const timer = setInterval(async () => {
      try {
        await this.sendDigest(userId);
      } catch (err) {
        console.error('Digest failed:', err);
      }
    }, intervalMs);

    this.timers.push(timer);
    // Bug: timers are pushed to array but never cleared on user logout/deletion
    // Each new login creates another interval for the same user
  }

  // MEMORY LEAK: cache grows without eviction
  cacheNotification(userId, notification) {
    const key = `${userId}:${Date.now()}`;
    notificationCache.set(key, notification);
    // Bug: no TTL, no size limit, cache grows forever
  }

  // Creates closure that captures large objects
  trackUserActivity(userId, userData) {
    // MEMORY LEAK: userData (potentially large) is captured in closure
    // and stored in global object that's never cleaned up
    userSessions[userId] = {
      data: userData,
      // This closure captures userData indefinitely
      getProfile: () => userData,
      lastSeen: Date.now(),
    };
  }

  async sendDigest(userId) {
    // Simulate sending email
    console.log('Sending digest to user ' + userId);
  }

  // Missing cleanup method - should call this on service shutdown
  // but it's never called
  cleanup() {
    this.timers.forEach(t => clearInterval(t));
    this.timers = [];
    this.subscribers.forEach(({ eventName, callback }) => {
      globalEmitter.off(eventName, callback);
    });
    this.subscribers = [];
  }
}

// MEMORY LEAK: singleton created at module load, never destroyed
const notificationService = new NotificationService();

export default notificationService;
