const fs = require('fs');
let code = fs.readFileSync('src/components/LivePulseSchematic.tsx', 'utf8');

const regex = /\{\/\* ZONAL RINGS \*\/\}([\s\S]*?)\{\/\* Draw connecting route if active \*\/\}/;

const newCode = `{/* ZONAL RINGS */}
      {zones.map((zone, idx) => {
        const total = zones.length || 1;
        const innerRadius = 100;
        const outerRadius = 155;
        const cx = 200;
        const cy = 200;
        
        const startAngle = (idx * 360) / total - 90;
        const endAngle = ((idx + 1) * 360) / total - 90;
        
        const padding = 2;
        const startAnglePadded = (startAngle + padding) * Math.PI / 180;
        const endAnglePadded = (endAngle - padding) * Math.PI / 180;
        
        const x1_outer = cx + outerRadius * Math.cos(startAnglePadded);
        const y1_outer = cy + outerRadius * Math.sin(startAnglePadded);
        const x2_outer = cx + outerRadius * Math.cos(endAnglePadded);
        const y2_outer = cy + outerRadius * Math.sin(endAnglePadded);
        
        const x1_inner = cx + innerRadius * Math.cos(endAnglePadded);
        const y1_inner = cy + innerRadius * Math.sin(endAnglePadded);
        const x2_inner = cx + innerRadius * Math.cos(startAnglePadded);
        const y2_inner = cy + innerRadius * Math.sin(startAnglePadded);
        
        const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
        
        const d = \`M \${x1_outer} \${y1_outer} A \${outerRadius} \${outerRadius} 0 \${largeArcFlag} 1 \${x2_outer} \${y2_outer} L \${x1_inner} \${y1_inner} A \${innerRadius} \${innerRadius} 0 \${largeArcFlag} 0 \${x2_inner} \${y2_inner} Z\`;
        
        const midAngle = (startAngle + endAngle) / 2 * Math.PI / 180;
        const textRadius = 127.5;
        const textX = cx + textRadius * Math.cos(midAngle);
        const textY = cy + textRadius * Math.sin(midAngle);

        const density = zone.currentDensityPct;
        const heatColor = density > 85 ? "rgba(230, 57, 70, 0.2)" : density > 60 ? "rgba(255, 159, 28, 0.2)" : "rgba(76, 201, 240, 0.1)";
        const heatStroke = density > 85 ? "var(--color-alert-red)" : density > 60 ? "var(--color-live-amber)" : "var(--color-signal-blue)";
        const isPulse = density > 85;
        const isSource = selectedSourceZone === zone.id;
        const isDest = selectedDestZone === zone.id;

        return (
          <g key={zone.id} className="cursor-pointer group" onClick={() => onZoneClick && onZoneClick(zone.id)}>
            <path
              d={d}
              fill={heatColor}
              stroke={isSource ? "var(--color-chalk)" : isDest ? "var(--color-chalk)" : heatStroke}
              strokeWidth={isSource || isDest ? "3" : "1"}
              className={\`transition-all duration-300 hover:fill-chalk/20\`}
              style={{ pointerEvents: "auto" }}
            />
            {isPulse && (
              <path
                d={d}
                fill="none"
                stroke={heatStroke}
                strokeWidth="2"
                className="animate-ping"
                style={{ transformOrigin: '200px 200px', pointerEvents: 'none' }}
              />
            )}
            <text
              x={textX}
              y={textY - 4}
              fill="var(--color-chalk)"
              fontSize="12"
              textAnchor="middle"
              className="font-mono pointer-events-none"
            >
              {zone.name.split(" ")[0]}
            </text>
            <text
              x={textX}
              y={textY + 12}
              fill={heatStroke}
              fontSize="14"
              fontWeight="bold"
              textAnchor="middle"
              className="font-display pointer-events-none tracking-widest"
            >
              {density}%
            </text>
          </g>
        );
      })}
      {/* Draw connecting route if active */}`;

const replaced = code.replace(regex, newCode);
fs.writeFileSync('src/components/LivePulseSchematic.tsx', replaced);
console.log('Replaced successfully');
