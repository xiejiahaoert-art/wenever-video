/** Draw a stick figure. The y coordinate is the floor and hand targets use stage coordinates. */
export function drawStickFigure(ctx, {
  x, y, scale = 1, stride = 0, phase = 0, lean = 0, bend = 0, hop = 0, sit = 0, stance = 0,
  reach = 0, target = null, otherReach = 0, otherTarget = null, look = 1, celebrate = 0,
  mood = "neutral", blink = false, ink = "#f9dfaf", accent = "#ff9a5d",
}) {
  const base = y - hop - 41 * sit * scale;
  const chest = [lean, -139 + bend * .72];
  const hip = [lean * .35, -77 + bend * .43];
  const head = [lean * 1.22, -175 + bend * .84];
  const mix = (a, b, amount) => a + (b - a) * amount;
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
  function arm(direction, destination, reachAmount) {
    const front = direction === look;
    const offset = -direction * Math.sin(phase) * stride * .47;
    const shoulder = [chest[0] + direction * 5, chest[1] + (front ? 0 : 3)];
    let [handX, handY] = [
      mix(chest[0], hip[0], .78) + direction * (front ? 13 : 10) + look * (4 + 13 * sit) + offset,
      chest[1] + (front ? 66 : 62) - sit * (front ? 18 : 10),
    ];
    if (destination) {
      const dx = (destination[0] - x) / scale - chest[0];
      const dy = (destination[1] - base) / scale - chest[1];
      const extension = Math.min(1, 110 / Math.max(1, Math.hypot(dx, dy)));
      handX = mix(handX, chest[0] + dx * extension, reachAmount);
      handY = mix(handY, chest[1] + dy * extension, reachAmount);
    }
    if (celebrate) {
      const fist = front ? [head[0] + look * 37, head[1] - 35] : [chest[0] - look * 15, chest[1] + 22];
      handX = mix(handX, fist[0], celebrate);
      handY = mix(handY, fist[1], celebrate);
    }
    const dx = handX - shoulder[0];
    const dy = handY - shoulder[1];
    const flex = Math.max(reachAmount, celebrate) * Math.max(5, Math.min(20, (106 - Math.hypot(dx, dy)) * .34));
    const elbow = [shoulder[0] + dx * .43 - direction * flex * .34, shoulder[1] + dy * .49 + flex];
    path([chest, shoulder, elbow, [handX, handY]]);
  }
  const footSpacing = 13 + stance * .33 + sit * 4;
  for (const direction of [-look, look]) {
    const stepPhase = phase + (direction < 0 ? 0 : Math.PI);
    const foot = [
      direction * footSpacing + look * 22 * sit + Math.sin(stepPhase) * stride * .82,
      41 * sit - Math.max(0, Math.sin(stepPhase + .36)) * stride * .57 - hop * .035,
    ];
    const knee = [
      mix(hip[0], foot[0], .49) + look * (3 + 32 * sit + .26 * bend) + direction * 2,
      mix(hip[1], foot[1], .51) - sit * 9,
    ];
    const toe = [foot[0] + look * (direction === look ? 11 : 8), foot[1]];
    path([hip, knee, foot, toe]);
  }
  path([hip, chest, [head[0], head[1] + 24]]);
  arm(-look, otherTarget, otherReach);
  arm(look, target, reach);

  const tieX = mix(chest[0], head[0], .66);
  const tieY = mix(chest[1], head[1] + 24, .65);
  ctx.beginPath();
  for (const direction of [-1, 1]) {
    ctx.moveTo(tieX, tieY);
    ctx.lineTo(tieX + direction * 12, tieY - 7);
    ctx.quadraticCurveTo(tieX + direction * 15, tieY, tieX + direction * 12, tieY + 7);
    ctx.closePath();
  }
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(tieX - 3, tieY - 3.5, 6, 7);

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

  ctx.restore();
}
