import type { EditableImportedLocationDraft, ImportedLocationDraft } from "../../lib/link-importer.ts";

type ReviewModalElements = {
  backdropElement: HTMLElement;
  panelElement: HTMLElement;
  formElement: HTMLFormElement;
  notesElement: HTMLElement;
  titleElement: HTMLInputElement;
  typeElement: HTMLInputElement;
  descriptionElement: HTMLTextAreaElement;
  latitudeElement: HTMLInputElement;
  longitudeElement: HTMLInputElement;
  linkElement: HTMLInputElement;
  photoElement: HTMLInputElement;
};

type ReviewModalControllerOptions = {
  elements: ReviewModalElements;
  createReviewDraft: (row: ImportedLocationDraft) => EditableImportedLocationDraft;
};

export function createReviewModalController({ elements, createReviewDraft }: ReviewModalControllerOptions) {
  let pendingDraft: EditableImportedLocationDraft | undefined;
  let returnFocusElement: HTMLElement | undefined;

  return {
    open: (row: ImportedLocationDraft, triggerElement: HTMLElement) => {
      pendingDraft = createReviewDraft(row);
      returnFocusElement = triggerElement;
      elements.titleElement.value = row.title;
      elements.typeElement.value = row.type;
      elements.descriptionElement.value = row.description;
      elements.latitudeElement.value = row.latitude?.toString() ?? "";
      elements.longitudeElement.value = row.longitude?.toString() ?? "";
      elements.linkElement.value = row.link;
      elements.photoElement.value = row.photo;
      elements.notesElement.textContent =
        row.notes.length > 0 ? row.notes.join(" ") : "Complete the missing fields before saving this row.";
      elements.backdropElement.hidden = false;
      elements.panelElement.hidden = false;
      document.body.style.overflow = "hidden";
      elements.titleElement.focus();
    },
    close: () => {
      pendingDraft = undefined;
      elements.backdropElement.hidden = true;
      elements.panelElement.hidden = true;
      elements.notesElement.textContent = "";
      elements.formElement.reset();
      document.body.style.overflow = "";
      returnFocusElement?.focus();
      returnFocusElement = undefined;
    },
    isOpen: () => !elements.panelElement.hidden,
    getPendingDraft: () => pendingDraft,
  };
}
