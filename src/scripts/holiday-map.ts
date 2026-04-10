import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  createCsvText,
  finalizeEditedRow,
  mergeImportedRows,
  type EditableImportedLocationDraft,
  type ImportedLocationDraft,
} from "../lib/link-importer.ts";
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
const appShellElement = document.getElementById("app-shell");

const mapElement = document.getElementById("map");
const mappedListElement = document.getElementById("mapped-list");
const reviewListElement = document.getElementById("review-list");
const warningBoxElement = document.getElementById("warning-box");
const warningListElement = document.getElementById("warning-list");
const reviewPanelElement = document.getElementById("review-panel");
const importPanelElement = document.querySelector(".import-panel");
const emptyStateElement = document.getElementById("list-empty-state");
const pinCountElement = document.getElementById("pin-count");
const reviewCountElement = document.getElementById("review-count");
const storageStatusElement = document.getElementById("storage-status");
const uploadInputElement = document.getElementById("csv-upload");
const downloadButtonElement = document.getElementById("download-csv");
const shareButtonElement = document.getElementById("share-map");
const clearButtonElement = document.getElementById("clear-csv");
const listPanelElement = document.querySelector(".list-panel");
const linkImportFormElement = document.getElementById("link-import-form");
const linkImportUrlElement = document.getElementById("link-import-url");
const linkImportSubmitElement = document.getElementById("link-import-submit");
const linkImportStatusElement = document.getElementById("link-import-status");
const linkReviewBackdropElement = document.getElementById("link-review-backdrop");
const linkReviewPanelElement = document.getElementById("link-review-panel");
const linkReviewFormElement = document.getElementById("link-review-form");
const linkReviewNotesElement = document.getElementById("link-review-notes");
const linkReviewCancelElement = document.getElementById("link-review-cancel");
const reviewTitleElement = document.getElementById("review-title");
const reviewTypeElement = document.getElementById("review-type");
const reviewDescriptionElement = document.getElementById("review-description");
const reviewLatitudeElement = document.getElementById("review-latitude");
const reviewLongitudeElement = document.getElementById("review-longitude");
const reviewLinkElement = document.getElementById("review-link");
const reviewPhotoElement = document.getElementById("review-photo");
const shareMapBackdropElement = document.getElementById("share-map-backdrop");
const shareMapPanelElement = document.getElementById("share-map-panel");
const shareMapFormElement = document.getElementById("share-map-form");
const shareMapNameElement = document.getElementById("share-map-name");
const shareMapStatusElement = document.getElementById("share-map-status");
const shareMapResultsElement = document.getElementById("share-map-results");
const sharePublicUrlElement = document.getElementById("share-public-url");
const shareEditUrlElement = document.getElementById("share-edit-url");
const shareMapSubmitElement = document.getElementById("share-map-submit");
const shareMapCopyPublicElement = document.getElementById("share-map-copy-public");
const shareMapCopyEditElement = document.getElementById("share-map-copy-edit");
const shareMapCancelElement = document.getElementById("share-map-cancel");
const updateSharedMapButtonElement = document.getElementById("update-shared-map");
const uploadLabelElement = document.querySelector('label[for="csv-upload"]');

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

const photoLoadErrorAttribute = "data-photo-error";

const truncateText = (value: string, maxLength: number) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
};

const bindPhotoFallbacks = (container: ParentNode) => {
  container.querySelectorAll<HTMLImageElement>("img[data-photo-role]").forEach((image) => {
    image.addEventListener(
      "error",
      () => {
        image.setAttribute(photoLoadErrorAttribute, "true");
      },
      { once: true },
    );
  });
};

const reviewIssueLabel = (issue: PendingLocation["issue"]) =>
  issue === "invalid-coordinates" ? "Invalid coordinates" : "Missing coordinates";

const hasCompleteImportData = (row: ImportedLocationDraft) =>
  row.title.trim() !== "" &&
  row.type.trim() !== "" &&
  row.link.trim() !== "" &&
  row.latitude !== undefined &&
  row.longitude !== undefined &&
  Number.isFinite(row.latitude) &&
  Number.isFinite(row.longitude);

