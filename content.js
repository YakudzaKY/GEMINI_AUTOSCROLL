// --- Selectors ---
const SCROLL_CONTAINER_SELECTOR = 'infinite-scroller[data-test-id="chat-history-container"]';
const STOP_BUTTON_ICON_SELECTOR = 'mat-icon[fonticon="stop"]';

// Elements that signal meaningful content getting added to the chat.
const TARGET_TAGS = ['P', 'IMG', 'TABLE', 'UL', 'OL', 'LI', 'PRE', 'CODE'];
const TARGET_TAGS_SET = new Set(TARGET_TAGS);

const OBSERVER_DEBOUNCE_MS = 100;
const NEAR_BOTTOM_THRESHOLD_PX = 1;
const SCROLL_SMOOTH_DISTANCE_THRESHOLD_PX = 150;
const MIN_SCROLL_INTERVAL_MS = 250;
const MAX_NODES_TO_INSPECT = 400;
const MODEL_RESPONSE_SELECTOR = 'model-response';
const MODEL_RESPONSE_TAG_NAME = 'MODEL-RESPONSE';
const MODEL_RESPONSE_STORAGE_KEY = 'geminiRemovedResponses';
const MAX_STORED_MODEL_RESPONSES = 10;

let scrollContainer = null;
let debounceTimer = null;
let pendingAnimationFrame = null;
let throttleTimeoutId = null;
let lastScrollTime = 0;
let lastKnownModelResponse = null;
const modelResponseSnapshots = new WeakMap();

const bodyObserver = new MutationObserver(handleMutations);
observeBodyWhenReady();

// Initial scroll after load gives the chat a chance to settle.
setTimeout(smartScrollToBottom, 500);

function observeBodyWhenReady() {
  if (document.body) {
    bodyObserver.observe(document.body, { childList: true, subtree: true });
    console.log('Observer attached to document body.');
    return;
  }

  window.addEventListener(
    'DOMContentLoaded',
    () => {
      if (document.body) {
        bodyObserver.observe(document.body, { childList: true, subtree: true });
        console.log('Observer attached to document body after DOMContentLoaded.');
      }
    },
    { once: true }
  );
}

function handleMutations(mutationsList) {
  const container = getScrollContainer();
  if (!container) {
    lastKnownModelResponse = null;
    return;
  }

  let shouldScroll = false;
  let loggedTailRemoval = false;
  const previousLastModelResponse = lastKnownModelResponse;
  let snapshotRequested = false;

  for (const mutation of mutationsList) {
    if (mutation.type !== 'childList') {
      continue;
    }

    const targetElement =
      mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;

    if (!targetElement) {
      continue;
    }

    if (targetElement !== container && !container.contains(targetElement)) {
      continue;
    }

    if (!loggedTailRemoval && mutation.removedNodes.length > 0) {
      const removedModelResponses = collectModelResponses(mutation.removedNodes);
      const candidate =
        (previousLastModelResponse &&
          removedModelResponses.includes(previousLastModelResponse) &&
          previousLastModelResponse) ||
        (mutation.nextSibling === null && removedModelResponses.length > 0
          ? removedModelResponses[removedModelResponses.length - 1]
          : null);

      if (candidate) {
        loggedTailRemoval = true;
        logRemovedModelResponse(candidate);
      }
    }

    if (shouldScroll || mutation.addedNodes.length === 0) {
      continue;
    }

    if (addedNodesContainTargets(mutation.addedNodes)) {
      shouldScroll = true;
      snapshotRequested = true;
    }
  }

  const currentLastModelResponse = getLastModelResponse(container);
  if (snapshotRequested && currentLastModelResponse) {
    captureModelResponseSnapshot(currentLastModelResponse);
  }

  if (currentLastModelResponse !== lastKnownModelResponse && currentLastModelResponse) {
    captureModelResponseSnapshot(currentLastModelResponse);
  }

  lastKnownModelResponse = currentLastModelResponse;

  if (shouldScroll) {
    debouncedScroll();
  }
}

function addedNodesContainTargets(addedNodes) {
  for (const node of addedNodes) {
    if (nodeHasTargetTag(node)) {
      return true;
    }
  }
  return false;
}

function nodeHasTargetTag(node) {
  const stack = [];
  let inspected = 0;

  if (node.nodeType === Node.ELEMENT_NODE) {
    stack.push(node);
  } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        stack.push(child);
      }
    }
  }

  while (stack.length > 0) {
    const current = stack.pop();

    if (current.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    inspected += 1;
    if (inspected > MAX_NODES_TO_INSPECT) {
      return true;
    }

    const tagName = current.nodeName.toUpperCase();
    if (TARGET_TAGS_SET.has(tagName)) {
      return true;
    }

    for (let i = current.children.length - 1; i >= 0; i -= 1) {
      stack.push(current.children[i]);
    }
  }

  return false;
}

function collectModelResponses(removedNodes) {
  const responses = [];

  for (const node of removedNodes) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node;
      if (element.tagName === MODEL_RESPONSE_TAG_NAME) {
        responses.push(element);
      }
      if (typeof element.querySelectorAll === 'function') {
        responses.push(...element.querySelectorAll(MODEL_RESPONSE_SELECTOR));
      }
      continue;
    }

    if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && node.querySelectorAll) {
      responses.push(...node.querySelectorAll(MODEL_RESPONSE_SELECTOR));
    }
  }

  if (responses.length <= 1) {
    return responses;
  }

  return Array.from(new Set(responses));
}

