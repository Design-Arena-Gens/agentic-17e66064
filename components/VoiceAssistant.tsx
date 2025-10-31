'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { generateResponse } from "@/lib/assistant";
import { useSpeechEngine } from "@/hooks/useSpeechEngine";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};

const INITIAL_PROMPT: Message = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi, I'm Aurora. Tap the glowing ring or type to begin. I can help with quick check-ins, reflective prompts, and a bit of motivation.",
  timestamp: Date.now()
};

export function VoiceAssistant() {
  const {
    status,
    error,
    capabilities,
    startListening,
    stopListening,
    speak
  } = useSpeechEngine("en-US");

  const [messages, setMessages] = useState<Message[]>([INITIAL_PROMPT]);
  const [draft, setDraft] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  const isListening = status === "listening";

  useEffect(() => {
    if (!autoScroll) {
      return;
    }

    const container = scrollRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, interimTranscript, autoScroll]);

  const timestampLabel = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  }, []);

  const pushMessage = useCallback((role: Message["role"], content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${role}-${prev.length}-${Date.now()}`,
        role,
        content,
        timestamp: Date.now()
      }
    ]);
  }, []);

  const handleResponse = useCallback(
    async (text: string) => {
      const output = generateResponse(text);
      const combined =
        output.followUp && output.followUp.trim().length > 0
          ? `${output.text}\n\n${output.followUp}`
          : output.text;

      setIsThinking(true);

      // Add a gentle pause to mimic natural processing.
      await new Promise((resolve) => setTimeout(resolve, 350));

      pushMessage("assistant", combined);
      await speak(combined);
      setIsThinking(false);
    },
    [pushMessage, speak]
  );

  const handleUserTurn = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) {
        return;
      }

      pushMessage("user", trimmed);
      setDraft("");
      await handleResponse(trimmed);
    },
    [handleResponse, pushMessage]
  );

  const handleFormSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handleUserTurn(draft);
    },
    [draft, handleUserTurn]
  );

  const toggleListening = useCallback(() => {
    if (!capabilities.microphone) {
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    startListening({
      onFinal: async (transcript) => {
        setInterimTranscript("");
        if (transcript.trim()) {
          await handleUserTurn(transcript);
        }
      },
      onSegment: ({ interimTranscript: interim }) => {
        setInterimTranscript(interim);
      }
    });
  }, [capabilities.microphone, handleUserTurn, isListening, startListening, stopListening]);

  const assistantState = useMemo(() => {
    if (error) {
      return {
        label: "Microphone error",
        detail: error
      };
    }

    switch (status) {
      case "unsupported":
        return {
          label: "Voice unavailable",
          detail: "Your browser does not offer speech recognition."
        };
      case "listening":
        return {
          label: "Listening...",
          detail: "Speak naturally. I will pause when you stop."
        };
      case "processing":
        return {
          label: "Thinking...",
          detail: "Reflecting on what I just heard."
        };
      case "speaking":
        return {
          label: "Speaking...",
          detail: "Sharing my response."
        };
      case "error":
        return {
          label: "Something went wrong",
          detail: "Try again or type your request."
        };
      default:
        return {
          label: "Ready",
          detail: "Tap the ring or type to start."
        };
    }
  }, [error, status]);

  return (
    <div className="min-h-screen w-full px-6 py-16 md:px-12">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 md:grid md:grid-cols-[7fr,5fr]">
        <section className="flex h-full flex-col rounded-3xl bg-surface/70 p-6 shadow-[0_35px_120px_rgba(60,35,150,0.35)] backdrop-blur-xl ring-1 ring-white/5">
          <header className="flex flex-col gap-2 border-b border-white/10 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold md:text-3xl">Aurora</h1>
              <p className="text-sm text-white/60 md:text-base">
                Your ambient voice assistant. Seamless, soothing, always present.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-white/70">
              {assistantState.label}
            </div>
          </header>

          <div className="relative mt-6 flex h-full flex-1 flex-col overflow-hidden rounded-2xl bg-background-alt/80 ring-1 ring-white/5">
            <div
              ref={scrollRef}
              className="flex-1 space-y-4 overflow-y-auto px-5 py-6 text-sm md:text-base"
            >
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={clsx("flex flex-col gap-2", {
                    "items-end": message.role === "user",
                    "items-start": message.role === "assistant"
                  })}
                >
                  <span
                    className={clsx(
                      "max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 shadow-lg shadow-black/30",
                      message.role === "user"
                        ? "bg-accent text-white"
                        : "bg-surface-alt text-white/90"
                    )}
                  >
                    {message.content}
                  </span>
                  <span className="text-[0.7rem] uppercase tracking-[0.15em] text-white/40">
                    {message.role === "user" ? "You" : "Aurora"} - {timestampLabel(message.timestamp)}
                  </span>
                </motion.div>
              ))}

              <AnimatePresence>
                {(interimTranscript || isThinking) && (
                  <motion.div
                    key="interim"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-start gap-2"
                  >
                    <span className="max-w-[80%] rounded-2xl bg-surface-alt/80 px-4 py-3 text-white/70 ring-1 ring-white/10">
                      {interimTranscript || "..."}
                    </span>
                    <span className="text-[0.7rem] uppercase tracking-[0.15em] text-white/30">
                      {isThinking ? "Aurora is thinking" : "Listening"}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <footer className="border-t border-white/10 bg-background-alt/40 px-5 py-4">
              <form className="flex items-center gap-3" onSubmit={handleFormSubmit}>
                <div className="relative flex-1">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={'Type anything... "Give me a mindful prompt" or "What\'s the time?"'}
                    rows={1}
                    className="h-12 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/60"
                    onFocus={() => setAutoScroll(true)}
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-accent px-5 text-sm font-medium text-white shadow-lg shadow-accent/40 transition hover:bg-accent-strong focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:cursor-not-allowed disabled:bg-white/10"
                  disabled={!draft.trim() || isThinking}
                >
                  Send
                </button>
              </form>
            </footer>
          </div>
        </section>

        <aside className="flex flex-col gap-6 rounded-3xl bg-surface/60 p-6 shadow-[0_30px_100px_rgba(30,20,60,0.35)] backdrop-blur-xl ring-1 ring-white/5">
          <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-white/10 via-white/5 to-white/5 px-6 py-10 text-center">
            <div className="relative flex h-36 w-36 items-center justify-center">
              <motion.div
                animate={{
                  scale: isListening ? [1, 1.1, 1] : 1,
                  opacity: isListening ? [0.7, 1, 0.7] : 0.7
                }}
                transition={{
                  duration: 1.8,
                  repeat: isListening ? Infinity : 0
                }}
                className={clsx(
                  "absolute inset-0 rounded-full blur-md",
                  isListening ? "bg-accent/50" : "bg-white/10"
                )}
              />
              <button
                type="button"
                onClick={toggleListening}
                className={clsx(
                  "relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/20 text-white shadow-[0_20px_45px_rgba(100,75,255,0.55)] transition",
                  isListening ? "bg-accent" : "bg-surface-alt hover:border-accent/70 hover:text-accent-soft"
                )}
                aria-label={isListening ? "Stop listening" : "Start listening"}
              >
                <span className="text-xl font-semibold">
                  {isListening ? "Stop" : "Talk"}
                </span>
              </button>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Voice capture</h2>
              <p className="text-sm text-white/70">
                {assistantState.detail}
              </p>
            </div>
            {!capabilities.microphone && (
              <p className="text-xs text-red-300">
                Microphone access is unavailable. Please use the text box or enable voice in your browser settings.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-background-alt/80 p-5 text-sm leading-relaxed text-white/80">
            <h3 className="mb-4 text-base font-semibold text-white">What can I do?</h3>
            <ul className="space-y-3 text-sm">
              <li className="rounded-xl bg-white/5 px-4 py-3">
                &quot;What time is it?&quot; - I keep you synced with the present moment.
              </li>
              <li className="rounded-xl bg-white/5 px-4 py-3">
                &quot;Share a motivation boost.&quot; - I offer gentle encouragement when you need it.
              </li>
              <li className="rounded-xl bg-white/5 px-4 py-3">
                &quot;Tell me something curious.&quot; - Unlock a quick fun fact to spark your mind.
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/5 bg-background-alt/60 p-5 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Auto-scroll</span>
              <button
                type="button"
                onClick={() => setAutoScroll((prev) => !prev)}
                className={clsx(
                  "relative h-8 w-14 rounded-full transition",
                  autoScroll ? "bg-accent" : "bg-white/10"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-1 h-6 w-6 rounded-full bg-white transition",
                    autoScroll ? "left-7" : "left-1"
                  )}
                />
              </button>
            </div>
            <p className="mt-3 text-xs text-white/50">
              When enabled, the conversation will stay pinned to the latest exchange.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}
