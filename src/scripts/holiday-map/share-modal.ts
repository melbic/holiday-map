type ShareModalState = "idle" | "submitting" | "created";

type ShareModalElements = {
  backdropElement: HTMLElement;
  panelElement: HTMLElement;
  formElement: HTMLFormElement;
  nameElement: HTMLInputElement;
  statusElement: HTMLElement;
  resultsElement: HTMLElement;
  publicUrlElement: HTMLInputElement;
  editUrlElement: HTMLInputElement;
  submitElement: HTMLButtonElement;
  actionsElement: HTMLElement;
  copyPublicElement: HTMLButtonElement;
  copyEditElement: HTMLButtonElement;
  closeElement: HTMLButtonElement;
};

type ShareModalControllerOptions = {
  elements: ShareModalElements;
};

const defaultShareStatus = "Create a public read link plus a private edit link for this map.";

export function createShareModalController({ elements }: ShareModalControllerOptions) {
  let state: ShareModalState = "idle";
  let returnFocusElement: HTMLElement | undefined;
  const submitLabel = elements.submitElement.textContent?.trim() || "Create share link";

  const setShareStatusMessage = (message: string, isError = false) => {
    elements.statusElement.textContent = message;
    elements.statusElement.classList.toggle("is-error", isError);
  };

  const setSubmitContent = (label: string, loading = false) => {
    if (!loading) {
      elements.submitElement.textContent = label;
      return;
    }

    elements.submitElement.innerHTML = '<span class="button-spinner" aria-hidden="true"></span><span>Creating share links...</span>';
  };

  const renderState = (nextState: ShareModalState) => {
    state = nextState;
    const isSubmitting = nextState === "submitting";
    const isCreated = nextState === "created";

    elements.resultsElement.hidden = !isCreated;
    elements.actionsElement.hidden = isCreated;
    elements.nameElement.readOnly = isCreated;
    elements.nameElement.disabled = isSubmitting;
    elements.submitElement.disabled = isSubmitting;
    elements.closeElement.disabled = isSubmitting;
    elements.copyPublicElement.disabled = !isCreated;
    elements.copyEditElement.disabled = !isCreated;

    if (isSubmitting) {
      setSubmitContent("Creating share links...", true);
      return;
    }

    setSubmitContent(submitLabel);
  };

  const close = () => {
    elements.backdropElement.hidden = true;
    elements.panelElement.hidden = true;
    elements.formElement.reset();
    elements.publicUrlElement.value = "";
    elements.editUrlElement.value = "";
    renderState("idle");
    setShareStatusMessage(defaultShareStatus);
    document.body.style.overflow = "";
    returnFocusElement?.focus();
    returnFocusElement = undefined;
  };

  const open = (triggerElement: HTMLElement) => {
    returnFocusElement = triggerElement;
    elements.backdropElement.hidden = false;
    elements.panelElement.hidden = false;
    renderState("idle");
    setShareStatusMessage(defaultShareStatus);
    document.body.style.overflow = "hidden";
    elements.nameElement.focus();
  };

  const copyToClipboard = async (value: string, successMessage: string) => {
    if (!navigator.clipboard?.writeText) {
      setShareStatusMessage("Clipboard copy is not available in this browser.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setShareStatusMessage(successMessage);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not copy share link.";
      setShareStatusMessage(message, true);
    }
  };

  return {
    close,
    open,
    isOpen: () => !elements.panelElement.hidden,
    beginCreate: () => {
      renderState("submitting");
      setShareStatusMessage("Creating share links...");
    },
    completeCreate: (publicUrl: string, editUrl: string) => {
      elements.publicUrlElement.value = publicUrl;
      elements.editUrlElement.value = editUrl;
      renderState("created");
      setShareStatusMessage("Share links created.");
    },
    failCreate: (message: string) => {
      renderState("idle");
      setShareStatusMessage(message, true);
    },
    getNameValue: () => elements.nameElement.value.trim(),
    copyPublicLink: async () => copyToClipboard(elements.publicUrlElement.value, "Copied the public link."),
    copyEditLink: async () => copyToClipboard(elements.editUrlElement.value, "Copied the private edit link."),
  };
}
