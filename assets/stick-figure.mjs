/** Draw a stick figure on a uniformly scaled Canvas 2D stage. */
export function drawStickFigure(ctx, {
  x, y, scale = 1, stride = 0, phase = 0, lean = 0, bend = 0, hop = 0,
  reach = 0, target = null, look = 1, celebrate = 0, mood = "neutral", blink = false, ink = "#f9dfaf", accent = "#ff9a5d",
}) {
  const base = y - hop;
  const swing = Math.sin(phase) * stride;
  const chest = [lean, -139 + bend * .72];
  const hip = [lean * .35, -77 + bend * .43];
  const head = [lean * 1.22, -175 + bend * .84];
  const rest = [chest[0] + (30 + swing * .36) * look, chest[1] + 58];
  let hand = rest;
  if (target) {
    const dx = (target[0] - x) / scale - chest[0];
    const dy = (target[1] - base) / scale - chest[1];
    const extension = Math.min(1, 110 / Math.max(1, Math.hypot(dx, dy)));
    hand = [rest[0] + reach * (chest[0] + dx * extension - rest[0]),
            rest[1] + reach * (chest[1] + dy * extension - rest[1])];
  }
  const other = [chest[0] - (36 + swing * .32) * look, chest[1] + 58];
  if (celebrate) {
    hand = [hand[0] + celebrate * (chest[0] + 48 * look - hand[0]),
            hand[1] + celebrate * (head[1] - 33 - hand[1])];
    other[1] += celebrate * (head[1] - 25 - other[1]);
  }
  const elbow = [(hand[0] + chest[0]) / 2 + 5 * look, (hand[1] + chest[1]) / 2 + 16];
  const otherElbow = [(other[0] + chest[0]) / 2 - 6 * look, (other[1] + chest[1]) / 2 + 10];
  ctx.save();
  ctx.translate(x, base);
  ctx.scale(scale, scale);
  ctx.lineJoin = ctx.lineCap = "round";

  function path(points, color = ink, width = 5) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  for (const direction of [-1, 1]) {
    const foot = [(22 - swing * .65) * direction,
                  -Math.max(0, direction * swing) * .30 - (hop ? 8 : 0)];
    const knee = [(foot[0] + hip[0]) / 2 + direction * 10,
                  -42 + bend * .17 - (hop ? 11 : 0)];
    path([hip, knee, foot, [foot[0] + direction * 12, foot[1]]]);
  }
  path([hip, chest, [head[0], head[1] + 24]]);
  path([chest, elbow, hand]);
  path([chest, otherElbow, other]);
  ctx.beginPath();
  ctx.arc(...head, 26, 0, Math.PI * 2);
  ctx.fillStyle = "#19262c";
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = ink;
  for (const dir of [-1, 1]) {
    const ex = head[0] + dir * 8 + look * 4;
    const ey = head[1] - 3;
    if (mood === "relief" || blink) {
      path([[ex - 3, ey + 1], [ex, ey - 1], [ex + 3, ey + 1]], ink, 1.7);
    } else {
      ctx.beginPath();
      ctx.arc(ex, ey, mood === "shock" ? 3.7 : 2.35, 0, Math.PI * 2);
      ctx.fill();
    }
    if (mood !== "relief" && mood !== "neutral") {
      const tilt = mood === "worried" ? dir * 3 : mood === "focus" ? -dir * 2 : 0;
      path([[ex - 4, ey - 8 - tilt], [ex + 4, ey - 8 + tilt]], ink, 1.4);
    }
  }
  const [hx, hy] = head;
  if (mood === "shock") {
    ctx.beginPath();
    ctx.arc(hx + look * 3, hy + 12, 4.4, 0, Math.PI * 2);
    ctx.lineWidth = 1.7;
    ctx.strokeStyle = ink;
    ctx.stroke();
  } else if (mood === "worried") {
    path([[hx - 6, hy + 15], [hx, hy + 11], [hx + 7, hy + 14]], ink, 1.8);
  } else if (mood === "relief") {
    path([[hx - 7, hy + 10], [hx, hy + 15], [hx + 8, hy + 9]], ink, 1.8);
  } else {
    path([[hx - 4, hy + 12], [hx + 8, hy + 11]], ink, 1.7);
  }

  path([[chest[0] - 10, chest[1] - 3], [chest[0] + 12, chest[1] + 2], [chest[0] + 21, chest[1] + 13]], accent, 4);
  ctx.restore();
}
