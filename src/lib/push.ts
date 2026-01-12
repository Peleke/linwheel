import webpush from "web-push";

// VAPID keys should be in environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@linwheel.com";

// Configure web-push with VAPID details
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Send a push notification to a subscription
 */
export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: PushPayload
): Promise<{ success: boolean; error?: string }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[Push] VAPID keys not configured, skipping notification");
    return { success: false, error: "Push notifications not configured" };
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload)
    );

    return { success: true };
  } catch (error) {
    console.error("[Push] Failed to send notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send a content reminder notification
 */
export async function sendContentReminder(
  subscription: PushSubscriptionData,
  content: {
    type: "post" | "article";
    title: string;
    scheduledAt: Date;
    contentId: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const timeStr = content.scheduledAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return sendPushNotification(subscription, {
    title: `Time to post: ${content.type === "post" ? "LinkedIn Post" : "Article"}`,
    body: `"${content.title.slice(0, 50)}${content.title.length > 50 ? "..." : ""}" is scheduled for ${timeStr}`,
    icon: "/logo.png",
    badge: "/badge.png",
    url: `/dashboard`,
    data: {
      contentType: content.type,
      contentId: content.contentId,
      action: "post_reminder",
    },
  });
}

/**
 * Send a "post published" notification
 */
export async function sendPostPublishedNotification(
  subscription: PushSubscriptionData,
  content: {
    title: string;
    postUrl: string;
    contentId: string;
  }
): Promise<{ success: boolean; error?: string }> {
  return sendPushNotification(subscription, {
    title: "Post Published!",
    body: `"${content.title.slice(0, 50)}${content.title.length > 50 ? "..." : ""}" is now live on LinkedIn`,
    icon: "/logo.png",
    badge: "/badge.png",
    url: content.postUrl,
    data: {
      contentType: "post",
      contentId: content.contentId,
      action: "post_published",
    },
  });
}

/**
 * Get the public VAPID key for client-side subscription
 */
export function getVapidPublicKey(): string | null {
  return VAPID_PUBLIC_KEY || null;
}

/**
 * Generate new VAPID keys (run once, store in env)
 * Usage: npx tsx -e "console.log(require('web-push').generateVAPIDKeys())"
 */
export function generateVapidKeys() {
  return webpush.generateVAPIDKeys();
}
