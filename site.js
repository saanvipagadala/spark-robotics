/* SPARK: the page's only script.

   Two jobs, both small, both optional. Nothing here is needed for the page to
   read correctly -- if this file fails to load, the films still play and the
   page still works, it is only less tidy. That is deliberate: a static page
   about a children's app should not depend on JavaScript to be usable. */

(function () {
  'use strict';

  /* The films are YouTube embeds, which bring their own player, so there is
     nothing here for them. What is left is the contact form and the
     fullscreen button. */

  /* ---- one film at a time ---------------------------------------------
     Ten embedded films on one page is ten ways to end up with two
     soundtracks at once. Each iframe is loaded with enablejsapi=1, so the
     YouTube player API can be asked to pause the others when one starts.

     All of it is optional: if the API script is blocked or fails, the films
     still play, they just no longer stop one another. */

  var frames = [].slice.call(document.querySelectorAll('.film iframe'));
  if (frames.length > 1) {
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);

    window.onYouTubeIframeAPIReady = function () {
      var players = [];
      frames.forEach(function (frame) {
        try {
          players.push(new YT.Player(frame, {
            events: {
              onStateChange: function (e) {
                if (e.data !== YT.PlayerState.PLAYING) return;
                players.forEach(function (other) {
                  if (other !== e.target && other.pauseVideo) {
                    try { other.pauseVideo(); } catch (err) {}
                  }
                });
              }
            }
          }));
        } catch (err) {}
      });
    };
  }

  /* ---- the contact form ------------------------------------------------
     The form posts on its own without any of this: the browser sends it and
     Web3Forms returns the reader to /thanks/. All this adds is answering in
     place, so that sending a message does not cost the reader the page they
     were on. If it throws at any point the form is left alone to submit the
     ordinary way. */

  var form = document.querySelector('.cform');
  if (form) (function () {
    var status = form.querySelector('.cform-status');
    var send = form.querySelector('.cform-send');

    form.addEventListener('submit', function (e) {
      if (!form.reportValidity()) return;      // let the browser object first
      e.preventDefault();

      send.disabled = true;
      status.className = 'cform-status';
      status.textContent = 'Sending…';

      fetch(form.action, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        /* Send the whole page address rather than the bare origin a browser
           would trim it to. Web3Forms works out which site a message came
           from off this header, and there is nothing private in the URL of a
           public page. */
        referrerPolicy: 'unsafe-url',
        body: new FormData(form)
      }).then(function (r) {
        return r.json().catch(function () { return { success: r.ok }; });
      }).then(function (data) {
        if (!data.success) throw new Error(data.message || 'rejected');
        form.reset();
        status.className = 'cform-status ok';
        status.textContent = 'Thank you — your message is on its way. '
                           + "We'll get back to you soon.";
      }).catch(function () {
        status.className = 'cform-status bad';
        status.textContent = 'Sorry, that did not send. Please try again, or '
                           + 'email us if it keeps failing.';
      }).then(function () {
        send.disabled = false;
      });
    });
  })();

  /* ---- fullscreen ------------------------------------------------------
     The button a video player puts in its bottom right corner, for the page
     itself. Built by script rather than sitting in the markup, because a
     browser that cannot go fullscreen should not be offered a button that
     does nothing. Not on touch devices: a phone has no fullscreen for a page,
     and on a tablet the button would sit under a thumb. */

  var root = document.documentElement;
  if (!(root.requestFullscreen || root.webkitRequestFullscreen)) return;
  if ('ontouchstart' in window) return;

  var EXPAND = '<path d="M3 8V3h5M17 3h5v5M22 17v5h-5M8 22H3v-5"/>';
  var SHRINK = '<path d="M8 3v5H3M22 8h-5V3M17 22v-5h5M3 17h5v5"/>';

  var btn = document.createElement('button');
  btn.className = 'fs';
  btn.type = 'button';
  document.body.appendChild(btn);

  function on() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function paint() {
    var label = on() ? 'Leave fullscreen' : 'View fullscreen';
    btn.setAttribute('aria-label', label);
    btn.title = label + '  (F)';
    btn.innerHTML = '<svg viewBox="0 0 25 25" aria-hidden="true">' +
                    (on() ? SHRINK : EXPAND) + '</svg>';
  }

  function toggle() {
    if (on()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    }
  }

  btn.addEventListener('click', toggle);
  document.addEventListener('fullscreenchange', paint);
  document.addEventListener('webkitfullscreenchange', paint);

  /* The same shortcut a video player uses, but never while something is being
     typed into -- the contact form is on this page -- and never on top of a
     browser shortcut. */
  addEventListener('keydown', function (e) {
    if (e.key !== 'f' && e.key !== 'F') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable ||
              /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    toggle();
  });

  paint();
})();
