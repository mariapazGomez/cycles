import notifee, { AlarmType, AndroidImportance, TriggerType } from 'react-native-notify-kit';

const CHANNEL_ID = 'rest-timer';
const NOTIFICATION_ID = 'rest-timer-end';

// Pide el permiso de notificaciones. Se llama al iniciar un descanso, con la
// app abierta, porque en segundo plano ya no se puede mostrar el diálogo.
// Si la persona lo rechaza, el descanso sigue funcionando sin aviso externo.
export async function requestRestPermission(): Promise<void> {
  try {
    await notifee.requestPermission();
  } catch {
    // Best-effort.
  }
}

// Agenda el aviso de fin de descanso en el propio teléfono: lo dispara el
// sistema aunque la app esté minimizada o cerrada, sin internet ni servidor.
// En Android usa una alarma de reloj (exacta y sin permiso especial).
export async function scheduleRestEnd(endsAt: number): Promise<void> {
  try {
    const channelId = await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Fin del descanso',
      importance: AndroidImportance.HIGH,
      vibration: true,
    });
    await notifee.createTriggerNotification(
      {
        id: NOTIFICATION_ID,
        title: 'Descanso terminado',
        body: 'Es hora de tu siguiente serie.',
        android: { channelId, pressAction: { id: 'default' } },
        ios: { sound: 'default', foregroundPresentationOptions: { banner: false, list: false, badge: false, sound: false } },
      },
      {
        type: TriggerType.TIMESTAMP,
        timestamp: endsAt,
        alarmManager: { type: AlarmType.SET_ALARM_CLOCK },
      },
    );
  } catch {
    // Best-effort: sin el aviso, el temporizador se retoma igual al volver a la app.
  }
}

export async function cancelRestEnd(): Promise<void> {
  try {
    await notifee.cancelTriggerNotification(NOTIFICATION_ID);
  } catch {
    // Best-effort.
  }
}
