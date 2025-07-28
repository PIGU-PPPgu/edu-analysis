import React from "react";
import { Maximize, Minimize, ZoomIn, ZoomOut } from "lucide-react";

interface ChartZoomControlsProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ChartZoomControls: React.FC<ChartZoomControlsProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onReset,
}) => {
  return (
    <div
      className="absolute z-10 right-3 top-3 bg-white/80 rounded shadow-sm flex gap-2 p-1 animate-fade-in"
      style={{ backdropFilter: "blur(3px)" }}
    >
      <button
        title="放大"
        onClick={onZoomIn}
        className="p-1 hover-scale rounded transition-colors hover:bg-[#B9FF66]/30"
      >
        <ZoomIn size={18} />
      </button>
      <button
        title="缩小"
        onClick={onZoomOut}
        className="p-1 hover-scale rounded transition-colors hover:bg-[#B9FF66]/30"
        disabled={zoomLevel <= 1}
      >
        <ZoomOut size={18} />
      </button>
      <button
        title="重置"
        onClick={onReset}
        className="p-1 hover-scale rounded transition-colors hover:bg-gray-100"
      >
        <Minimize size={18} />
      </button>
    </div>
  );
};

export default ChartZoomControls;
