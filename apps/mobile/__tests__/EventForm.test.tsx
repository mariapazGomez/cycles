import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { EventForm } from '../src/components/events/EventForm';
import { emptyForm } from '../src/utils/eventForm';

const texts = (tree: ReactTestRenderer.ReactTestRenderer) =>
  tree.root.findAll(n => typeof n.props.children === 'string').map(n => n.props.children as string);
const byLabel = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
  tree.root.find(n => n.props.accessibilityLabel === label && (typeof n.props.onPress === 'function' || typeof n.props.onChangeText === 'function' || typeof n.props.onValueChange === 'function'));
const act = (fn: () => void) => ReactTestRenderer.act(fn);

function mount(props: Partial<React.ComponentProps<typeof EventForm>> = {}) {
  const onSubmit = jest.fn();
  const onDelete = jest.fn();
  const onCancel = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<EventForm initial={emptyForm('2026-11-02')} onSubmit={onSubmit} onDelete={onDelete} onCancel={onCancel} {...props} />);
  });
  return { tree, onSubmit, onDelete, onCancel };
}

test('sin nombre no envía y muestra el error', () => {
  const { tree, onSubmit } = mount();
  act(() => byLabel(tree, 'Guardar').props.onPress());
  expect(onSubmit).not.toHaveBeenCalled();
  expect(texts(tree)).toContain('Escribe un nombre.');
});

test('crea una actividad que se repite lunes y martes', () => {
  const { tree, onSubmit } = mount();
  act(() => byLabel(tree, 'Nombre').props.onChangeText('Voleibol'));
  act(() => byLabel(tree, 'Se repite cada semana').props.onValueChange(true));
  act(() => byLabel(tree, 'Lun').props.onPress());
  act(() => byLabel(tree, 'Mar').props.onPress());
  act(() => byLabel(tree, 'Hasta').props.onChangeText('2026-12-13'));
  expect(texts(tree)).toContain('Se agregan 6 lunes y 6 martes.');
  act(() => byLabel(tree, 'Guardar').props.onPress());
  expect(onSubmit).toHaveBeenCalledTimes(1);
  expect(onSubmit.mock.calls[0][0]).toMatchObject({
    kind: 'create',
    input: { type: 'training', title: 'Voleibol', date: '2026-11-02', repeat: { days: [0, 1], until: '2026-12-13' } },
  });
});

test('repetir sin elegir días no envía', () => {
  const { tree, onSubmit } = mount();
  act(() => byLabel(tree, 'Nombre').props.onChangeText('Voleibol'));
  act(() => byLabel(tree, 'Se repite cada semana').props.onValueChange(true));
  act(() => byLabel(tree, 'Guardar').props.onPress());
  expect(onSubmit).not.toHaveBeenCalled();
  expect(texts(tree)).toContain('Elige al menos un día de la semana.');
});

test('editar una serie ofrece «Solo este día» (predeterminado) y «Toda la serie»', () => {
  const initial = { ...emptyForm('2026-11-09'), title: 'Voleibol', repeats: true, repeatDays: [0, 1], until: '2026-12-14' };
  const { tree, onSubmit, onDelete } = mount({ initial, editing: { occurrenceDate: '2026-11-09', isSeries: true } });
  act(() => byLabel(tree, 'Guardar').props.onPress());
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ kind: 'update', scope: 'occurrence', input: { occurrenceDate: '2026-11-09' } });
  expect(texts(tree)).toContain('Eliminar solo este día');
  expect(byLabel(tree, 'Fecha').props.editable).toBe(false);
  act(() => byLabel(tree, 'Eliminar').props.onPress());
  expect(onDelete).toHaveBeenCalledWith('occurrence');
  act(() => byLabel(tree, 'Toda la serie').props.onPress());
  expect(texts(tree)).toContain('Eliminar toda la serie');
  expect(byLabel(tree, 'Fecha').props.editable).toBe(true);
  act(() => byLabel(tree, 'Guardar').props.onPress());
  expect(onSubmit.mock.calls[1][0]).toMatchObject({ kind: 'update', scope: 'series', input: { repeat: { days: [0, 1] } } });
});

test('una actividad suelta se edita y se elimina sin preguntar el alcance', () => {
  const initial = { ...emptyForm('2026-11-07', 'match'), title: 'Partido de liga' };
  const { tree, onSubmit, onDelete } = mount({ initial, editing: { occurrenceDate: '2026-11-07', isSeries: false } });
  expect(texts(tree)).not.toContain('Solo este día');
  act(() => byLabel(tree, 'Guardar').props.onPress());
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ kind: 'update', scope: 'series' });
  act(() => byLabel(tree, 'Eliminar').props.onPress());
  expect(onDelete).toHaveBeenCalledWith('series');
});

test('guardando bloquea el envío y todo el texto mide 11 px o más', () => {
  const { tree, onSubmit } = mount({ saving: true, initial: { ...emptyForm('2026-11-02'), title: 'x' } });
  act(() => byLabel(tree, 'Guardar').props.onPress());
  expect(onSubmit).not.toHaveBeenCalled();
  const sizes = tree.root.findAll(n => n.props.style && !Array.isArray(n.props.style) && n.props.style.fontSize).map(n => n.props.style.fontSize);
  sizes.forEach((s: number) => expect(s).toBeGreaterThanOrEqual(11));
});

test('elegir un deporte lo guarda y propone su nombre si aún no hay uno', () => {
  const { tree, onSubmit } = mount();
  act(() => byLabel(tree, 'Voleibol').props.onPress());
  expect(byLabel(tree, 'Nombre').props.value).toBe('Voleibol');
  act(() => byLabel(tree, 'Guardar').props.onPress());
  expect(onSubmit.mock.calls[0][0]).toMatchObject({ kind: 'create', input: { type: 'training', sport: 'volleyball', title: 'Voleibol' } });
});

test('un nombre ya escrito no se pisa al elegir deporte, y un partido no ofrece deportes', () => {
  const { tree } = mount();
  act(() => byLabel(tree, 'Nombre').props.onChangeText('Vóley playa'));
  act(() => byLabel(tree, 'Voleibol').props.onPress());
  expect(byLabel(tree, 'Nombre').props.value).toBe('Vóley playa');
  act(() => byLabel(tree, 'Partido o competencia').props.onPress());
  expect(texts(tree)).not.toContain('Deporte');
});
