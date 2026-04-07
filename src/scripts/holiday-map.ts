import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LocationPin = {
  title: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  link?: string;
};

const typeEmojiMap: Record<string, string> = {
  airport: "✈️",
  accommodation: "🏨",
  hotel: "🏨",
  hostel: "🛏️",
  apartment: "🏠",
  restaurant: "🍽️",
  cafe: "☕",
  bar: "🍸",
  beach: "🏖️",
  sight: "📍",
  sightseeing: "📍",
  museum: "🏛️",
  hike: "🥾",
  nature: "🌿",
  station: "🚉",
  train: "🚆",
  ferry: "⛴️",
  parking: "🅿️",
};

const mapElement = document.getElementById("map");

const escapeHtml = (value: string) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const emojiForType = (type: string) => typeEmojiMap[type.trim().toLowerCase()] ?? "📌";

const sanitizeExternalUrl = (value: string) => {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return url.toString();
  } catch {
    return undefined;
  }
};

if (mapElement instanceof HTMLElement) {
  const rawLocations = mapElement.dataset.locations;
  const locations: LocationPin[] = rawLocations ? JSON.parse(rawLocations) : [];
  const locationButtons = Array.from(
    document.querySelectorAll<HTMLElement>("[data-location-index]"),
  );

  const setActiveLocation = (activeIndex: number) => {
    locationButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        Number(button.dataset.locationIndex) === activeIndex,
      );
    });
  };

  if (locations.length === 0) {
    mapElement.innerHTML =
      "<p class='map-empty'>Add valid rows to src/data/locations.csv to display the map.</p>";
  } else {
    const map = L.map(mapElement, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const markers = locations.map((location, index) => {
      const safeLink = location.link ? sanitizeExternalUrl(location.link) : undefined;
      const popupParts = [
        `<strong>${escapeHtml(location.title)}</strong>`,
        `<div>${escapeHtml(location.type)}</div>`,
        `<p>${escapeHtml(location.description)}</p>`,
      ];

      if (safeLink) {
        popupParts.push(
          `<p><a href="${escapeHtml(safeLink)}" target="_blank" rel="noreferrer">Open link</a></p>`,
        );
      }

      const marker = L.marker([location.latitude, location.longitude], {
        icon: L.divIcon({
          className: "emoji-pin-wrapper",
          html: `
            <span class="emoji-pin-shadow" aria-hidden="true"></span>
            <span class="emoji-pin" aria-hidden="true">
              <span class="emoji-pin-glyph">${emojiForType(location.type)}</span>
            </span>
          `,
          iconSize: [48, 62],
          iconAnchor: [24, 52],
          popupAnchor: [0, -44],
        }),
      }).bindPopup(popupParts.join(""));

      marker.on("click", () => {
        setActiveLocation(index);
      });

      return marker;
    });

    const group = L.featureGroup(markers).addTo(map);
    map.fitBounds(group.getBounds(), { padding: [40, 40] });

    locationButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.locationIndex);
        const marker = markers[index];

        if (!marker) {
          return;
        }

        setActiveLocation(index);
        const latLng = marker.getLatLng();
        map.setView(latLng, Math.max(map.getZoom(), 11), { animate: true });
        marker.openPopup();
      });
    });

    setActiveLocation(0);
  }
}
