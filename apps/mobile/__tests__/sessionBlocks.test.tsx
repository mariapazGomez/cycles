import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Circle } from 'react-native-svg';
import type { SessionWorkBlock } from '@cycles/shared';
import { BlockSection } from '../src/components/session/BlockSection';
import { sectionProgress, sessionSections } from '../src/utils/sessionBlocks';

const { todaySessionFixture } = require('../../../packages/shared/src/fixtures/todaySession');
const { sessionWorkBlockFixture } = require('../../../packages/shared/src/fixtures/workBlocks');

const block = (id: string, orderIndex: number, over: Partial<SessionWorkBlock> = {}): SessionWorkBlock => ({
  id, sessionId: 's1', name: `Bloque ${id}`, type: 'strength', color: null, orderIndex, note: null, ...over,
});
const ex = (id: string, orderIndex: number, blockId: string | null, targetSets = 3, logged = 0) => ({
  id, orderIndex, blockId, targetSets, logs: Array.from({ length: logged }, (_, i) => ({ id: `${id}-${i}` })),
});

describe('sessionSections', () => {
  test('sin bloques, o con todos los ejercicios sueltos, no agrupa: la sesión se ve como siempre', () => {
    expect(sessionSections(undefined, [ex('a', 1, null)])).toBeNull();
    expect(sessionSections([], [ex('a', 1, null)])).toBeNull();
    expect(sessionSections([block('b1', 1)], [ex('a', 1, null)])).toBeNull();
    expect(sessionSections([block('b1', 1)], [])).toBeNull();
  });

  test('agrupa en el orden de los bloques, numera de corrido y deja los sueltos al final', () => {
    const sections = sessionSections(
      [block('b2', 2), block('b1', 1)],
      [ex('x', 3, 'b2'), ex('y', 1, 'b1'), ex('z', 2, 'b1'), ex('s', 9, null)],
    )!;
    expect(sections.map(s => s.key)).toEqual(['b1', 'b2', 'sueltos-2']);
    expect(sections.flatMap(s => s.items.map(i => `${i.exercise.id}:${i.index}`))).toEqual(['y:0', 'z:1', 'x:2', 's:3']);
    expect(sections[2].block).toBeNull();
  });

  test('los sueltos quedan donde los dejó el coach: al inicio, entre bloques o al final', () => {
    const blocks = [block('b1', 1), block('b2', 2)];
    const keysOf = (exercises: ReturnType<typeof ex>[]) => sessionSections(blocks, exercises)!.map(s => s.key);
    expect(keysOf([ex('s', 1, null), ex('a', 2, 'b1'), ex('b', 3, 'b2')])).toEqual(['sueltos-0', 'b1', 'b2']);
    expect(keysOf([ex('a', 1, 'b1'), ex('s', 2, null), ex('b', 3, 'b2')])).toEqual(['b1', 'sueltos-1', 'b2']);
    expect(keysOf([ex('a', 1, 'b1'), ex('b', 2, 'b2'), ex('s', 3, null)])).toEqual(['b1', 'b2', 'sueltos-2']);
    const mixed = sessionSections(blocks, [ex('a', 1, 'b1'), ex('s', 2, null), ex('t', 3, null), ex('b', 4, 'b2')])!;
    expect(mixed[1].items.map(i => `${i.exercise.id}:${i.index}`)).toEqual(['s:1', 't:2']);
    expect(mixed[2].items.map(i => `${i.exercise.id}:${i.index}`)).toEqual(['b:3']);
  });

  test('el primer bloque con algo pendiente es el que sigue y se abre solo; los hechos y los demás, plegados', () => {
    const sections = sessionSections(
      [block('b1', 1), block('b2', 2), block('b3', 3)],
      [ex('a', 1, 'b1', 2, 2), ex('b', 2, 'b2', 3, 1), ex('c', 3, 'b3', 3, 0)],
    )!;
    expect(sections.map(s => s.state)).toEqual(['done', 'current', 'pending']);
    expect(sections.map(s => s.defaultOpen)).toEqual([false, true, false]);
  });

  test('con todo hecho ningún bloque está en curso; los ejercicios sueltos siempre van abiertos', () => {
    const sections = sessionSections([block('b1', 1)], [ex('a', 1, 'b1', 2, 2), ex('s', 2, null, 2, 0)])!;
    expect(sections[0]).toMatchObject({ state: 'done', defaultOpen: false });
    expect(sections[1]).toMatchObject({ block: null, defaultOpen: true });
  });

  test('cuenta ejercicios hechos y series registradas (sin pasarse del objetivo)', () => {
    const [section] = sessionSections([block('b1', 1)], [ex('a', 1, 'b1', 3, 3), ex('b', 2, 'b1', 3, 1), ex('c', 3, 'b1', 2, 5)])!;
    expect(section).toMatchObject({ total: 3, doneCount: 2, loggedSets: 3 + 1 + 2, plannedSets: 8 });
    expect(sectionProgress(section)).toBe('2 de 3');
    expect(sectionProgress({ doneCount: 3, total: 3 })).toBe('Hecho');
  });

  test('un bloque sin ejercicios no se muestra', () => {
    const sections = sessionSections([block('b1', 1), block('vacio', 2)], [ex('a', 1, 'b1')])!;
    expect(sections.map(s => s.key)).toEqual(['b1']);
  });

  test('un bloque que ya no existe deja sus ejercicios como sueltos, sin romperse', () => {
    const sections = sessionSections([block('b1', 1)], [ex('a', 1, 'b1'), ex('b', 2, 'borrado')])!;
    expect(sections.map(s => s.key)).toEqual(['b1', 'sueltos-1']);
  });

  test('contrato: el bloque de ejemplo de la API (fixture compartido) se agrupa sin errores', () => {
    const sections = sessionSections([sessionWorkBlockFixture], [ex('a', 1, 'blk-1')])!;
    expect(sections[0].block).toMatchObject({ id: 'blk-1', type: 'warmup', name: 'Calentamiento' });
  });
});

