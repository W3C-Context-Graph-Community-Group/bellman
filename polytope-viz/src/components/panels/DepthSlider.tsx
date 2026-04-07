import { useState } from 'react';

export function DepthSlider() {
  const [depth, setDepth] = useState(0);

  return (
    <div className="depth-slider">
      <label className="depth-label">
        Temporal Depth
        <span className="depth-value">{depth}</span>
      </label>
      <input
        type="range"
        min={0}
        max={10}
        value={depth}
        onChange={(e) => setDepth(parseInt(e.target.value))}
        className="depth-input"
      />
    </div>
  );
}
