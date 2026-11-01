import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// true si la persona pidió reducir el movimiento en los ajustes del sistema.
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => alive && setReduce(value), () => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduce;
}
