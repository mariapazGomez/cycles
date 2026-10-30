import React, { useCallback, useRef, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TrainingCycle, TrainingSession } from '@cycles/shared';
import {
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../components/Icon';
import { Isotipo } from '../components/Logo';
import { PressableScale } from '../components/PressableScale';
import { ScreenHeader } from '../components/ScreenHeader';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from '../components/FloatingTabBar';
import type { AppStackParamList } from '../navigation/types';
import { QUICK_QUESTIONS, sendToAssistant, type ChatMessage, type CycleContext } from '../services/assistantApi';
import { fetchActiveCycles, fetchCycleSessions } from '../services/planApi';
import { firstPending, planWeekAt, totalWeeks } from '../utils/planCalendar';
import { colors } from '../theme/colors';

// Atajos: el asistente del atleta solo habla de su ciclo actual, de cómo se
// siente antes y después de entrenar y de su nivel de esfuerzo.
const QUICK = Object.values(QUICK_QUESTIONS);

let nextId = 0;
const newId = () => `m${Date.now()}-${nextId++}`;

// Conversación con el asistente. Hoy responde con un texto provisorio
// (services/assistantApi.ts); la pantalla ya maneja espera, error y reintento.
export function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [plan, setPlan] = useState<{ cycle: TrainingCycle; sessions: TrainingSession[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      fetchActiveCycles()
        .then(async cycles => {
          const cycle = cycles?.[0];
          if (!cycle) {
            return alive && setPlan(null);
          }
          const sessions = await fetchCycleSessions(cycle.id);
          if (alive) {
            setPlan({ cycle, sessions });
          }
        })
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );
  const next = plan ? firstPending(plan.sessions) : undefined;
  const week = plan ? Math.min(planWeekAt(plan.cycle.startDate, new Date()) || 1, totalWeeks(plan.cycle, plan.sessions)) : 0;
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);

  const cycleContext: CycleContext | null = plan
    ? {
        name: plan.cycle.name,
        week,
        weeks: totalWeeks(plan.cycle, plan.sessions),
        done: plan.sessions.filter(x => x.status !== 'pending').length,
        total: plan.sessions.length,
      }
    : null;
  const contextRef = useRef(cycleContext);
  contextRef.current = cycleContext;

  const ask = useCallback(async (history: ChatMessage[]) => {
    setWaiting(true);
    setFailed(false);
    try {
      const text = await sendToAssistant(history, contextRef.current);
      setMessages(prev => [...prev, { id: newId(), role: 'assistant', text }]);
    } catch {
      setFailed(true);
    } finally {
      setWaiting(false);
    }
  }, []);

  const send = (quick?: string) => {
    const text = (quick ?? draft).trim();
    if (!text || waiting) {
      return;
    }
    const next = [...messages, { id: newId(), role: 'user' as const, text }];
    setMessages(next);
    setDraft('');
    ask(next);
  };

  const canSend = draft.trim().length > 0 && !waiting;
  // La isla ocupa el borde inferior; con el teclado abierto se oculta.
  const bottomGap = insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 8;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <ScreenHeader title="Asistente" light />
        </View>
        {plan && (
          <PressableScale
            disabled={!next}
            onPress={() => next && navigation.navigate('SessionDetail', { sessionId: next.id })}
            accessibilityRole="button"
            accessibilityLabel={next ? `Ver la sesión ${next.name}` : plan.cycle.name}
            style={styles.ctx}>
            <View style={styles.ctxText}>
              <Text style={styles.ctxTitle} numberOfLines={1}>
                {next ? `Sigue: ${next.name}` : plan.cycle.name}
              </Text>
              <Text style={styles.ctxSub} numberOfLines={1}>
                {`${plan.cycle.name}, semana ${week} de ${totalWeeks(plan.cycle, plan.sessions)}`}
              </Text>
            </View>
            {next && <Text style={styles.ctxPill}>Ver</Text>}
          </PressableScale>
        )}
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={messages.length === 0 ? styles.emptyWrap : styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Isotipo size={44} />
            <Text style={styles.emptyTitle}>¿En qué te ayudo?</Text>
            <Text style={styles.emptyText}>Pregúntame por tu ciclo actual, cómo te sientes antes y después de entrenar y qué tan fuerte fue tu esfuerzo.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.mine : styles.theirs]}>
            <Text style={item.role === 'user' ? styles.mineText : styles.theirsText}>{item.text}</Text>
          </View>
        )}
        ListFooterComponent={
          <>
            {waiting && (
              <View style={[styles.bubble, styles.theirs]} accessibilityLabel="El asistente está escribiendo">
                <Text style={styles.theirsText}>…</Text>
              </View>
            )}
            {failed && (
              <View style={styles.errorRow}>
                <Text style={styles.errorText}>No pudimos obtener respuesta.</Text>
                <PressableScale onPress={() => ask(messages)} accessibilityRole="button">
                  <Text style={styles.retry}>Reintentar</Text>
                </PressableScale>
              </View>
            )}
          </>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.quickRow} contentContainerStyle={styles.quick}>
        {QUICK.map(q => (
          <PressableScale key={q} onPress={() => send(q)} disabled={waiting} accessibilityRole="button" style={styles.chip}>
            <Text style={styles.chipText}>{q}</Text>
          </PressableScale>
        ))}
      </ScrollView>
      <View style={[styles.composer, { paddingBottom: bottomGap }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Pregunta sobre tu ciclo"
          placeholderTextColor={colors.inkSecondary}
          multiline
          maxLength={1000}
          accessibilityLabel="Mensaje para el asistente"
        />
        <PressableScale
          onPress={() => send()}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          style={[styles.sendBtn, !canSend && styles.sendOff]}>
          <Icon name="send" size={20} color={colors.onBlue} />
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgApp },
  top: { backgroundColor: colors.ink, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, paddingBottom: 12 },
  header: { paddingHorizontal: 16 },
  ctx: { marginHorizontal: 14, backgroundColor: colors.inkTrack, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctxText: { flex: 1 },
  ctxTitle: { fontSize: 15, fontWeight: '700', color: colors.onBlue },
  ctxSub: { fontSize: 12, color: colors.inkMuted, marginTop: 1 },
  ctxPill: { backgroundColor: colors.brand, color: colors.onBlue, fontSize: 12, fontWeight: '700', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden' },
  quickRow: { flexGrow: 0 },
  quick: { paddingHorizontal: 14, paddingTop: 8, gap: 6 },
  chip: { backgroundColor: colors.bg, borderRadius: 16, borderWidth: 1, borderColor: colors.inkMuted, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.blue },
  list: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 4 },
  emptyText: { fontSize: 14, color: colors.inkSecondary, textAlign: 'center' },
  bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.blue, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.bg, borderBottomLeftRadius: 6 },
  mineText: { fontSize: 15, color: colors.onBlue },
  theirsText: { fontSize: 15, color: colors.ink },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  errorText: { fontSize: 13, color: colors.inkSecondary },
  retry: { fontSize: 13, fontWeight: '700', color: colors.blue },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: colors.ink,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  sendOff: { opacity: 0.4 },
});
