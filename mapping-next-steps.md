# BioSys Swift – Mapping Next Steps

## The Goal
Integrate detection data into an interactive map so users can visualize, filter, and explore Swift Parrot detections.

---

## 1. Backend – API Endpoint

- [ ] Create `/api/detections` endpoint
- [ ] Returns JSON array:
  ```json
  [
    {
      "id": 1,
      "latitude": -41.077,
      "longitude": 145.344,
      "timestamp": "2025-10-06T21:30:00Z",
      "confidence": 0.916,
      "species": "Swift Parrot",
      "audio_url": "http://yourserver.com/recordings/clip_1.opus"
    }
  ]
  ```
- [ ] Add support for filters (by date, species, confidence)
- [ ] Make sure CORS headers are set (for browser access)

---

## 2. Frontend – Map Page

- [ ] Build a simple HTML page using Leaflet.js
- [ ] Center map on Tasmania (or project area)
- [ ] Fetch data from the API and plot markers
- [ ] Each marker:
    - Shows confidence, timestamp, species
    - Links to audio recording

- [ ] Use custom icons for detections (Swift Parrot image/logo)
- [ ] Add popups for marker info

---

## 3. Advanced Visualization

- [ ] Add heatmap layer for dense detections
- [ ] Color markers by recency (red=recent, orange=day, grey=older)
- [ ] Add date/species filter controls
- [ ] Consider marker clustering for very dense data

---

## 4. Real-Time / Refresh

- [ ] Poll API for new data every 30 seconds (or on demand)
- [ ] Consider websockets/SSE for future real-time updates

---

## 5. Future/TODO

- [ ] Export detections as CSV/GeoJSON
- [ ] Add map legend and UI polish
- [ ] Mobile-friendly map page
- [ ] User authentication for restricted data (optional)
- [ ] Community validation (upvote/rate detections)

---

## References
- [Leaflet.js Documentation](https://leafletjs.com/)
- [Leaflet Heatmap Plugin](https://github.com/Leaflet/Leaflet.heat)
- [Mapbox Docs](https://docs.mapbox.com/)
- [Google Maps JS API](https://developers.google.com/maps/documentation/javascript/overview)

---

**Ready to start mapping tomorrow!**