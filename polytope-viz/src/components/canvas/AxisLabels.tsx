import { Html } from '@react-three/drei';
import { usePolytopeStore } from '../../store/usePolytopeStore';
import { AXIS_NAMES, AXIS_SIZES, LAYER2_AXIS_NAMES, LAYER2_AXIS_SIZES } from '../../data/seed';

export function AxisLabels() {
  const activeLayer = usePolytopeStore((s) => s.activeLayer);

  const names = activeLayer === 1 ? AXIS_NAMES : LAYER2_AXIS_NAMES;
  const sizes = activeLayer === 1 ? AXIS_SIZES : LAYER2_AXIS_SIZES;

  const labelPositions: { name: string; pos: [number, number, number] }[] = [
    { name: names[0] || '', pos: [sizes[0] * 1.2, 0, 0] },
    { name: names[1] || '', pos: [0, sizes[1] * 1.2, 0] },
    { name: names[2] || '', pos: [0, 0, sizes[2] * 1.2] },
  ];

  if (names[3]) {
    labelPositions.push({
      name: names[3],
      pos: [sizes[3] * 0.6, sizes[3] * 0.6, sizes[3] * 0.6],
    });
  }

  return (
    <>
      {labelPositions.map(({ name, pos }) => (
        <Html key={name} position={pos} center>
          <div
            style={{
              color: '#94a3b8',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 600,
              background: 'rgba(15, 23, 42, 0.8)',
              padding: '2px 6px',
              borderRadius: '3px',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            {name}
          </div>
        </Html>
      ))}
    </>
  );
}
