# BookWithMe – Minimal Web Prototype (v2)

**Was ist neu?**
- Weißes, reduziertes Design (Apple/Trade‑Republic inspiriert)
- Suchleiste **über** der Karte
- Karte (Leaflet + OSM) mit allen Shops, Marker‑Klick → Shop‑Seite
- Unter der Karte: **KI Support** Karte (öffnet Dialog mit einfacher Empfehlung)
- Oben rechts: **Einloggen/Registrieren** Button (Demo‑Modal + LocalStorage)
- Shop‑Detailseite mit **drei Kacheln**: Termin buchen, KI Hilfe, Rechnungen
- Alle Kacheln/Boxen heben sich dezent vom Hintergrund ab (Border + Shadow)

## Dateien
- `index.html` – Suche + Karte + KI Support
- `shop.html` – Drei Kacheln für Aktionen je Shop
- `styles.css` – Light Theme, minimal
- `app.js` – Shops, Suche, Karte, Modals
- (CDN) Leaflet 1.9

## Hosten
Funktioniert direkt auf GitHub Pages. Öffne `index.html`.

## Anpassen
- Shops in `app.js` im Array `SHOPS` ändern (Name, Stadt, Koordinaten).
- Farben via CSS‑Variablen in `styles.css` (z. B. `--accent`).

