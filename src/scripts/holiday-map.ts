import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { parseLocationsCsv, type LocationPin, type PendingLocation } from "../lib/locations";

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

const storageKey = "holiday-map:locations-csv";

const mapElement = document.getElementById("map");
const mappedListElement = document.getElementById("mapped-list");
const reviewListElement = document.getElementById("review-list");
const warningBoxElement = document.getElementById("warning-box");
const warningListElement = document.getElementById("warning-list");
const reviewPanelElement = document.getElementById("review-panel");
const emptyStateElement = document.getElementById("list-empty-state");
const pinCountElement = document.getElementById("pin-count");
const reviewCountElement = document.getElementById("review-count");
const storageStatusElement = document.getElementById("storage-status");
const uploadInputElement = document.getElementById("csv-upload");
const clearButtonElement = document.getElementById("clear-csv");

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

const reviewIssueLabel = (issue: PendingLocation["issue"]) =>
  issue === "invalid-coordinates" ? "Invalid coordinates" : "Missing coordinates";

const setStatusMessage = (message: string, isError = false) => {
  if (!(storageStatusElement instanceof HTMLElement)) {
    return;
  }

  storageStatusElement.textContent = message;
  storageStatusElement.classList.toggle("is-error", isError);
};

if (
  mapElement instanceof HTMLElement &&
  mappedListElement instanceof HTMLUListElement &&
  reviewListElement instanceof HTMLUListElement &&
  warningBoxElement instanceof HTMLElement &&
  warningListElement instanceof HTMLUListElement &&
  reviewPanelElement instanceof HTMLElement &&
  emptyStateElement instanceof HTMLElement &&
  pinCountElement instanceof HTMLElement &&
  reviewCountElement instanceof HTMLElement &&
  uploadInputElement instanceof HTMLInputElement &&
  clearButtonElement instanceof HTMLButtonElement
) {
  let map: L.Map | undefined;
  let markers: L.Marker[] = [];
  let activeLocationButtons: HTMLButtonElement[] = [];

  const setActiveLocation = (activeIndex: number) => {
    activeLocationButtons.forEach((button) => {
      button.classList.toggle(
        "is-active",
        Number(button.dataset.locationIndex) === activeIndex,
      );
    });
  };

  const renderWarnings = (warnings: string[]) => {
    warningListElement.innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
    warningBoxElement.hidden = warnings.length === 0;
  };

  const renderMappedList = (locations: LocationPin[]) => {
    mappedListElement.innerHTML = locations
      .map(
        (location, index) => `
          <li>
            <button class="location-button" type="button" data-location-index="${index}">
              <span class="location-row">
                <span class="location-title">${escapeHtml(location.title)}</span>
                <span class="location-type">${escapeHtml(location.type)}</span>
              </span>
              ${location.description ? `<span class="location-description">${escapeHtml(location.description)}</span>` : ""}
            </button>
          </li>
        `,
      )
      .join("");

    mappedListElement.hidden = locations.length === 0;
    activeLocationButtons = Array.from(
      mappedListElement.querySelectorAll<HTMLButtonElement>("[data-location-index]"),
    );
  };

  const renderPendingList = (pendingLocations: PendingLocation[]) => {
    reviewListElement.innerHTML = pendingLocations
      .map((location) => {
        const safeLink = location.link ? sanitizeExternalUrl(location.link) : undefined;

        return `
          <li>
            <article class="review-card">
              <span class="location-row">
                <span class="location-title">${escapeHtml(location.title)}</span>
                <span class="location-type">${escapeHtml(location.type)}</span>
              </span>
              <span class="review-badge">${escapeHtml(reviewIssueLabel(location.issue))}</span>
              ${location.description ? `<span class="location-description">${escapeHtml(location.description)}</span>` : ""}
              ${safeLink ? `<a class="review-link" href="${escapeHtml(safeLink)}" target="_blank" rel="noreferrer">Open source</a>` : ""}
            </article>
          </li>
        `;
      })
      .join("");

    reviewPanelElement.hidden = pendingLocations.length === 0;
    reviewCountElement.textContent = String(pendingLocations.length);
  };

  const renderEmptyState = (locations: LocationPin[], pendingLocations: PendingLocation[]) => {
    emptyStateElement.hidden = locations.length > 0 || pendingLocations.length > 0;
  };

  const destroyMap = () => {
    markers = [];

    if (!map) {
      return;
    }

    map.remove();
    map = undefined;
  };

  const renderMap = (locations: LocationPin[]) => {
    destroyMap();
    mapElement.innerHTML = "";

    if (locations.length === 0) {
      mapElement.innerHTML =
        "<p class='map-empty'>Upload a CSV with valid coordinates to display the map.</p>";
      return;
    }

    map = L.map(mapElement, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    markers = locations.map((location, index) => {
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

    activeLocationButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.locationIndex);
        const marker = markers[index];

        if (!marker || !map) {
          return;
        }

        setActiveLocation(index);
        const latLng = marker.getLatLng();
        map.setView(latLng, Math.max(map.getZoom(), 11), { animate: true });
        marker.openPopup();
      });
    });

    setActiveLocation(0);
  };

  const renderParsedCsv = (csvText: string, statusMessage: string) => {
    const { locations, pendingLocations, warnings } = parseLocationsCsv(csvText);

    pinCountElement.textContent = `${locations.length} ${locations.length === 1 ? "pin" : "pins"}`;
    renderWarnings(warnings);
    renderMappedList(locations);
    renderPendingList(pendingLocations);
    renderEmptyState(locations, pendingLocations);
    renderMap(locations);
    setStatusMessage(statusMessage);
  };

  const clearRenderedState = () => {
    destroyMap();
    mapElement.innerHTML =
      "<p class='map-empty'>Upload a CSV with valid coordinates to display the map.</p>";
    mappedListElement.innerHTML = "";
    mappedListElement.hidden = true;
    reviewListElement.innerHTML = "";
    warningListElement.innerHTML = "";
    warningBoxElement.hidden = true;
    reviewPanelElement.hidden = true;
    reviewCountElement.textContent = "0";
    pinCountElement.textContent = "0 pins";
    emptyStateElement.hidden = false;
    activeLocationButtons = [];
  };

  const restoreStoredCsv = () => {
    const storedCsv = window.localStorage.getItem(storageKey);

    if (!storedCsv) {
      clearRenderedState();
      setStatusMessage("Your CSV stays in this browser and is restored from local storage on reload.");
      return;
    }

    try {
      renderParsedCsv(storedCsv, "Loaded CSV from local storage.");
    } catch (error) {
      clearRenderedState();
      window.localStorage.removeItem(storageKey);
      const message = error instanceof Error ? error.message : "Could not restore the saved CSV.";
      setStatusMessage(message, true);
    }
  };

  uploadInputElement.addEventListener("change", async () => {
    const file = uploadInputElement.files?.[0];

    if (!file) {
      return;
    }

    try {
      const csvText = await file.text();
      renderParsedCsv(csvText, `Loaded ${file.name} and saved it in this browser.`);
      window.localStorage.setItem(storageKey, csvText);
      uploadInputElement.value = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load the selected CSV.";
      setStatusMessage(message, true);
    }
  });

  clearButtonElement.addEventListener("click", () => {
    window.localStorage.removeItem(storageKey);
    uploadInputElement.value = "";
    clearRenderedState();
    setStatusMessage("Cleared the saved CSV from this browser.");
  });

  restoreStoredCsv();
}
