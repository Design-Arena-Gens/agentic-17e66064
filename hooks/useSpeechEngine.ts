'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResult = {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};

interface RecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

type RecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart: (() => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
};

type SpeechRecognitionConstructor = (new () => SpeechRecognitionLike) | undefined;

type ListenerPayload = {
  interimTranscript: string;
  isFinal: boolean;
};

type StartPayload = {
  onFinal: (transcript: string) => void | Promise<void>;
  onSegment?: (payload: ListenerPayload) => void;
};

export type SpeechStatus =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "unsupported"
  | "error";

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export function useSpeechEngine(language: string = "en-US") {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalHandlerRef = useRef<((transcript: string) => void) | null>(null);
  const segmentHandlerRef = useRef<((payload: ListenerPayload) => void) | null>(
    null
  );

  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionCtor = (window.SpeechRecognition ||
      window.webkitSpeechRecognition) as SpeechRecognitionConstructor;

    if (!SpeechRecognitionCtor) {
      setStatus("unsupported");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setStatus("listening");
      setError(null);
    };

    recognition.onerror = (event) => {
      setStatus("error");
      setError(event.error);
    };

    recognition.onend = () => {
      setStatus((prev) => (prev === "speaking" ? prev : "idle"));
    };

    recognition.onresult = (event) => {
      const { resultIndex, results } = event;
      const transcriptSegments: string[] = [];
      let finalTranscript = "";
      let isFinal = false;

      for (let i = resultIndex; i < results.length; i += 1) {
        const result = results[i];
        transcriptSegments.push(result[0].transcript.trim());
        if (result.isFinal) {
          finalTranscript += result[0].transcript.trim() + " ";
          isFinal = true;
        }
      }

      const interimTranscript = transcriptSegments.join(" ").trim();

      if (segmentHandlerRef.current) {
        segmentHandlerRef.current({ interimTranscript, isFinal });
      }

      if (isFinal && finalHandlerRef.current) {
        setStatus("processing");
        const outcome = finalHandlerRef.current(finalTranscript.trim());
        if (
          typeof outcome === "object" &&
          outcome !== null &&
          typeof (outcome as Promise<void>).then === "function"
        ) {
          (outcome as Promise<void>).catch(() => {
            setStatus("error");
          });
        }
      }
    };

    recognitionRef.current = recognition;
    setIsReady(true);

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [language]);

  const startListening = useCallback(
    ({ onFinal, onSegment }: StartPayload) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        return false;
      }

      finalHandlerRef.current = onFinal;
      segmentHandlerRef.current = onSegment ?? null;
      try {
        recognition.start();
        return true;
      } catch (startError) {
        setStatus("error");
        setError(
          startError instanceof Error ? startError.message : "Unable to start microphone."
        );
        return false;
      }
    },
    []
  );

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const speak = useCallback(async (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.05;
    utterance.rate = 1;
    utterance.volume = 1;

    setStatus("speaking");

    await new Promise<void>((resolve) => {
      utterance.onend = () => {
        resolve();
      };
      utterance.onerror = () => {
        resolve();
      };

      synth.speak(utterance);
    });

    setStatus("idle");
  }, []);

  const capabilities = useMemo(
    () => ({
      microphone: isReady,
      speechSynthesis: typeof window !== "undefined" && "speechSynthesis" in window
    }),
    [isReady]
  );

  return {
    status,
    error,
    capabilities,
    isReady,
    startListening,
    stopListening,
    speak
  };
}
