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

    var controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setError(null);

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
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
    })
      .then(function (res) {
        if (!res.ok) {
          return res.json().then(function (data) {
            throw new Error(
              (data.error && data.error.message) || 'API error ' + res.status
            );
          });
        }

        if (SUPPORTS_STREAMING) {
          return consumeStream(res, onToken, function () { onDone(null); });
        } else {
          return res.json().then(function (data) {
            var text = '';
            if (data.content) {
              data.content.forEach(function (block) {
                if (block.type === 'text') text += block.text;
              });
            }
            if (!text) {
              onDone('Empty response from API');
              return;
            }
            onToken(text);
            onDone(null);
          });
        }
      })
      .catch(function (err) {
        if (err.name === 'AbortError') return;
        var msg = err.message || 'Unknown error';
        setError(msg);
        onDone(msg);
      })
      .finally(function () {
        setStreaming(false);
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