const createEmptyCsv = () => createCsvText([]);

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  const number = Number(trimmed);
  return Number.isFinite(number) ? number : undefined;
};

const createReviewDraft = (row: ImportedLocationDraft): EditableImportedLocationDraft => ({
  ...row,
  notes: [...row.notes],
});

const setImportStatusMessage = (message: string, isError = false) => {
  if (!(linkImportStatusElement instanceof HTMLElement)) {
    return;
  }

  linkImportStatusElement.textContent = message;
  linkImportStatusElement.classList.toggle("is-error", isError);
};

const setStatusMessage = (message: string, isError = false) => {
  if (!(storageStatusElement instanceof HTMLElement)) {
    return;
  }

  storageStatusElement.textContent = message;
  storageStatusElement.classList.toggle("is-error", isError);
};

const setShareStatusMessage = (message: string, isError = false) => {
  if (!(shareMapStatusElement instanceof HTMLElement)) {
    return;
  }

  shareMapStatusElement.textContent = message;
  shareMapStatusElement.classList.toggle("is-error", isError);
};

const buildDownloadFilename = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `holiday-map-${year}-${month}-${day}.csv`;
};

const getSharedViewContext = () => {
  if (!(appShellElement instanceof HTMLElement)) {
    return { shareId: "", editSecret: "", isSharedView: false };
  }

  return {
    shareId: appShellElement.dataset.shareId ?? "",
    editSecret: appShellElement.dataset.editSecret ?? "",
    isSharedView: appShellElement.dataset.sharedView === "true",
  };
};

