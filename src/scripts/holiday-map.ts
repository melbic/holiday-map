import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  createCsvText,
  finalizeEditedRow,
  mergeImportedRows,
  type EditableImportedLocationDraft,
  type ImportedLocationDraft,
} from "../lib/link-importer.ts";
import { parseLocationsCsv, type LocationPin, type PendingLocation } from "../lib/locations.ts";
import { createShareMap, fetchShareMap, importLink, updateShareMap } from "./holiday-map/api.ts";
import { getHolidayMapElements } from "./holiday-map/dom.ts";
import { createReviewModalController } from "./holiday-map/review-modal.ts";
import { createShareModalController } from "./holiday-map/share-modal.ts";

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
const elements = getHolidayMapElements();

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
  row.title.trim() !== ""
  && row.type.trim() !== ""
  && row.link.trim() !== ""
  && row.latitude !== undefined
  && row.longitude !== undefined
  && Number.isFinite(row.latitude)
  && Number.isFinite(row.longitude);

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

type MobileDetailLocation = {
  title: string;
  type: string;
  description: string;
  link?: string;
  photo?: string;
};

if (elements) {
  const {
    appShellElement,
    mapElement,
    mappedListElement,
    reviewListElement,
    warningBoxElement,
    warningListElement,
    reviewPanelElement,
    importPanelElement,
    emptyStateElement,
    pinCountElement,
    mobilePinCountElement,
    reviewCountElement,
    mobileListCountElement,
    storageStatusElement,
    uploadInputElement,
    downloadButtonElement,
    shareButtonElement,
    clearButtonElement,
    mobileActionsToggleElement,
    mobileActionsBackdropElement,
    mobileActionsPanelElement,
    mobileActionsCloseElement,
    mobileUploadButtonElement,
    mobileAddLinkElement,
    mobileDownloadButtonElement,
    mobileShareButtonElement,
    mobileUpdateSharedMapButtonElement,
    mobileClearButtonElement,
    mobileListToggleElement,
    mobileDetailBackdropElement,
    mobileDetailPanelElement,
    mobileDetailCloseElement,
    mobileDetailTitleElement,
    mobileDetailMediaElement,
    mobileDetailPhotoElement,
    mobileDetailFallbackElement,
    mobileDetailTypeElement,
    mobileDetailDescriptionElement,
    mobileDetailLinkElement,
    listPanelElement,
    linkImportFormElement,
    linkImportUrlElement,
    linkImportSubmitElement,
    linkImportStatusElement,
    linkReviewCancelElement,
    linkReviewFormElement,
    reviewTitleElement,
    reviewTypeElement,
    reviewDescriptionElement,
    reviewLatitudeElement,
    reviewLongitudeElement,
    reviewLinkElement,
    reviewPhotoElement,
    shareMapFormElement,
    shareMapNameElement,
    updateSharedMapButtonElement,
    uploadLabelElement,
  } = elements;

  const sharedView = (() => ({
    shareId: appShellElement.dataset.shareId ?? "",
    editSecret: appShellElement.dataset.editSecret ?? "",
    isSharedView: appShellElement.dataset.sharedView === "true",
  }))();

  let map: L.Map | undefined;
  let markers: L.Marker[] = [];
  let activeLocationButtons: HTMLButtonElement[] = [];
  let currentCsvText = "";
  let currentSharedMapName: string | null = null;
  let canEditSharedMap = false;
  const mobileViewportQuery = window.matchMedia("(max-width: 900px)");

  const isMobileViewport = () => mobileViewportQuery.matches;

  const setMobileListExpanded = (expanded: boolean) => {
    listPanelElement.classList.toggle("is-mobile-expanded", expanded);
    mobileListToggleElement.setAttribute("aria-expanded", expanded ? "true" : "false");
  };

  const closeMobileActionsPanel = () => {
    mobileActionsBackdropElement.hidden = true;
    mobileActionsPanelElement.hidden = true;
    document.body.style.overflow = isMobileViewport() ? "hidden" : "";
  };

  const openMobileActionsPanel = () => {
    mobileActionsBackdropElement.hidden = false;
    mobileActionsPanelElement.hidden = false;
    document.body.style.overflow = "hidden";
  };

  const closeMobileDetailPanel = () => {
    mobileDetailBackdropElement.hidden = true;
    mobileDetailPanelElement.hidden = true;
    document.body.style.overflow = isMobileViewport() ? "hidden" : "";
  };

  const openMobileDetailPanel = (location: MobileDetailLocation) => {
    const safePhoto = location.photo ? sanitizeExternalUrl(location.photo) : undefined;
    const safeLink = location.link ? sanitizeExternalUrl(location.link) : undefined;

    mobileDetailTitleElement.textContent = location.title;
    mobileDetailTypeElement.textContent = location.type;
    mobileDetailDescriptionElement.textContent = location.description || "No description yet.";
    mobileDetailFallbackElement.textContent = emojiForType(location.type);
    mobileDetailMediaElement.classList.toggle("is-fallback", !safePhoto);
    mobileDetailPhotoElement.hidden = !safePhoto;
    mobileDetailPhotoElement.removeAttribute(photoLoadErrorAttribute);

    if (safePhoto) {
      mobileDetailPhotoElement.src = safePhoto;
      mobileDetailPhotoElement.alt = location.title;
    } else {
      mobileDetailPhotoElement.removeAttribute("src");
      mobileDetailPhotoElement.alt = "";
    }

    mobileDetailLinkElement.hidden = !safeLink;

    if (safeLink) {
      mobileDetailLinkElement.href = safeLink;
    } else {
      mobileDetailLinkElement.removeAttribute("href");
    }

    bindPhotoFallbacks(mobileDetailPanelElement);
    mobileDetailBackdropElement.hidden = false;
    mobileDetailPanelElement.hidden = false;
    document.body.style.overflow = "hidden";
  };

  const showLocationDetails = (location: LocationPin, index: number) => {
    if (!map) {
      return;
    }

    const marker = markers[index];

    if (!marker) {
      return;
    }

    setActiveLocation(index);
    const latLng = marker.getLatLng();
    map.setView(latLng, Math.max(map.getZoom(), isMobileViewport() ? 10 : 11), { animate: true });

    if (isMobileViewport()) {
      setMobileListExpanded(false);
      openMobileDetailPanel(location);
      marker.closePopup();
      return;
    }

    marker.openPopup();
  };

  const reviewModal = createReviewModalController({
    elements: {
      backdropElement: elements.linkReviewBackdropElement,
      panelElement: elements.linkReviewPanelElement,
      formElement: elements.linkReviewFormElement,
      notesElement: elements.linkReviewNotesElement,
      titleElement: reviewTitleElement,
      typeElement: reviewTypeElement,
      descriptionElement: reviewDescriptionElement,
      latitudeElement: reviewLatitudeElement,
      longitudeElement: reviewLongitudeElement,
      linkElement: reviewLinkElement,
      photoElement: reviewPhotoElement,
    },
    createReviewDraft,
  });

  const shareModal = createShareModalController({
    elements: {
      backdropElement: elements.shareMapBackdropElement,
      panelElement: elements.shareMapPanelElement,
      formElement: shareMapFormElement,
      nameElement: shareMapNameElement,
      statusElement: elements.shareMapStatusElement,
      resultsElement: elements.shareMapResultsElement,
      publicUrlElement: elements.sharePublicUrlElement,
      editUrlElement: elements.shareEditUrlElement,
      submitElement: elements.shareMapSubmitElement,
      actionsElement: elements.shareMapActionsElement,
      copyPublicElement: elements.shareMapCopyPublicElement,
      copyEditElement: elements.shareMapCopyEditElement,
      closeElement: elements.shareMapCloseElement,
    },
  });

  const setImportStatusMessage = (message: string, isError = false) => {
    linkImportStatusElement.textContent = message;
    linkImportStatusElement.classList.toggle("is-error", isError);
  };

  const setStatusMessage = (message: string, isError = false) => {
    storageStatusElement.textContent = message;
    storageStatusElement.classList.toggle("is-error", isError);
  };

  const buildDownloadFilename = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `holiday-map-${year}-${month}-${day}.csv`;
  };

  const getStoredCsvText = () => window.localStorage.getItem(storageKey);

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
    const hideShareCreation = sharedView.isSharedView;
    importPanelElement.hidden = isReadOnlySharedView;
    uploadLabelElement.hidden = isReadOnlySharedView;
    uploadInputElement.hidden = isReadOnlySharedView;
    clearButtonElement.hidden = isReadOnlySharedView;
    updateSharedMapButtonElement.hidden = !isEditableSharedView;
    mobileAddLinkElement.hidden = isReadOnlySharedView;
    mobileClearButtonElement.hidden = isReadOnlySharedView;
    mobileShareButtonElement.hidden = hideShareCreation;
    mobileUpdateSharedMapButtonElement.hidden = !isEditableSharedView;
    mobileActionsToggleElement.hidden = false;
    mobileUploadButtonElement.hidden = isReadOnlySharedView;
  };

  const updateCsvUtilityState = () => {
    const hasCsv = !!getStoredCsvText();
    downloadButtonElement.disabled = sharedView.isSharedView ? false : !hasCsv;
    shareButtonElement.disabled = sharedView.isSharedView || !hasShareableCsv(getStoredCsvText() ?? "");
    updateSharedMapButtonElement.disabled = !canEditSharedMap || !hasShareableCsv(currentCsvText);
    mobileDownloadButtonElement.disabled = downloadButtonElement.disabled;
    mobileShareButtonElement.disabled = shareButtonElement.disabled;
    mobileUpdateSharedMapButtonElement.disabled = updateSharedMapButtonElement.disabled;
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
      button.classList.toggle("is-active", Number(button.dataset.locationIndex) === activeIndex);
    });
  };

  const renderWarnings = (warnings: string[]) => {
    warningListElement.innerHTML = warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("");
    warningBoxElement.hidden = warnings.length === 0;
  };

  const renderMappedList = (locations: LocationPin[]) => {
    mappedListElement.innerHTML = locations
      .map((location, index) => {
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
      })
      .join("");

    mappedListElement.hidden = locations.length === 0;
    activeLocationButtons = Array.from(mappedListElement.querySelectorAll<HTMLButtonElement>("[data-location-index]"));
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
      referrerPolicy: "strict-origin-when-cross-origin",
    }).addTo(map);

    preventMapScrollFrom(listPanelElement);
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
        popupParts.push(`<p class="popup-link"><a href="${escapeHtml(safeLink)}" target="_blank" rel="noreferrer">Open link</a></p>`);
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

        if (isMobileViewport()) {
          openMobileDetailPanel(location);
          marker.closePopup();
        }
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
        const location = locations[index];

        if (!location) {
          return;
        }

        showLocationDetails(location, index);
      });
    });

    setActiveLocation(0);
  };

  const renderParsedCsv = (csvText: string, statusMessage: string) => {
    const { locations, pendingLocations, warnings } = parseLocationsCsv(csvText);

    currentCsvText = csvText;
    pinCountElement.textContent = `${locations.length} ${locations.length === 1 ? "pin" : "pins"}`;
    mobilePinCountElement.textContent = pinCountElement.textContent;
    mobileListCountElement.textContent = pinCountElement.textContent;
    renderWarnings(warnings);
    renderMappedList(locations);
    renderPendingList(pendingLocations);
    renderEmptyState(locations, pendingLocations);
    renderMap(locations);
    setStatusMessage(statusMessage);
  };

  const persistImportedRows = (rows: ImportedLocationDraft[], statusMessage: string) => {
    const existingCsvText = getStoredCsvText() ?? createEmptyCsv();
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
    mobilePinCountElement.textContent = "0 pins";
    mobileListCountElement.textContent = "0 pins";
    emptyStateElement.hidden = false;
    activeLocationButtons = [];
    closeMobileDetailPanel();
    renderMap([]);
    updateCsvUtilityState();
  };

  const restoreSharedCsv = async () => {
    if (!sharedView.isSharedView || !sharedView.shareId) {
      return false;
    }

    try {
      const sharedMap = await fetchShareMap(sharedView.shareId, sharedView.editSecret);
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
    const storedCsv = getStoredCsvText();

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

    const csvText = getStoredCsvText() ?? currentCsvText;

    if (!csvText) {
      updateCsvUtilityState();
      setStatusMessage("Nothing to update yet.", true);
      return;
    }

    updateSharedMapButtonElement.disabled = true;
    setStatusMessage("Updating shared map...");

    try {
      const updated = await updateShareMap(sharedView.shareId, {
        name: currentSharedMapName ?? undefined,
        csvText,
        editSecret: sharedView.editSecret,
      });
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
    const csvText = sharedView.isSharedView ? currentCsvText : getStoredCsvText();

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

  mobileDownloadButtonElement.addEventListener("click", () => {
    closeMobileActionsPanel();
    downloadButtonElement.click();
  });

  shareButtonElement.addEventListener("click", () => {
    if (shareButtonElement.disabled || sharedView.isSharedView) {
      return;
    }

    const triggerElement = document.activeElement instanceof HTMLElement ? document.activeElement : shareButtonElement;
    shareModal.open(triggerElement);
  });

  mobileShareButtonElement.addEventListener("click", () => {
    closeMobileActionsPanel();
    if (!mobileShareButtonElement.disabled) {
      shareButtonElement.click();
    }
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
      const imported = await importLink({ url });

      if (hasCompleteImportData(imported)) {
        persistImportedRows([imported], `Imported ${imported.title} from ${imported.link}.`);
        reviewModal.close();
        linkImportFormElement.reset();
        setImportStatusMessage(`Imported ${imported.title}.`);
      } else {
        const triggerElement = document.activeElement instanceof HTMLElement ? document.activeElement : linkImportUrlElement;
        reviewModal.open(imported, triggerElement);
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
    reviewModal.close();
    setImportStatusMessage("Cancelled review.");
  });

  mobileAddLinkElement.addEventListener("click", () => {
    closeMobileActionsPanel();
    setMobileListExpanded(true);
    linkImportUrlElement.focus();
  });

  mobileUploadButtonElement.addEventListener("click", () => {
    closeMobileActionsPanel();
    uploadLabelElement.click();
  });

  mobileActionsToggleElement.addEventListener("click", () => {
    openMobileActionsPanel();
  });

  mobileActionsCloseElement.addEventListener("click", () => {
    closeMobileActionsPanel();
  });

  mobileActionsBackdropElement.addEventListener("click", (event) => {
    if (event.target === mobileActionsBackdropElement) {
      closeMobileActionsPanel();
    }
  });

  mobileListToggleElement.addEventListener("click", () => {
    setMobileListExpanded(!listPanelElement.classList.contains("is-mobile-expanded"));
  });

  mobileDetailCloseElement.addEventListener("click", () => {
    closeMobileDetailPanel();
  });

  mobileDetailBackdropElement.addEventListener("click", (event) => {
    if (event.target === mobileDetailBackdropElement) {
      closeMobileDetailPanel();
    }
  });

  mobileClearButtonElement.addEventListener("click", () => {
    closeMobileActionsPanel();
    clearButtonElement.click();
  });

  mobileUpdateSharedMapButtonElement.addEventListener("click", () => {
    closeMobileActionsPanel();
    if (!mobileUpdateSharedMapButtonElement.disabled) {
      updateSharedMapButtonElement.click();
    }
  });

  elements.shareMapCloseElement.addEventListener("click", () => {
    shareModal.close();
    setStatusMessage("Closed share dialog.");
  });

  elements.shareMapCopyPublicElement.addEventListener("click", async () => {
    await shareModal.copyPublicLink();
  });

  elements.shareMapCopyEditElement.addEventListener("click", async () => {
    await shareModal.copyEditLink();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && reviewModal.isOpen()) {
      event.preventDefault();
      reviewModal.close();
      setImportStatusMessage("Cancelled review.");
      return;
    }

    if (event.key === "Escape" && shareModal.isOpen()) {
      event.preventDefault();
      shareModal.close();
      setStatusMessage("Closed share dialog.");
      return;
    }

    if (event.key === "Escape" && !mobileActionsPanelElement.hidden) {
      event.preventDefault();
      closeMobileActionsPanel();
      return;
    }

    if (event.key === "Escape" && !mobileDetailPanelElement.hidden) {
      event.preventDefault();
      closeMobileDetailPanel();
    }
  });

  shareMapFormElement.addEventListener("submit", async (event) => {
    event.preventDefault();

    const csvText = getStoredCsvText();

    if (!csvText) {
      shareModal.failCreate("Nothing to share yet.");
      return;
    }

    shareModal.beginCreate();

    try {
      const shared = await createShareMap({
        name: shareModal.getNameValue(),
        csvText,
      });
      shareModal.completeCreate(shared.publicUrl, shared.editUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not create share link.";
      shareModal.failCreate(message);
    }
  });

  linkReviewFormElement.addEventListener("submit", (event) => {
    event.preventDefault();

    const pendingReviewDraft = reviewModal.getPendingDraft();

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
    reviewModal.close();
    linkImportFormElement.reset();
    setImportStatusMessage(`Saved ${finalized.title}.`);
  });

  syncSharedViewControls();
  setMobileListExpanded(false);

  restoreSharedCsv().then((handled) => {
    if (!handled) {
      restoreStoredCsv();
      updateCsvUtilityState();
    }
  });
}
