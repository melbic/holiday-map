type ElementConstructor<T extends Element> = abstract new (...args: never[]) => T;

export type HolidayMapElements = {
  appShellElement: HTMLElement;
  mapElement: HTMLElement;
  mappedListElement: HTMLUListElement;
  reviewListElement: HTMLUListElement;
  warningBoxElement: HTMLElement;
  warningListElement: HTMLUListElement;
  reviewPanelElement: HTMLElement;
  importPanelElement: HTMLElement;
  emptyStateElement: HTMLElement;
  pinCountElement: HTMLElement;
  reviewCountElement: HTMLElement;
  storageStatusElement: HTMLElement;
  uploadInputElement: HTMLInputElement;
  downloadButtonElement: HTMLButtonElement;
  shareButtonElement: HTMLButtonElement;
  clearButtonElement: HTMLButtonElement;
  listPanelElement: HTMLElement;
  linkImportFormElement: HTMLFormElement;
  linkImportUrlElement: HTMLInputElement;
  linkImportSubmitElement: HTMLButtonElement;
  linkImportStatusElement: HTMLElement;
  linkReviewBackdropElement: HTMLElement;
  linkReviewPanelElement: HTMLElement;
  linkReviewFormElement: HTMLFormElement;
  linkReviewNotesElement: HTMLElement;
  linkReviewCancelElement: HTMLButtonElement;
  reviewTitleElement: HTMLInputElement;
  reviewTypeElement: HTMLInputElement;
  reviewDescriptionElement: HTMLTextAreaElement;
  reviewLatitudeElement: HTMLInputElement;
  reviewLongitudeElement: HTMLInputElement;
  reviewLinkElement: HTMLInputElement;
  reviewPhotoElement: HTMLInputElement;
  shareMapBackdropElement: HTMLElement;
  shareMapPanelElement: HTMLElement;
  shareMapFormElement: HTMLFormElement;
  shareMapNameElement: HTMLInputElement;
  shareMapStatusElement: HTMLElement;
  shareMapResultsElement: HTMLElement;
  sharePublicUrlElement: HTMLInputElement;
  shareEditUrlElement: HTMLInputElement;
  shareMapSubmitElement: HTMLButtonElement;
  shareMapActionsElement: HTMLElement;
  shareMapCopyPublicElement: HTMLButtonElement;
  shareMapCopyEditElement: HTMLButtonElement;
  shareMapCloseElement: HTMLButtonElement;
  updateSharedMapButtonElement: HTMLButtonElement;
  uploadLabelElement: HTMLLabelElement;
};

function getElementById<T extends Element>(id: string, ctor: ElementConstructor<T>) {
  const element = document.getElementById(id);
  return element instanceof ctor ? element : undefined;
}

function queryElement<T extends Element>(selector: string, ctor: ElementConstructor<T>) {
  const element = document.querySelector(selector);
  return element instanceof ctor ? element : undefined;
}

