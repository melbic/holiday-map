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
  mobilePinCountElement: HTMLElement;
  reviewCountElement: HTMLElement;
  mobileListCountElement: HTMLElement;
  storageStatusElement: HTMLElement;
  uploadInputElement: HTMLInputElement;
  downloadButtonElement: HTMLButtonElement;
  shareButtonElement: HTMLButtonElement;
  clearButtonElement: HTMLButtonElement;
  mobileActionsToggleElement: HTMLButtonElement;
  mobileActionsBackdropElement: HTMLElement;
  mobileActionsPanelElement: HTMLElement;
  mobileActionsCloseElement: HTMLButtonElement;
  mobileUploadButtonElement: HTMLButtonElement;
  mobileAddLinkElement: HTMLButtonElement;
  mobileDownloadButtonElement: HTMLButtonElement;
  mobileShareButtonElement: HTMLButtonElement;
  mobileUpdateSharedMapButtonElement: HTMLButtonElement;
  mobileClearButtonElement: HTMLButtonElement;
  mobileListToggleElement: HTMLButtonElement;
  mobileDetailBackdropElement: HTMLElement;
  mobileDetailPanelElement: HTMLElement;
  mobileDetailCloseElement: HTMLButtonElement;
  mobileDetailTitleElement: HTMLElement;
  mobileDetailMediaElement: HTMLElement;
  mobileDetailPhotoElement: HTMLImageElement;
  mobileDetailFallbackElement: HTMLElement;
  mobileDetailTypeElement: HTMLElement;
  mobileDetailDescriptionElement: HTMLElement;
  mobileDetailLinkElement: HTMLAnchorElement;
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
  const mobilePinCountElement = getElementById("mobile-pin-count", HTMLElement);
  const reviewCountElement = getElementById("review-count", HTMLElement);
  const mobileListCountElement = getElementById("mobile-list-count", HTMLElement);
  const storageStatusElement = getElementById("storage-status", HTMLElement);
  const uploadInputElement = getElementById("csv-upload", HTMLInputElement);
  const downloadButtonElement = getElementById("download-csv", HTMLButtonElement);
  const shareButtonElement = getElementById("share-map", HTMLButtonElement);
  const clearButtonElement = getElementById("clear-csv", HTMLButtonElement);
  const mobileActionsToggleElement = getElementById("mobile-actions-toggle", HTMLButtonElement);
  const mobileActionsBackdropElement = getElementById("mobile-actions-backdrop", HTMLElement);
  const mobileActionsPanelElement = getElementById("mobile-actions-panel", HTMLElement);
  const mobileActionsCloseElement = getElementById("mobile-actions-close", HTMLButtonElement);
  const mobileUploadButtonElement = getElementById("mobile-upload-csv", HTMLButtonElement);
  const mobileAddLinkElement = getElementById("mobile-add-link", HTMLButtonElement);
  const mobileDownloadButtonElement = getElementById("mobile-download-csv", HTMLButtonElement);
  const mobileShareButtonElement = getElementById("mobile-share-map", HTMLButtonElement);
  const mobileUpdateSharedMapButtonElement = getElementById("mobile-update-shared-map", HTMLButtonElement);
  const mobileClearButtonElement = getElementById("mobile-clear-csv", HTMLButtonElement);
  const mobileListToggleElement = getElementById("mobile-list-toggle", HTMLButtonElement);
  const mobileDetailBackdropElement = getElementById("mobile-detail-backdrop", HTMLElement);
  const mobileDetailPanelElement = getElementById("mobile-detail-panel", HTMLElement);
  const mobileDetailCloseElement = getElementById("mobile-detail-close", HTMLButtonElement);
  const mobileDetailTitleElement = getElementById("mobile-detail-title", HTMLElement);
  const mobileDetailMediaElement = getElementById("mobile-detail-media", HTMLElement);
  const mobileDetailPhotoElement = getElementById("mobile-detail-photo", HTMLImageElement);
  const mobileDetailFallbackElement = getElementById("mobile-detail-fallback", HTMLElement);
  const mobileDetailTypeElement = getElementById("mobile-detail-type", HTMLElement);
  const mobileDetailDescriptionElement = getElementById("mobile-detail-description", HTMLElement);
  const mobileDetailLinkElement = getElementById("mobile-detail-link", HTMLAnchorElement);
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
    || !mobilePinCountElement
    || !reviewCountElement
    || !mobileListCountElement
    || !storageStatusElement
    || !uploadInputElement
    || !downloadButtonElement
    || !shareButtonElement
    || !clearButtonElement
    || !mobileActionsToggleElement
    || !mobileActionsBackdropElement
    || !mobileActionsPanelElement
    || !mobileActionsCloseElement
    || !mobileUploadButtonElement
    || !mobileAddLinkElement
    || !mobileDownloadButtonElement
    || !mobileShareButtonElement
    || !mobileUpdateSharedMapButtonElement
    || !mobileClearButtonElement
    || !mobileListToggleElement
    || !mobileDetailBackdropElement
    || !mobileDetailPanelElement
    || !mobileDetailCloseElement
    || !mobileDetailTitleElement
    || !mobileDetailMediaElement
    || !mobileDetailPhotoElement
    || !mobileDetailFallbackElement
    || !mobileDetailTypeElement
    || !mobileDetailDescriptionElement
    || !mobileDetailLinkElement
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