function getLastModelResponse(container) {
  if (!container) {
    return null;
  }

  try {
    const responses = container.querySelectorAll(MODEL_RESPONSE_SELECTOR);
    if (responses.length === 0) {
      return null;
    }
    return responses[responses.length - 1];
  } catch (error) {
    console.warn('Failed to locate model responses.', error);
    return null;
  }
}

function logRemovedModelResponse(modelResponse) {
  if (!modelResponse) {
    return;
  }

  const cachedSnapshot = modelResponseSnapshots.get(modelResponse);
  if (cachedSnapshot && cachedSnapshot.trim().length > 0) {
    persistRemovedModelResponse(cachedSnapshot);
    modelResponseSnapshots.delete(modelResponse);
    return;
  }

  try {
    const serialized = serializeModelResponse(modelResponse);
    if (!serialized || serialized.trim().length === 0) {
      console.warn('Unable to serialize removed <model-response> contents: empty snapshot.');
      return;
    }
    persistRemovedModelResponse(serialized);
  } catch (error) {
    console.warn('Failed to serialize removed <model-response> contents.', error, modelResponse);
    try {
      const fallback = fallbackSerializeModelResponse(modelResponse);
      if (fallback) {
        persistRemovedModelResponse(fallback);
      }
    } catch (fallbackError) {
      console.warn(
        'Failed to persist fallback serialization for <model-response>.',
        fallbackError,
        modelResponse
      );
    }
  }
}

function serializeModelResponse(modelResponse) {
  if (!modelResponse) {
    return '';
  }

  if (typeof modelResponse.outerHTML === 'string') {
    return modelResponse.outerHTML;
  }

  if (typeof modelResponse.innerHTML === 'string') {
    return modelResponse.innerHTML;
  }

  if (typeof modelResponse.textContent === 'string') {
    return wrapTextContent(modelResponse.textContent);
  }

  return '';
}

function fallbackSerializeModelResponse(modelResponse) {
  if (!modelResponse || typeof modelResponse.textContent !== 'string') {
    return '';
  }

  const trimmed = modelResponse.textContent.trim();
  if (trimmed.length === 0) {
    return '';
  }

  return wrapTextContent(trimmed);
}

function wrapTextContent(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return '';
  }

  return `<pre class="gemini-autoscroll-text">${escapeHtml(text)}</pre>`;
}

function escapeHtml(value) {
  const safe = String(value);
  return safe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function captureModelResponseSnapshot(modelResponse) {
  if (!modelResponse) {
    return;
  }

  try {
    const serialized = serializeModelResponse(modelResponse);
    if (serialized && serialized.trim().length > 0) {
      modelResponseSnapshots.set(modelResponse, serialized);
    }
  } catch (error) {
    console.warn('Failed to cache <model-response> snapshot.', error, modelResponse);
  }
}

function persistRemovedModelResponse(serializedHtml) {
  if (
    typeof chrome === 'undefined' ||
    !chrome.storage ||
    !chrome.storage.local ||
    typeof serializedHtml !== 'string'
  ) {
    return;
  }

  if (serializedHtml.trim().length === 0) {
    return;
  }

  const entry = {
    html: serializedHtml,
    capturedAt: Date.now(),
    length: serializedHtml.length,
  };

  chrome.storage.local.get({ [MODEL_RESPONSE_STORAGE_KEY]: [] }, (result) => {
    if (chrome.runtime && chrome.runtime.lastError) {
      console.warn(
        'Failed to access storage for removed <model-response> contents.',
        chrome.runtime.lastError
      );
      return;
    }

    const existing = Array.isArray(result[MODEL_RESPONSE_STORAGE_KEY])
      ? result[MODEL_RESPONSE_STORAGE_KEY].slice()
      : [];
    existing.push(entry);
    const trimmed = existing.slice(-MAX_STORED_MODEL_RESPONSES);

    chrome.storage.local.set({ [MODEL_RESPONSE_STORAGE_KEY]: trimmed }, () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        console.warn(
          'Failed to persist removed <model-response> contents.',
          chrome.runtime.lastError
        );
      }
    });
  });
}

function debouncedScroll() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (pendingAnimationFrame !== null) {
      return;
    }

    const raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
    if (typeof raf === 'function') {
      pendingAnimationFrame = raf(() => {
        pendingAnimationFrame = null;
        smartScrollToBottom();
      });
      return;
    }

    smartScrollToBottom();
  }, OBSERVER_DEBOUNCE_MS);
}

// --- Scroll Logic ---
function smartScrollToBottom() {
  const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
  const elapsed = now - lastScrollTime;

  if (elapsed < MIN_SCROLL_INTERVAL_MS) {
    if (throttleTimeoutId === null) {
      throttleTimeoutId = setTimeout(() => {
        throttleTimeoutId = null;
        smartScrollToBottom();
      }, MIN_SCROLL_INTERVAL_MS - elapsed);
    }
    return;
  }

  const stopButtonVisible = document.querySelector(STOP_BUTTON_ICON_SELECTOR);
  if (!stopButtonVisible) {
    return;
  }

  const container = getScrollContainer();
  if (!container) {
    console.warn('Scroll container not found during scroll attempt.');
    return;
  }
  lastScrollTime = now;

  const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
  if (distanceFromBottom <= NEAR_BOTTOM_THRESHOLD_PX) {
    return;
  }

  const behavior = distanceFromBottom <= SCROLL_SMOOTH_DISTANCE_THRESHOLD_PX ? 'smooth' : 'auto';
  container.scrollTo({
    top: container.scrollHeight,
    behavior,
  });
}

function getScrollContainer() {
  if (scrollContainer && scrollContainer.isConnected) {
    return scrollContainer;
  }

  scrollContainer = document.querySelector(SCROLL_CONTAINER_SELECTOR);
  return scrollContainer;
}