export function getHolidayMapElements(): HolidayMapElements | undefined {
  const appShellElement = getElementById("app-shell", HTMLElement);
  const mapElement = getElementById("map", HTMLElement);
  const mappedListElement = getElementById("mapped-list", HTMLUListElement);
  const reviewListElement = getElementById("review-list", HTMLUListElement);
  const warningBoxElement = getElementById("warning-box", HTMLElement);
  const warningListElement = getElementById("warning-list", HTMLUListElement);
  const reviewPanelElement = getElementById("review-panel", HTMLElement);
  const importPanelElement = queryElement(".import-panel", HTMLElement);
  const emptyStateElement = getElementById("list-empty-state", HTMLElement);
  const pinCountElement = getElementById("pin-count", HTMLElement);
  const reviewCountElement = getElementById("review-count", HTMLElement);
  const storageStatusElement = getElementById("storage-status", HTMLElement);
  const uploadInputElement = getElementById("csv-upload", HTMLInputElement);
  const downloadButtonElement = getElementById("download-csv", HTMLButtonElement);
  const shareButtonElement = getElementById("share-map", HTMLButtonElement);
  const clearButtonElement = getElementById("clear-csv", HTMLButtonElement);
  const listPanelElement = queryElement(".list-panel", HTMLElement);
  const linkImportFormElement = getElementById("link-import-form", HTMLFormElement);
  const linkImportUrlElement = getElementById("link-import-url", HTMLInputElement);
  const linkImportSubmitElement = getElementById("link-import-submit", HTMLButtonElement);
  const linkImportStatusElement = getElementById("link-import-status", HTMLElement);
  const linkReviewBackdropElement = getElementById("link-review-backdrop", HTMLElement);
  const linkReviewPanelElement = getElementById("link-review-panel", HTMLElement);
  const linkReviewFormElement = getElementById("link-review-form", HTMLFormElement);
  const linkReviewNotesElement = getElementById("link-review-notes", HTMLElement);
  const linkReviewCancelElement = getElementById("link-review-cancel", HTMLButtonElement);
  const reviewTitleElement = getElementById("review-title", HTMLInputElement);
  const reviewTypeElement = getElementById("review-type", HTMLInputElement);
  const reviewDescriptionElement = getElementById("review-description", HTMLTextAreaElement);
  const reviewLatitudeElement = getElementById("review-latitude", HTMLInputElement);
  const reviewLongitudeElement = getElementById("review-longitude", HTMLInputElement);
  const reviewLinkElement = getElementById("review-link", HTMLInputElement);
  const reviewPhotoElement = getElementById("review-photo", HTMLInputElement);
  const shareMapBackdropElement = getElementById("share-map-backdrop", HTMLElement);
  const shareMapPanelElement = getElementById("share-map-panel", HTMLElement);
  const shareMapFormElement = getElementById("share-map-form", HTMLFormElement);
  const shareMapNameElement = getElementById("share-map-name", HTMLInputElement);
  const shareMapStatusElement = getElementById("share-map-status", HTMLElement);
  const shareMapResultsElement = getElementById("share-map-results", HTMLElement);
  const sharePublicUrlElement = getElementById("share-public-url", HTMLInputElement);
  const shareEditUrlElement = getElementById("share-edit-url", HTMLInputElement);
  const shareMapSubmitElement = getElementById("share-map-submit", HTMLButtonElement);
  const shareMapActionsElement = getElementById("share-map-actions", HTMLElement);
  const shareMapCopyPublicElement = getElementById("share-map-copy-public", HTMLButtonElement);
  const shareMapCopyEditElement = getElementById("share-map-copy-edit", HTMLButtonElement);
  const shareMapCloseElement = getElementById("share-map-close", HTMLButtonElement);
  const updateSharedMapButtonElement = getElementById("update-shared-map", HTMLButtonElement);
  const uploadLabelElement = queryElement('label[for="csv-upload"]', HTMLLabelElement);

  if (
    !appShellElement
    || !mapElement
    || !mappedListElement
    || !reviewListElement
    || !warningBoxElement
    || !warningListElement
    || !reviewPanelElement
    || !importPanelElement
    || !emptyStateElement
    || !pinCountElement
    || !reviewCountElement
    || !storageStatusElement
    || !uploadInputElement
    || !downloadButtonElement
    || !shareButtonElement
    || !clearButtonElement
    || !listPanelElement
    || !linkImportFormElement
    || !linkImportUrlElement
    || !linkImportSubmitElement
    || !linkImportStatusElement
    || !linkReviewBackdropElement
    || !linkReviewPanelElement
    || !linkReviewFormElement
    || !linkReviewNotesElement
    || !linkReviewCancelElement
    || !reviewTitleElement
    || !reviewTypeElement
    || !reviewDescriptionElement
    || !reviewLatitudeElement
    || !reviewLongitudeElement
    || !reviewLinkElement
    || !reviewPhotoElement
    || !shareMapBackdropElement
    || !shareMapPanelElement
    || !shareMapFormElement
    || !shareMapNameElement
    || !shareMapStatusElement
    || !shareMapResultsElement
    || !sharePublicUrlElement
    || !shareEditUrlElement
    || !shareMapSubmitElement
    || !shareMapActionsElement
    || !shareMapCopyPublicElement
    || !shareMapCopyEditElement
    || !shareMapCloseElement
    || !updateSharedMapButtonElement
    || !uploadLabelElement
  ) {
    return undefined;
  }

  return {
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
    reviewCountElement,
    storageStatusElement,
    uploadInputElement,
    downloadButtonElement,
    shareButtonElement,
    clearButtonElement,
    listPanelElement,
    linkImportFormElement,
    linkImportUrlElement,
    linkImportSubmitElement,
    linkImportStatusElement,
    linkReviewBackdropElement,
    linkReviewPanelElement,
    linkReviewFormElement,
    linkReviewNotesElement,
    linkReviewCancelElement,
    reviewTitleElement,
    reviewTypeElement,
    reviewDescriptionElement,
    reviewLatitudeElement,
    reviewLongitudeElement,
    reviewLinkElement,
    reviewPhotoElement,
    shareMapBackdropElement,
    shareMapPanelElement,
    shareMapFormElement,
    shareMapNameElement,
    shareMapStatusElement,
    shareMapResultsElement,
    sharePublicUrlElement,
    shareEditUrlElement,
    shareMapSubmitElement,
    shareMapActionsElement,
    shareMapCopyPublicElement,
    shareMapCopyEditElement,
    shareMapCloseElement,
    updateSharedMapButtonElement,
    uploadLabelElement,
  };
}
