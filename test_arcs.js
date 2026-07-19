function getPath(index, total) {
  const innerRadius = 100;
  const outerRadius = 155;
  const cx = 200;
  const cy = 200;
  
  const startAngle = (index * 360) / total - 90;
  const endAngle = ((index + 1) * 360) / total - 90;
  
  // padding between zones (degrees)
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
  
  const path = `M ${x1_outer} ${y1_outer} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2_outer} ${y2_outer} L ${x1_inner} ${y1_inner} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x2_inner} ${y2_inner} Z`;
  
  const midAngle = (startAngle + endAngle) / 2 * Math.PI / 180;
  const textRadius = 127.5;
  const textX = cx + textRadius * Math.cos(midAngle);
  const textY = cy + textRadius * Math.sin(midAngle);
  
  return { path, textX, textY };
}
console.log(getPath(0, 5));
