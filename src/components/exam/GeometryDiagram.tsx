// Auto-generates a simple SVG diagram from a solution step's structured
// `diagram` data, ported 1:1 from the original app's makeGeometryDiagram
// (same coordinates, same four supported shapes) so a step that says
// "the right triangle below" actually gets one.

import type { GeometryDiagram as GeometryDiagramData } from "@/lib/types";

const STROKE = "#14274e";

export function GeometryDiagram({ diagram }: { diagram: GeometryDiagramData }) {
  return (
    <div className="ai-diagram-wrap">
      <svg viewBox="0 0 420 280" className="ai-geometry-svg" role="img" aria-label="Geometry diagram">
        {renderShape(diagram)}
      </svg>
    </div>
  );
}

function renderShape(diagram: GeometryDiagramData) {
  if (diagram.type === "triangle" || diagram.type === "right_triangle") {
    const A: [number, number] = [60, 220];
    const B: [number, number] = [330, 220];
    const C: [number, number] = [330, 70];
    const labels = diagram.labels ?? {};
    const sides = diagram.sideLabels ?? {};
    const showRightAngle = diagram.type === "right_triangle" || diagram.rightAngle;

    return (
      <>
        <polygon points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]}`} fill="none" stroke={STROKE} strokeWidth={3} />
        {showRightAngle && (
          <path d={`M ${B[0] - 22} ${B[1]} L ${B[0] - 22} ${B[1] - 22} L ${B[0]} ${B[1] - 22}`} fill="none" stroke={STROKE} strokeWidth={2} />
        )}
        {([["A", A] as const, ["B", B] as const, ["C", C] as const]).map(([name, [x, y]]) => (
          <text key={name} x={x + (name === "A" ? -18 : 8)} y={y + (name === "C" ? -8 : 20)}>
            {labels[name] || name}
          </text>
        ))}
        {sides.AB && <text x={195} y={250}>{sides.AB}</text>}
        {sides.BC && <text x={350} y={150}>{sides.BC}</text>}
        {sides.AC && <text x={180} y={130}>{sides.AC}</text>}
      </>
    );
  }

  if (diagram.type === "circle") {
    const cx = 210;
    const cy = 140;
    const r = 90;
    return (
      <>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={STROKE} strokeWidth={3} />
        <line x1={cx} y1={cy} x2={cx + r} y2={cy} stroke={STROKE} strokeWidth={2} />
        <text x={250} y={125}>{diagram.radiusLabel || diagram.radius || "r"}</text>
      </>
    );
  }

  if (diagram.type === "coordinate_plane") {
    const ox = 210;
    const oy = 140;
    return (
      <>
        <line x1={35} y1={oy} x2={390} y2={oy} stroke={STROKE} strokeWidth={2} />
        <line x1={ox} y1={20} x2={ox} y2={255} stroke={STROKE} strokeWidth={2} />
        {(diagram.points ?? []).map((point, index) => {
          const sx = ox + point.x * 25;
          const sy = oy - point.y * 25;
          return (
            <g key={index}>
              <circle cx={sx} cy={sy} r={5} fill="#0958d9" />
              <text x={sx + 8} y={sy - 8}>{point.label || `(${point.x}, ${point.y})`}</text>
            </g>
          );
        })}
      </>
    );
  }

  return null;
}
