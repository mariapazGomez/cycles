import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from './AuthContext';

// Guía de primer uso de la atleta (CYC-192, diseño v3.1 «Tour móvil»): tres
// marcas sobre la interfaz real. Inicio (botón de la sesión), Calendario y
// Resumen (pestañas de la isla). El Asistente queda fuera mientras sea demo.
export const TOUR_STEPS = 3;
export type TourNode = React.ElementRef<typeof View>;
const TAB_ROUTES = ['Calendar', 'Today', 'Summary', 'Assistant'];

export interface TourAnchorInfo {
  ref: React.RefObject<TourNode | null>;
  // Radio del elemento: el halo lo copia (el ancho de un botón en píldora se recorta a su alto).
  radius: number;
  // Texto del elemento tal como se lee en pantalla, para nombrarlo en el globo.
  label?: string;
}

interface TourContextValue {
  // Si la marca debe dibujarse ahora: guía pendiente, en una pestaña y, en la
  // primera marca, solo sobre Inicio (ahí está el botón).
  visible: boolean;
  step: number;
  next: () => void;
  // «Saltar»: sale de la guía y no vuelve a salir (`skipped`).
  skip: () => void;
  // «Cómo usar Cycles»: la vuelve a pedir desde el principio.
  restart: () => void;
  register: (id: string, info: TourAnchorInfo) => () => void;
  getAnchor: (id: string) => TourAnchorInfo | undefined;
  // Cambia cuando se registra o retira un ancla, para que la capa vuelva a medir.
  anchorsVersion: number;
}

export const TourContext = createContext<TourContextValue | null>(null);

interface ProviderProps {
  children: React.ReactNode;
  // Nombre de la pantalla enfocada (la pestaña, o la pantalla de la pila).
  route: string | undefined;
  onGoToday: () => void;
}

export function TourProvider({ children, route, onGoToday }: ProviderProps) {
  const { user, status, welcome, setTourStatus } = useAuth();
  const [step, setStep] = useState(0);
  const [anchorsVersion, setAnchorsVersion] = useState(0);
  const anchors = useRef(new Map<string, TourAnchorInfo>());

  const pending = status === 'signedIn' && user?.role === 'athlete' && user.tourStatus === 'pending' && !welcome;
  const onTabs = route !== undefined && TAB_ROUTES.includes(route);
  const visible = pending && onTabs && (step !== 0 || route === 'Today');

  const finish = useCallback(() => {
    setStep(0);
    setTourStatus('completed');
  }, [setTourStatus]);

  const next = useCallback(() => {
    if (step >= TOUR_STEPS - 1) {
      finish();
    } else {
      setStep(step + 1);
    }
  }, [step, finish]);

  const skip = useCallback(() => {
    setStep(0);
    setTourStatus('skipped');
  }, [setTourStatus]);

  const restart = useCallback(() => {
    setStep(0);
    setTourStatus('pending');
    onGoToday();
  }, [setTourStatus, onGoToday]);

  // Las marcas 2 y 3 piden tocar la pestaña: avanzan al llegar a ella. La
  // primera avanza al abrir un ejercicio (la persona tocó el botón real).
  useEffect(() => {
    if (!pending) {
      return;
    }
    if (step === 0 && route === 'ExerciseLog') {
      setStep(1);
    } else if (step === 1 && route === 'Calendar') {
      setStep(2);
    } else if (step === 2 && route === 'Summary') {
      finish();
    }
  }, [pending, step, route, finish]);

  const register = useCallback((id: string, info: TourAnchorInfo) => {
    anchors.current.set(id, info);
    setAnchorsVersion(v => v + 1);
    return () => {
      if (anchors.current.get(id) === info) {
        anchors.current.delete(id);
        setAnchorsVersion(v => v + 1);
      }
    };
  }, []);

  const getAnchor = useCallback((id: string) => anchors.current.get(id), []);

  const value = useMemo(
    () => ({ visible, step, next, skip, restart, register, getAnchor, anchorsVersion }),
    [visible, step, next, skip, restart, register, getAnchor, anchorsVersion],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

// Quien no está dentro de un TourProvider (pruebas, pantallas sueltas) recibe null.
export function useTour(): TourContextValue | null {
  return useContext(TourContext);
}

// Registra un elemento como ancla de una marca. Se pone `ref` en una View con
// `collapsable={false}` que envuelva al elemento.
export function useTourAnchor(id: string, radius = 10, label?: string) {
  const ref = useRef<TourNode>(null);
  const register = useContext(TourContext)?.register;
  useEffect(() => (register ? register(id, { ref, radius, label }) : undefined), [register, id, radius, label]);
  return ref;
}