describe('contrato con GET /me/today', () => {
  test('la sesión mixta de la API (un bloque y un ejercicio suelto) se agrupa en ese orden', () => {
    const { blocks, sessionExercises } = todaySessionFixture.session;
    const sections = sessionSections(blocks, sessionExercises)!;
    expect(sections.map(s => s.key)).toEqual(['blk-1', 'sueltos-1']);
  });
});

describe('BlockSection', () => {
  const sectionFor = (over = {}) => {
    const [section] = sessionSections([block('b1', 1, { name: 'Calentamiento', type: 'warmup' })], [ex('a', 1, 'b1', 2, 2), ex('b', 2, 'b1', 4, 0)])!;
    return { ...section, ...over };
  };
  const mount = (props: Partial<React.ComponentProps<typeof BlockSection>> = {}) => {
    const onToggle = jest.fn();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(
        <BlockSection section={sectionFor()} open onToggle={onToggle} {...props}>
          <Cuerpo />
        </BlockSection>,
      );
    });
    return { tree, onToggle };
  };
  const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
    tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);
  function Cuerpo() {
    return <></>;
  }

  test('muestra nombre, resumen y progreso en palabras, con la perla de su tipo', () => {
    const { tree } = mount();
    const t = texts(tree);
    expect(t).toContain('Calentamiento');
    expect(t).toContain('2 ejercicios, 6 series');
    expect(t).toContain('1 de 2');
    expect(tree.root.findAllByType(Circle as never).length).toBeGreaterThan(0);
  });

  test('el encabezado se toca para plegar y abrir, y dice su estado al lector de pantalla', () => {
    const { tree, onToggle } = mount({ open: false });
    const button = tree.root.find(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function');
    expect(button.props.accessibilityLabel).toContain('Calentamiento, 2 ejercicios, 6 series, 1 de 2. Abrir');
    expect(button.props.accessibilityState).toMatchObject({ expanded: false });
    ReactTestRenderer.act(() => button.props.onPress());
    expect(onToggle).toHaveBeenCalled();
  });

  test('un bloque hecho dice «Hecho»; sin collapsible no se pliega y es un encabezado', () => {
    const done = { ...sectionFor(), doneCount: 2, state: 'done' as const };
    const { tree } = mount({ section: done, collapsible: false });
    expect(texts(tree)).toContain('Hecho');
    expect(tree.root.findAll(n => n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function')).toHaveLength(0);
    expect(tree.root.findAll(n => n.props.accessibilityRole === 'header').length).toBeGreaterThan(0);
  });

  test('los ejercicios sueltos (sin bloque) se dibujan sin encabezado', () => {
    const { tree } = mount({ section: { ...sectionFor(), block: null } as never });
    expect(texts(tree)).not.toContain('Calentamiento');
  });
});
