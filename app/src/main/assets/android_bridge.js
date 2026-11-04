// Injected by MainActivity before the web app runs.
// Routes browser downloads (blob:/data: links) and window.print() to native Android code.
(function () {
  if (window.__androidBridgeInstalled || !window.AndroidBridge) return;
  window.__androidBridgeInstalled = true;

  var blobs = new Map();
  var recent = new Map();
  var origCreate = URL.createObjectURL.bind(URL);
  var origRevoke = URL.revokeObjectURL.bind(URL);
  URL.createObjectURL = function (obj) {
    var url = origCreate(obj);
    if (obj instanceof Blob) blobs.set(url, obj);
    return url;
  };
  URL.revokeObjectURL = function (url) {
    setTimeout(function () { blobs.delete(url); }, 60000);
    origRevoke(url);
  };

  function toDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error); };
      fr.readAsDataURL(blob);
    });
  }

  function handle(a) {
    if (!a || !a.hasAttribute || !a.hasAttribute('download')) return false;
    var href = a.href || '';
    if (href.indexOf('blob:') !== 0 && href.indexOf('data:') !== 0) return false;
    var name = a.getAttribute('download') || 'download';
    // The same download can be triggered by several hooks (click(), dispatchEvent, listener)
    var now = Date.now();
    if (recent.get(href) && now - recent.get(href) < 3000) return true;
    recent.set(href, now);
    var blobPromise = blobs.has(href)
      ? Promise.resolve(blobs.get(href))
      : fetch(href).then(function (r) { return r.blob(); });
    blobPromise
      .then(function (blob) {
        return toDataUrl(blob).then(function (d) {
          var b64 = d.substring(d.indexOf(',') + 1);
          window.AndroidBridge.saveFile(b64, name, blob.type || '');
        });
      })
      .catch(function (e) { window.AndroidBridge.onError(String(e)); });
    return true;
  }

  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (!handle(this)) origClick.call(this);
  };

  var origDispatch = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function (e) {
    if (this instanceof HTMLAnchorElement && e && e.type === 'click' && handle(this)) return false;
    return origDispatch.call(this, e);
  };

  document.addEventListener('click', function (e) {
    var t = e.target;
    var a = t && t.closest ? t.closest('a[download]') : null;
    if (a && handle(a)) e.preventDefault();
  }, true);

  window.print = function () { window.AndroidBridge.print(document.title || 'Bericht'); };
})();
