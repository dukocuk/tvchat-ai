import { useState, useRef, useCallback } from 'react';

var API_URL = 'https://api.anthropic.com/v1/messages';
var API_VERSION = '2023-06-01';

// Chromium M47 does not have ReadableStream body on fetch responses
var SUPPORTS_STREAMING =
  typeof ReadableStream !== 'undefined' &&
  typeof Response !== 'undefined' &&
  'body' in Response.prototype;

export function useClaudeAPI() {
  var [streaming, setStreaming] = useState(false);
  var [error, setError] = useState(null);
  var abortRef = useRef(null);

  var sendMessage = useCallback(function (apiKey, model, systemPrompt, apiMessages, onToken, onDone) {
    if (abortRef.current) abortRef.current.abort();

    // AbortController is Chromium 66+ and is NOT polyfilled by core-js (it's a
    // DOM API, not ECMAScript). On M47 it's absent, so guard it: the request
    // simply can't be cancelled there and we ignore any late result instead.
    var controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    abortRef.current = controller;
    setStreaming(true);
    setError(null);

    // Call-once guards so onDone fires exactly one time across the
    // success / error / timeout paths.
    var settled = false;
    var timedOut = false;
    function cleanup() {
      clearTimeout(timeoutId);
      setStreaming(false);
    }
    function finish(errMsg) {
      if (settled) return;
      settled = true;
      cleanup();
      if (errMsg) setError(errMsg);
      onDone(errMsg || null);
    }

    // 60-second hard timeout — prevents "thinking forever" if the API hangs.
    // On modern engines we also abort the fetch; on M47 we can't, so we rely
    // on the `timedOut` flag to discard whatever comes back later.
    var timeoutId = setTimeout(function () {
      timedOut = true;
      if (controller) controller.abort();
      finish('Request timed out after 60 seconds');
    }, 60000);

    var requestBody = {
      model: model,
      max_tokens: 4096,
      stream: SUPPORTS_STREAMING,
      messages: apiMessages,
    };
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    fetch(API_URL, {
      method: 'POST',
      signal: controller ? controller.signal : undefined,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
    })
      .then(function (res) {
        if (timedOut) return;
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(
              (data.error && data.error.message) || 'API error ' + res.status
            );
          });
        }

        if (SUPPORTS_STREAMING) {
          return consumeStream(res, function (token) {
            if (!timedOut) onToken(token);
          }, function () { finish(null); });
        } else {
          return res.json().then(function (data) {
            if (timedOut) return;
            var text = '';
            if (data.content) {
              data.content.forEach(function (block) {
                if (block.type === 'text') text += block.text;
              });
            }
            if (!text) {
              finish('Empty response from API');
              return;
            }
            onToken(text);
            finish(null);
          });
        }
      })
      .catch(function (err) {
        if (timedOut) return;
        if (err.name === 'AbortError') {
          // User cancel (cancel()) — no error surfaced, just stop streaming.
          cleanup();
          return;
        }
        finish(err.message || 'Unknown error');
      });
  }, []);

  var cancel = useCallback(function () {
    if (abortRef.current) abortRef.current.abort();
    setStreaming(false);
  }, []);

  return { streaming: streaming, error: error, sendMessage: sendMessage, cancel: cancel };
}

function consumeStream(response, onToken, onDone) {
  var reader = response.body.getReader();
  var decoder = new TextDecoder();
  var buffer = '';

  function processChunks() {
    return reader.read().then(function (result) {
      if (result.done) {
        onDone();
        return;
      }

      buffer += decoder.decode(result.value, { stream: true });

      var lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line

      lines.forEach(function (line) {
        if (!line.startsWith('data: ')) return;
        var data = line.slice(6).trim();
        if (data === '[DONE]') return;

        var event;
        try { event = JSON.parse(data); } catch (e) { return; }

        if (
          event.type === 'content_block_delta' &&
          event.delta &&
          event.delta.type === 'text_delta'
        ) {
          onToken(event.delta.text);
        }
      });

      return processChunks();
    });
  }

  return processChunks();
}