if (
  mapElement instanceof HTMLElement &&
  mappedListElement instanceof HTMLUListElement &&
  reviewListElement instanceof HTMLUListElement &&
  warningBoxElement instanceof HTMLElement &&
  warningListElement instanceof HTMLUListElement &&
  reviewPanelElement instanceof HTMLElement &&
  importPanelElement instanceof HTMLElement &&
  emptyStateElement instanceof HTMLElement &&
  pinCountElement instanceof HTMLElement &&
  reviewCountElement instanceof HTMLElement &&
  downloadButtonElement instanceof HTMLButtonElement &&
  shareButtonElement instanceof HTMLButtonElement &&
  uploadInputElement instanceof HTMLInputElement &&
  clearButtonElement instanceof HTMLButtonElement &&
  linkImportFormElement instanceof HTMLFormElement &&
  linkImportUrlElement instanceof HTMLInputElement &&
  linkImportSubmitElement instanceof HTMLButtonElement &&
  linkReviewBackdropElement instanceof HTMLElement &&
  linkReviewPanelElement instanceof HTMLElement &&
  linkReviewFormElement instanceof HTMLFormElement &&
  linkReviewNotesElement instanceof HTMLElement &&
  linkReviewCancelElement instanceof HTMLButtonElement &&
  reviewTitleElement instanceof HTMLInputElement &&
  reviewTypeElement instanceof HTMLInputElement &&
  reviewDescriptionElement instanceof HTMLTextAreaElement &&
  reviewLatitudeElement instanceof HTMLInputElement &&
  reviewLongitudeElement instanceof HTMLInputElement &&
  reviewLinkElement instanceof HTMLInputElement &&
  reviewPhotoElement instanceof HTMLInputElement &&
  shareMapBackdropElement instanceof HTMLElement &&
  shareMapPanelElement instanceof HTMLElement &&
  shareMapFormElement instanceof HTMLFormElement &&
  shareMapNameElement instanceof HTMLInputElement &&
  shareMapStatusElement instanceof HTMLElement &&
  shareMapResultsElement instanceof HTMLElement &&
  sharePublicUrlElement instanceof HTMLInputElement &&
  shareEditUrlElement instanceof HTMLInputElement &&
  shareMapSubmitElement instanceof HTMLButtonElement &&
  shareMapCopyPublicElement instanceof HTMLButtonElement &&
  shareMapCopyEditElement instanceof HTMLButtonElement &&
  shareMapCancelElement instanceof HTMLButtonElement &&
  updateSharedMapButtonElement instanceof HTMLButtonElement &&
  uploadLabelElement instanceof HTMLLabelElement
) {
  const sharedView = getSharedViewContext();
  let map: L.Map | undefined;
  let markers: L.Marker[] = [];
  let activeLocationButtons: HTMLButtonElement[] = [];
  let pendingReviewDraft: EditableImportedLocationDraft | undefined;
  let reviewReturnFocusElement: HTMLElement | undefined;
  let shareReturnFocusElement: HTMLElement | undefined;
  let currentCsvText = "";
  let currentSharedMapName: string | null = null;
  let canEditSharedMap = false;

  const getStoredCsvText = () => window.localStorage.getItem(storageKey);

  const hasShareableLocalMap = () => {
    const csvText = getStoredCsvText();

    if (!csvText) {
      return false;
    }

    try {
      return parseLocationsCsv(csvText).locations.length > 0;
    } catch {
      return false;
    }
  };

  const hasShareableCsv = (csvText: string) => {
    if (!csvText) {
      return false;
    }

    try {
      return parseLocationsCsv(csvText).locations.length > 0;
    } catch {
      return false;
    }
  };

  const syncSharedViewControls = () => {
    const isReadOnlySharedView = sharedView.isSharedView && !canEditSharedMap;
    const isEditableSharedView = sharedView.isSharedView && canEditSharedMap;

    importPanelElement.hidden = isReadOnlySharedView;
    uploadLabelElement.hidden = isReadOnlySharedView;
    uploadInputElement.hidden = isReadOnlySharedView;
    clearButtonElement.hidden = isReadOnlySharedView;
    updateSharedMapButtonElement.hidden = !isEditableSharedView;
  };

  const updateCsvUtilityState = () => {
    const hasCsv = !!getStoredCsvText();
    downloadButtonElement.disabled = sharedView.isSharedView ? false : !hasCsv;
    shareButtonElement.disabled = sharedView.isSharedView || !hasShareableLocalMap();
    updateSharedMapButtonElement.disabled = !canEditSharedMap || !hasShareableCsv(currentCsvText);
  };

  const preventMapScrollFrom = (element: HTMLElement | null) => {
    if (!element) {
      return;
    }

    L.DomEvent.disableScrollPropagation(element);
    L.DomEvent.disableClickPropagation(element);
  };

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
        (location, index) => {
          const safePhoto = location.photo ? sanitizeExternalUrl(location.photo) : undefined;

          return `
          <li>
            <button class="location-button" type="button" data-location-index="${index}">
              <span class="location-card-head">
                <span class="location-thumb ${safePhoto ? "has-photo" : "is-fallback"}">
                  ${safePhoto ? `<img class="location-thumb-image" src="${escapeHtml(safePhoto)}" alt="" loading="lazy" data-photo-role="list" />` : ""}
                  <span class="location-thumb-fallback" aria-hidden="true">${emojiForType(location.type)}</span>
                </span>
                <span class="location-copy">
                  <span class="location-row">
                    <span class="location-title">${escapeHtml(location.title)}</span>
                  </span>
                  <span class="location-meta">${escapeHtml(location.type)}</span>
                </span>
              </span>
            </button>
          </li>
        `;
        },
      )
      .join("");

    mappedListElement.hidden = locations.length === 0;
    activeLocationButtons = Array.from(
      mappedListElement.querySelectorAll<HTMLButtonElement>("[data-location-index]"),
    );

    bindPhotoFallbacks(mappedListElement);
  };

  const renderPendingList = (pendingLocations: PendingLocation[]) => {
    reviewListElement.innerHTML = pendingLocations
      .map((location) => {
        const safeLink = location.link ? sanitizeExternalUrl(location.link) : undefined;
        const safePhoto = location.photo ? sanitizeExternalUrl(location.photo) : undefined;

        return `
          <li>
            <article class="review-card">
              <span class="location-thumb ${safePhoto ? "has-photo" : "is-fallback"}">
                ${safePhoto ? `<img class="location-thumb-image" src="${escapeHtml(safePhoto)}" alt="" loading="lazy" data-photo-role="review" />` : ""}
                <span class="location-thumb-fallback" aria-hidden="true">${emojiForType(location.type)}</span>
              </span>
              <span class="location-copy">
                <span class="location-row">
                  <span class="location-title">${escapeHtml(location.title)}</span>
                </span>
                <span class="location-meta">${escapeHtml(location.type)}</span>
              </span>
              <span class="review-card-footer">
                <span class="review-badge">${escapeHtml(reviewIssueLabel(location.issue))}</span>
                ${safeLink ? `<a class="review-link" href="${escapeHtml(safeLink)}" target="_blank" rel="noreferrer">Open source</a>` : ""}
              </span>
            </article>
          </li>
        `;
      })
      .join("");

    reviewPanelElement.hidden = pendingLocations.length === 0;
    reviewCountElement.textContent = String(pendingLocations.length);
    bindPhotoFallbacks(reviewListElement);
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

    map = L.map(mapElement, {
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    preventMapScrollFrom(listPanelElement instanceof HTMLElement ? listPanelElement : null);
    preventMapScrollFrom(mappedListElement);
    preventMapScrollFrom(reviewListElement);

    if (locations.length === 0) {
      map.setView([54, 15], 5);
      return;
    }

    markers = locations.map((location, index) => {
      const safeLink = location.link ? sanitizeExternalUrl(location.link) : undefined;
      const safePhoto = location.photo ? sanitizeExternalUrl(location.photo) : undefined;
      const popupParts = [
        `<div class="popup-media ${safePhoto ? "has-photo" : "is-fallback"}">${
          safePhoto
            ? `<img class="popup-photo" src="${escapeHtml(safePhoto)}" alt="${escapeHtml(location.title)}" loading="lazy" referrerpolicy="no-referrer" data-photo-role="popup" />`
            : ""
        }<span class="popup-photo-fallback" aria-hidden="true">${emojiForType(location.type)}</span></div>`,
        `<strong class="popup-title">${escapeHtml(location.title)}</strong>`,
        `<div class="popup-type">${escapeHtml(location.type)}</div>`,
        location.description ? `<p class="popup-description">${escapeHtml(location.description)}</p>` : "",
      ];

      if (safeLink) {
        popupParts.push(
          `<p class="popup-link"><a href="${escapeHtml(safeLink)}" target="_blank" rel="noreferrer">Open link</a></p>`,
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

    map.on("popupopen", (event) => {
      const popupElement = event.popup?.getElement();

      if (popupElement) {
        bindPhotoFallbacks(popupElement);
      }
    });

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

    currentCsvText = csvText;
    pinCountElement.textContent = `${locations.length} ${locations.length === 1 ? "pin" : "pins"}`;
    renderWarnings(warnings);
    renderMappedList(locations);
    renderPendingList(pendingLocations);
    renderEmptyState(locations, pendingLocations);
    renderMap(locations);
    setStatusMessage(statusMessage);
  };

  const persistImportedRows = (rows: ImportedLocationDraft[], statusMessage: string) => {
    const existingCsvText = window.localStorage.getItem(storageKey) ?? createEmptyCsv();
    const merged = mergeImportedRows(rows, {
      append: true,
      dedupe: true,
      existingCsvText,
    });

    window.localStorage.setItem(storageKey, merged.csvText);
    updateCsvUtilityState();
    renderParsedCsv(merged.csvText, statusMessage);
    return merged;
  };

  const closeReviewPanel = () => {
    pendingReviewDraft = undefined;
    linkReviewBackdropElement.hidden = true;
    linkReviewPanelElement.hidden = true;
    linkReviewNotesElement.textContent = "";
    linkReviewFormElement.reset();
    document.body.style.overflow = "";
    reviewReturnFocusElement?.focus();
    reviewReturnFocusElement = undefined;
  };

  const closeSharePanel = () => {
    shareMapBackdropElement.hidden = true;
    shareMapPanelElement.hidden = true;
    shareMapResultsElement.hidden = true;
    shareMapFormElement.reset();
    shareMapCopyPublicElement.hidden = true;
    shareMapCopyEditElement.hidden = true;
    sharePublicUrlElement.value = "";
    shareEditUrlElement.value = "";
    setShareStatusMessage("Create a public read link plus a private edit link for this map.");
    document.body.style.overflow = "";
    shareReturnFocusElement?.focus();
    shareReturnFocusElement = undefined;
  };

  const openSharePanel = () => {
    shareReturnFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : shareButtonElement;
    shareMapBackdropElement.hidden = false;
    shareMapPanelElement.hidden = false;
    shareMapResultsElement.hidden = true;
    shareMapCopyPublicElement.hidden = true;
    shareMapCopyEditElement.hidden = true;
    setShareStatusMessage("Create a public read link plus a private edit link for this map.");
    document.body.style.overflow = "hidden";
    shareMapNameElement.focus();
  };

  const openReviewPanel = (row: ImportedLocationDraft) => {
    pendingReviewDraft = createReviewDraft(row);
    reviewReturnFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : linkImportUrlElement;
    reviewTitleElement.value = row.title;
    reviewTypeElement.value = row.type;
    reviewDescriptionElement.value = row.description;
    reviewLatitudeElement.value = row.latitude?.toString() ?? "";
    reviewLongitudeElement.value = row.longitude?.toString() ?? "";
    reviewLinkElement.value = row.link;
    reviewPhotoElement.value = row.photo;
    linkReviewNotesElement.textContent =
      row.notes.length > 0 ? row.notes.join(" ") : "Complete the missing fields before saving this row.";
    linkReviewBackdropElement.hidden = false;
    linkReviewPanelElement.hidden = false;
    document.body.style.overflow = "hidden";
    reviewTitleElement.focus();
  };

  const importLink = async (url: string) => {
    const response = await fetch("/api/import-link", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const payload = (await response.json()) as ImportedLocationDraft | { error?: string };

    if (!response.ok) {
      throw new Error(typeof payload === "object" && payload && "error" in payload ? payload.error || "Import failed." : "Import failed.");
    }

    return payload as ImportedLocationDraft;
  };

  const createShareMap = async (name: string, csvText: string) => {
    const response = await fetch("/api/share-map", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name,
        csvText,
      }),
    });

    const payload = (await response.json()) as
      | { publicUrl: string; editUrl: string; shareId: string; lastChangedAt: string }
      | { error?: string };

    if (!response.ok) {
      throw new Error(typeof payload === "object" && payload && "error" in payload ? payload.error || "Could not create share link." : "Could not create share link.");
    }

    return payload as { publicUrl: string; editUrl: string; shareId: string; lastChangedAt: string };
  };

  const putSharedMap = async (shareId: string, name: string | null, csvText: string, editSecret: string) => {
    const response = await fetch(`/api/share-map/${shareId}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: name ?? "",
        csvText,
        editSecret,
      }),
    });

    const payload = (await response.json()) as { lastChangedAt: string } | { error?: string };

    if (!response.ok) {
      throw new Error(
        typeof payload === "object" && payload && "error" in payload
          ? payload.error || "Could not update shared map."
          : "Could not update shared map.",
      );
    }

    return payload as { lastChangedAt: string };
  };

  const fetchSharedMap = async (shareId: string, editSecret: string) => {
    const endpoint = new URL(`/api/share-map/${shareId}`, window.location.origin);

    if (editSecret) {
      endpoint.searchParams.set("edit", editSecret);
    }

    const response = await fetch(endpoint);
    const payload = (await response.json()) as
      | { name: string | null; shareId: string; lastChangedAt: string; csvText: string; canEdit: boolean }
      | { error?: string };

    if (!response.ok) {
      throw new Error(typeof payload === "object" && payload && "error" in payload ? payload.error || "Could not load shared map." : "Could not load shared map.");
    }

    return payload as { name: string | null; shareId: string; lastChangedAt: string; csvText: string; canEdit: boolean };
  };

  const clearRenderedState = () => {
    destroyMap();
    currentCsvText = "";
    currentSharedMapName = null;
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
    renderMap([]);
    updateCsvUtilityState();
  };

  const restoreSharedCsv = async () => {
    if (!sharedView.isSharedView || !sharedView.shareId) {
      return false;
    }

    try {
      const sharedMap = await fetchSharedMap(sharedView.shareId, sharedView.editSecret);
      currentSharedMapName = sharedMap.name;
      canEditSharedMap = sharedMap.canEdit;
      syncSharedViewControls();
      renderParsedCsv(sharedMap.csvText, sharedMap.canEdit ? "Loaded shared map in edit mode." : "Loaded shared map.");
      if (sharedMap.canEdit) {
        window.localStorage.setItem(storageKey, sharedMap.csvText);
      }
      updateCsvUtilityState();
      return true;
    } catch (error) {
      canEditSharedMap = false;
      syncSharedViewControls();
      clearRenderedState();
      const message = error instanceof Error ? error.message : "Could not load shared map.";
      setStatusMessage(message, true);
      return true;
    }
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
      updateCsvUtilityState();
    } catch (error) {
      clearRenderedState();
      window.localStorage.removeItem(storageKey);
      const message = error instanceof Error ? error.message : "Could not restore the saved CSV.";
      setStatusMessage(message, true);
    }
  };

  const resetUploadSelection = () => {
    // Clearing before the picker opens ensures selecting the same file still fires `change`.
    uploadInputElement.value = "";
  };

  uploadLabelElement.addEventListener("click", resetUploadSelection);
  uploadInputElement.addEventListener("click", resetUploadSelection);

  uploadInputElement.addEventListener("change", async () => {
    const file = uploadInputElement.files?.[0];

    if (!file) {
      return;
    }

    try {
      const csvText = await file.text();
      renderParsedCsv(csvText, `Loaded ${file.name} and saved it in this browser.`);
      window.localStorage.setItem(storageKey, csvText);
      updateCsvUtilityState();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load the selected CSV.";
      setStatusMessage(message, true);
    } finally {
      uploadInputElement.value = "";
    }
  });

  clearButtonElement.addEventListener("click", () => {
    const confirmed = window.confirm("Clear the saved CSV and imported rows from this browser?");

    if (!confirmed) {
      return;
    }

    window.localStorage.removeItem(storageKey);
    uploadInputElement.value = "";
    clearRenderedState();
    setStatusMessage("Cleared the saved CSV from this browser.");
  });

  updateSharedMapButtonElement.addEventListener("click", async () => {
    if (!sharedView.isSharedView || !canEditSharedMap || !sharedView.shareId || !sharedView.editSecret) {
      return;
    }

    const csvText = window.localStorage.getItem(storageKey) ?? currentCsvText;

    if (!csvText) {
      updateCsvUtilityState();
      setStatusMessage("Nothing to update yet.", true);
      return;
    }

    updateSharedMapButtonElement.disabled = true;
    setStatusMessage("Updating shared map...");

    try {
      const updated = await putSharedMap(
        sharedView.shareId,
        currentSharedMapName,
        csvText,
        sharedView.editSecret,
      );
      currentCsvText = csvText;
      setStatusMessage(`Updated shared map. Last changed at ${new Date(updated.lastChangedAt).toLocaleString()}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update shared map.";
      setStatusMessage(message, true);
    } finally {
      updateCsvUtilityState();
    }
  });

  downloadButtonElement.addEventListener("click", () => {
    const csvText = sharedView.isSharedView ? currentCsvText : window.localStorage.getItem(storageKey);

    if (!csvText) {
      updateCsvUtilityState();
      setStatusMessage("Nothing to download yet.", true);
      return;
    }

    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = buildDownloadFilename();
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);

    setStatusMessage("Downloaded the current CSV.");
  });

  shareButtonElement.addEventListener("click", () => {
    if (shareButtonElement.disabled || sharedView.isSharedView) {
      return;
    }

    openSharePanel();
  });

  linkImportFormElement.addEventListener("submit", async (event) => {
    event.preventDefault();

    const url = linkImportUrlElement.value.trim();

    if (url === "") {
      setImportStatusMessage("Paste a valid URL first.", true);
      return;
    }

    linkImportSubmitElement.disabled = true;
    setImportStatusMessage("Importing link...");

    try {
      const imported = await importLink(url);

      if (hasCompleteImportData(imported)) {
        persistImportedRows([imported], `Imported ${imported.title} from ${imported.link}.`);
        closeReviewPanel();
        linkImportFormElement.reset();
        setImportStatusMessage(`Imported ${imported.title}.`);
      } else {
        openReviewPanel(imported);
        setImportStatusMessage("Review the imported row before saving.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not import that link.";
      setImportStatusMessage(message, true);
    } finally {
      linkImportSubmitElement.disabled = false;
    }
  });

  linkReviewCancelElement.addEventListener("click", () => {
    closeReviewPanel();
    setImportStatusMessage("Cancelled review.");
  });

  shareMapCancelElement.addEventListener("click", () => {
    closeSharePanel();
    setStatusMessage("Cancelled share creation.");
  });

  const copyShareLinkToClipboard = async (text: string, successMessage: string) => {
    if (!navigator.clipboard?.writeText) {
      setShareStatusMessage("Clipboard copy is not available in this browser.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setShareStatusMessage(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not copy share link.";
      setShareStatusMessage(message, true);
    }
  };

  shareMapCopyPublicElement.addEventListener("click", async () => {
    await copyShareLinkToClipboard(sharePublicUrlElement.value, "Copied the public link.");
  });

  shareMapCopyEditElement.addEventListener("click", async () => {
    await copyShareLinkToClipboard(shareEditUrlElement.value, "Copied the private edit link.");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !linkReviewPanelElement.hidden) {
      event.preventDefault();
      closeReviewPanel();
      setImportStatusMessage("Cancelled review.");
      return;
    }

    if (event.key === "Escape" && !shareMapPanelElement.hidden) {
      event.preventDefault();
      closeSharePanel();
      setStatusMessage("Cancelled share creation.");
    }
  });

  shareMapFormElement.addEventListener("submit", async (event) => {
    event.preventDefault();

    const csvText = getStoredCsvText();

    if (!csvText) {
      setShareStatusMessage("Nothing to share yet.", true);
      return;
    }

    shareMapSubmitElement.disabled = true;
    setShareStatusMessage("Creating share links...");

    try {
      const shared = await createShareMap(shareMapNameElement.value.trim(), csvText);
      sharePublicUrlElement.value = shared.publicUrl;
      shareEditUrlElement.value = shared.editUrl;
      shareMapResultsElement.hidden = false;
      shareMapCopyPublicElement.hidden = false;
      shareMapCopyEditElement.hidden = false;
      setShareStatusMessage("Created public and private share links.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create share link.";
      setShareStatusMessage(message, true);
    } finally {
      shareMapSubmitElement.disabled = false;
    }
  });

  linkReviewFormElement.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!pendingReviewDraft) {
      return;
    }

    const finalized = finalizeEditedRow({
      ...pendingReviewDraft,
      title: reviewTitleElement.value,
      type: reviewTypeElement.value,
      description: reviewDescriptionElement.value,
      latitude: parseOptionalNumber(reviewLatitudeElement.value),
      longitude: parseOptionalNumber(reviewLongitudeElement.value),
      link: reviewLinkElement.value,
      photo: reviewPhotoElement.value,
    });

    persistImportedRows([finalized], `Saved ${finalized.title} to the local CSV.`);
    closeReviewPanel();
    linkImportFormElement.reset();
    setImportStatusMessage(`Saved ${finalized.title}.`);
  });

  syncSharedViewControls();

  restoreSharedCsv().then((handled) => {
    if (!handled) {
      restoreStoredCsv();
      updateCsvUtilityState();
    }
  });
}
