// Shared geometry. The TV code (launcher/app.js, style.css) uses the same numbers: change both together.
export const W = 1920, H = 1080, FPS = 24;
export const SCENE_FRAMES = 16 * FPS;   // seamless 16 s cinemagraph loop
export const GLOBE_FRAMES = 60 * FPS;   // one turn of the globe per minute
export const GLOBE = { cx: 1240, cy: 540, r: 300, tilt: 20 };            // tilt = latitude facing the viewer
export const WC_SHEET = { x: 96, y: 96, w: 640, h: 888, r: 40 };          // World Clock sheet (left)
export const SET_SHEET = { x: 1184, y: 200, w: 640, h: 560, r: 40 };      // settings sheet (right)
export const SHEET_DIM = 0.5;                                             // scene darkening behind sheets

export type Tod = 'morning' | 'day' | 'night';
export const TODS: Tod[] = ['morning', 'day', 'night'];
