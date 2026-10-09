export type Pt = [number, number];

/** Deterministic hash-based random in [0, 1). */
export const rand = (seed: number) => {
	const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
	return x - Math.floor(x);
};

const f = (n: number) => n.toFixed(1);

/** Smooth closed/open path through points using Catmull-Rom -> cubic Bezier. */
export const smoothPath = (pts: Pt[], closed = false, tension = 1) => {
	const n = pts.length;
	if (n < 2) return '';
	const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
	let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
	const segs = closed ? n : n - 1;
	for (let i = 0; i < segs; i++) {
		const p0 = get(i - 1);
		const p1 = get(i);
		const p2 = get(i + 1);
		const p3 = get(i + 2);
		const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension];
		const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension];
		d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
	}
	return closed ? d + 'Z' : d;
};

/** Filled ribbon around a centre line with per-point half-width (tapered stroke). */
export const ribbonPath = (pts: Pt[], widths: number[]) => {
	if (pts.length < 2) return '';
	const left: Pt[] = [];
	const right: Pt[] = [];
	for (let i = 0; i < pts.length; i++) {
		const a = pts[Math.max(0, i - 1)];
		const b = pts[Math.min(pts.length - 1, i + 1)];
		let nx = -(b[1] - a[1]);
		let ny = b[0] - a[0];
		const l = Math.hypot(nx, ny) || 1;
		nx /= l;
		ny /= l;
		left.push([pts[i][0] + nx * widths[i], pts[i][1] + ny * widths[i]]);
		right.push([pts[i][0] - nx * widths[i], pts[i][1] - ny * widths[i]]);
	}
	const l = smoothPath(left);
	const r = smoothPath(right.reverse()).replace(/^M/, 'L');
	return `${l}${r}Z`;
};

/** Offset a polyline along its normals. */
export const offsetLine = (pts: Pt[], d: number): Pt[] =>
	pts.map((p, i) => {
		const a = pts[Math.max(0, i - 1)];
		const b = pts[Math.min(pts.length - 1, i + 1)];
		let nx = -(b[1] - a[1]);
		let ny = b[0] - a[0];
		const l = Math.hypot(nx, ny) || 1;
		nx /= l;
		ny /= l;
		return [p[0] + nx * d, p[1] + ny * d];
	});

/** Rose-curve contour: r(θ) = R (1 + k cos(nθ + phase)). */
export const roseContour = (cx: number, cy: number, R: number, n: number, k: number, phase: number, steps = 120) => {
	const pts: Pt[] = [];
	for (let i = 0; i < steps; i++) {
		const a = (i / steps) * Math.PI * 2;
		const r = R * (1 + k * Math.cos(n * a + phase));
		pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
	}
	return smoothPath(pts, true);
};

/**
 * A single jasmine-style petal pointing up (−y) from the origin.
 * len = length, w = max half-width.
 */
export const petalPath = (len: number, w: number, tipSharp = 0.18) => {
	const L = len;
	return (
		`M0,0` +
		`C${f(w * 0.9)},${f(-L * 0.18)} ${f(w * 1.15)},${f(-L * 0.62)} ${f(w * tipSharp)},${f(-L * 0.97)}` +
		`Q0,${f(-L * 1.02)} ${f(-w * tipSharp)},${f(-L * 0.97)}` +
		`C${f(-w * 1.15)},${f(-L * 0.62)} ${f(-w * 0.9)},${f(-L * 0.18)} 0,0Z`
	);
};

/** Almond leaf pointing up (−y) from the origin. */
export const leafPath = (len: number, w: number) =>
	`M0,0C${f(w)},${f(-len * 0.25)} ${f(w * 0.8)},${f(-len * 0.75)} 0,${f(-len)}` +
	`C${f(-w * 0.8)},${f(-len * 0.75)} ${f(-w)},${f(-len * 0.25)} 0,0Z`;
