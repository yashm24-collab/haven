// LUMEN dock: the first five installed apps from dockApps, in this order. Spotify has three possible LG ids;
// it appears once installed and the app list is re-synced. columns stays for user-data.js validation.
window.CONFIG = {
  columns: 5,
  dockApps: ["netflix", "hotstar", "amazon", "youtube.leanback.v4", "spotify-beehive", "com.spotify.tv", "spotify"],
  hiddenApps: ["com.gathin.tvhome", "com.local.nativehome", "com.lumen.spike"]
};
