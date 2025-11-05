import React from "react";

interface ChartLegendToggleProps {
  yKeys: string[];
  yLabels?: string[];
  colors: string[];
  shownKeys: string[];
  onToggle: (yKey: string) => void;
}

const ChartLegendToggle: React.FC<ChartLegendToggleProps> = ({
  yKeys,
  yLabels = [],
  colors,
  shownKeys,
  onToggle,
}) => {
  return (
    <div className="flex gap-2 items-center mb-2 flex-wrap select-none">
      {yKeys.map((key, idx) => (
        <div
          key={key}
          className={`flex items-center gap-1 px-2 py-1 mr-2 rounded cursor-pointer transition focus:ring-1
            ${shownKeys.includes(key) ? "bg-[#B9FF66]/70 text-black" : "bg-gray-200 text-gray-400"}
          `}
          onClick={() => onToggle(key)}
          tabIndex={0}
          style={{ outline: "none" }}
        >
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: colors[idx],
              marginRight: 5,
            }}
          />
          <span className="text-xs">{yLabels[idx] || key}</span>
        </div>
      ))}
    </div>
  );
};

export default ChartLegendToggle;
