# Third-party notices

- Launcher: derived from OmkarK97/webos-vibehack, MIT. Original Gathin and OmkarK97
  notices are retained in LICENSE. The font license is retained at launcher/fonts/OFL.txt.
- Outfit: SIL Open Font License 1.1, retained alongside the font.
- ws: bundled Node WebSocket dependency; license in native/app/vendor/ws/LICENSE.
- webos-service: supplied by the TV runtime, not redistributed here.
- Zig, Python and LG's webOS CLI are external build/setup prerequisites.

Haven (the launcher in this fork):

- Instrument Serif and Geist: SIL Open Font License 1.1; licenses at
  launcher/fonts/INSTRUMENT-SERIF-OFL.txt and launcher/fonts/GEIST-OFL.txt.
- Rive runtime (@rive-app/canvas 2.45.1, launcher/assets/rive.js and rive.wasm): MIT.
- Brand marks in launcher/marks/: from Simple Icons, CC0 1.0. The logos remain trademarks of
  their owners and are shown only to identify each installed app; no endorsement is implied.
- Weather: Open-Meteo API (https://open-meteo.com), data under CC BY 4.0; credited in
  Settings → About Haven.
- Globe outline: Natural Earth via world-atlas (public domain, ISC package), rendered into
  launcher/assets/wc-*.mp4. Remotion, d3-geo, topojson-client and ffmpeg-static are
  build-time tools in lumen/ and are not shipped to the TV.
- Landscape pictures (lumen/public/scene-*.jpg and the videos made from them): made by the
  Haven author with an AI image generator.

TV app icons are downloaded only for a user's local app inventory. They are not
included in a clean public checkout or generic release package. The same goes for
launcher/marks/hotstar.png, which lumen/marks.js derives from the TV's JioHotstar icon.
