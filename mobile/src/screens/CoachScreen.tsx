import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View, StyleSheet } from "react-native";
import { ScreenShell, Button } from "../components/ui";
import { colors, radii } from "../theme/tokens";
import { apiFetch } from "../lib/api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_REPLIES = ["It's about stress", "I want to smoke anyway", "I feel fine now"];
const DISCLAIMER = "I'm an AI coach — here to support you, not to replace medical advice.";
const OPENING_MESSAGE = "Hey, I'm here. What's going on right now?";

// Matches webapp/app/(tabs)/coach/page.tsx exactly (DECISIONS.md
// D-011/D-012) — rule-based, NOT a real LLM call (see backend's
// ai-coach.service.ts). No longer a bottom-nav tab; reached from Relapse
// Flow and Profile's Help & Support section.
export default function CoachScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Coach">) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    apiFetch<Message[]>("/ai-coach").then((res) => {
      if (res.ok && res.data.length > 0) setMessages(res.data);
      else setMessages([{ id: "opening", role: "assistant", content: OPENING_MESSAGE }]);
    });
  }, []);

  async function send(text: string) {
    if (!text.trim() || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { id: `local-${Date.now()}`, role: "user", content: text }]);
    const res = await apiFetch<Message>("/ai-coach", { method: "POST", body: { content: text } });
    setSending(false);
    if (res.ok) {
      setMessages((m) => [...m, res.data]);
    } else {
      setMessages((m) => [...m, { id: "error", role: "assistant", content: "Coach is having trouble connecting. Try the breathing exercise instead?" }]);
    }
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScreenShell>
        <Text style={styles.title}>AI Coach</Text>
        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>

        <ScrollView ref={scrollRef} style={{ flex: 1, marginTop: 12 }} contentContainerStyle={{ gap: 10 }} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.map((m) => (
            <View key={m.id} style={[styles.bubbleRow, { justifyContent: m.role === "user" ? "flex-end" : "flex-start" }]}>
              <View style={[styles.bubble, m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant]}>
                <Text style={{ color: m.role === "user" ? "#fff" : colors.ink900, fontSize: 14 }}>{m.content}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
          {QUICK_REPLIES.map((q) => (
            <Pressable key={q} onPress={() => send(q)} style={styles.quickReply}>
              <Text style={styles.quickReplyText}>{q}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            placeholder="Type a message…"
            placeholderTextColor={colors.ink300}
            style={styles.input}
          />
          <Button variant="redirect" style={{ width: "auto", paddingHorizontal: 20, height: 44 }} onPress={() => send(input)}>
            Send
          </Button>
        </View>

        <View style={styles.footerLinks}>
          <Pressable
            onPress={async () => {
              const res = await apiFetch<{ id: string }>("/craving-sessions", { method: "POST" });
              if (res.ok) navigation.navigate("SmokingRoom", { cravingSessionId: res.data.id });
            }}
          >
            <Text style={styles.footerLink}>Go to Smoking Room instead</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Relapse", {})}>
            <Text style={[styles.footerLink, { color: colors.ink600 }]}>I already smoked</Text>
          </Pressable>
        </View>
      </ScreenShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700", color: colors.ink900 },
  disclaimer: { fontSize: 11, color: colors.ink300, marginTop: 2 },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: "80%", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: { backgroundColor: colors.redirect600 },
  bubbleAssistant: { backgroundColor: colors.surface0, borderWidth: 1, borderColor: colors.line200 },
  quickReply: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, paddingHorizontal: 12, paddingVertical: 6 },
  quickReplyText: { fontSize: 12, fontWeight: "600", color: colors.ink600 },
  inputRow: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  input: { flex: 1, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.line200, backgroundColor: colors.surface0, paddingHorizontal: 16, paddingVertical: 10, color: colors.ink900, fontSize: 14 },
  footerLinks: { flexDirection: "row", gap: 16, marginTop: 12 },
  footerLink: { fontSize: 12, fontWeight: "600", color: colors.redirect600, textDecorationLine: "underline" },
});
