import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type ContentBlockLike = {
  type?: string;
  text?: string;
};

type MessageLike = {
  role?: string;
  content?: ContentBlockLike[];
};

type AssistantMessageLike = MessageLike & {
  stopReason?: string;
  errorMessage?: string;
};

type SessionMessageEntryLike = {
  type?: string;
  message?: MessageLike;
};

function windowsToastScript(title: string, body: string): string {
  const safeTitle = title.replace(/'/g, "''");
  const safeBody = body.replace(/'/g, "''");
  const type = "Windows.UI.Notifications";
  const mgr = `[${type}.ToastNotificationManager, ${type}, ContentType = WindowsRuntime]`;
  const template = `[${type}.ToastTemplateType]::ToastText02`;
  const toast = `[${type}.ToastNotification]::new($xml)`;

  return [
    `${mgr} | Out-Null`,
    `$xml = [${type}.ToastNotificationManager]::GetTemplateContent(${template})`,
    `$texts = @($xml.GetElementsByTagName('text'))`,
    `$texts[0].AppendChild($xml.CreateTextNode('${safeTitle}')) | Out-Null`,
    `$texts[1].AppendChild($xml.CreateTextNode('${safeBody}')) | Out-Null`,
    `$toast = ${toast}`,
    `$toast.ExpirationTime = [DateTimeOffset]::Now.AddSeconds(8)`,
    `[${type}.ToastNotificationManager]::CreateToastNotifier('pi-agent').Show($toast)`,
  ].join("; ");
}

function notifyOSC777(title: string, body: string): void {
  process.stdout.write(`\x1b]777;notify;${title};${body}\x07`);
}

function notifyOSC99(title: string, body: string): void {
  process.stdout.write(`\x1b]99;i=1:d=0;${title}\x1b\\`);
  process.stdout.write(`\x1b]99;i=1:p=body;${body}\x1b\\`);
}

function notifyWindows(title: string, body: string): void {
  const { execFile } = require("node:child_process") as typeof import("node:child_process");
  execFile("powershell.exe", ["-NoProfile", "-Command", windowsToastScript(title, body)]);
}

function notify(title: string, body: string): void {
  if (process.platform === "win32") {
    notifyWindows(title, body);
    return;
  }

  if (process.env.KITTY_WINDOW_ID) {
    notifyOSC99(title, body);
    return;
  }

  notifyOSC777(title, body);
}

function getLastAssistantMessage(messages: unknown[]): AssistantMessageLike | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i] as AssistantMessageLike | undefined;
    if (message?.role === "assistant") return message;
  }

  return undefined;
}

function getMessageText(message?: MessageLike): string {
  if (!message?.content) return "";

  return message.content
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text!.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function toConversationTopic(text: string): string | undefined {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return undefined;
  if (normalized.length <= 60) return normalized;
  return `${normalized.slice(0, 57).trimEnd()}…`;
}

function getConversationTopicFromSession(entries: unknown[]): string | undefined {
  for (const raw of entries) {
    const entry = raw as SessionMessageEntryLike | undefined;
    if (entry?.type !== "message") continue;
    if (entry.message?.role !== "user") continue;

    const text = getMessageText(entry.message);
    const topic = toConversationTopic(text);
    if (topic) return topic;
  }

  return undefined;
}

function classifyState(message?: AssistantMessageLike): string | undefined {
  if (!message) return "done";
  if (message.stopReason === "toolUse") return undefined;
  if (message.stopReason === "error") return "error";
  if (message.stopReason === "aborted") return undefined;
  if (message.stopReason === "length") return "truncated";
  if (message.stopReason && message.stopReason !== "stop") return undefined;

  const text = getMessageText(message);
  if (!text) return "done";

  if (
    /\?\s*$/.test(text) ||
    /\b(let me know|what should|which should|would you like|want me to|can you|could you|should i|please provide|need your input|waiting for your confirmation)\b/i.test(text)
  ) {
    return "wants input";
  }

  return "responded";
}

export default function (pi: ExtensionAPI) {
  pi.on("agent_end", async (event, ctx) => {
    if (process.env.PI_SUBAGENT_CHILD === "1") return;
    if (ctx.mode !== "tui") return;
    if (ctx.hasPendingMessages()) return;

    const messages = event.messages as unknown[];
    const lastAssistant = getLastAssistantMessage(messages);
    const state = classifyState(lastAssistant);
    if (!state) return;

    const topic = getConversationTopicFromSession(ctx.sessionManager.getBranch()) ?? "finished";
    notify(`pi: ${topic}`, state);
  });
}
