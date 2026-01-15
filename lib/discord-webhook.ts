export async function sendDiscordWebhook(
  url: string,
  payload: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        success: false,
        error: `Discord API error: ${response.status} ${text}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Unknown error" };
  }
}
