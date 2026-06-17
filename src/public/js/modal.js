(function (global) {
  const ANIM_MS = 280;

  function resolve(el) {
    if (!el) return null;
    return typeof el === 'string' ? document.getElementById(el) : el;
  }

  function getPanel(overlay) {
    return (
      overlay.querySelector('.modal-content') ||
      overlay.querySelector('.modal-content2') ||
      overlay.querySelector('.modal-imagen-contenido') ||
      overlay.firstElementChild
    );
  }

  function isOpen(overlay) {
    return overlay && overlay.classList.contains('is-open');
  }

  function open(target) {
    const overlay = resolve(target);
    if (!overlay) return;

    overlay.classList.remove('is-closing');
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('is-open'));
    });
  }

  function close(target) {
    const overlay = resolve(target);
    if (!overlay || !overlay.classList.contains('is-open')) {
      if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.remove('is-open', 'is-closing');
        overlay.setAttribute('aria-hidden', 'true');
      }
      if (!document.querySelector('.modal-overlay.is-open, .modal-imagen.is-open')) {
        document.body.classList.remove('modal-open');
      }
      return;
    }

    overlay.classList.remove('is-open');
    overlay.classList.add('is-closing');

    const finish = () => {
      overlay.style.display = 'none';
      overlay.classList.remove('is-closing');
      overlay.setAttribute('aria-hidden', 'true');
      if (!document.querySelector('.modal-overlay.is-open, .modal-imagen.is-open')) {
        document.body.classList.remove('modal-open');
      }
    };

    const panel = getPanel(overlay);
    const onEnd = (e) => {
      if (panel && e.target !== panel) return;
      panel?.removeEventListener('transitionend', onEnd);
      finish();
    };

    if (panel) {
      panel.addEventListener('transitionend', onEnd);
    }
    setTimeout(finish, ANIM_MS + 40);
  }

  function bindOverlayDismiss() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (
        (target.classList.contains('modal-overlay') ||
          target.classList.contains('modal-imagen')) &&
        target.classList.contains('is-open')
      ) {
        close(target);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const openOverlay = document.querySelector(
        '.modal-overlay.is-open, .modal-imagen.is-open',
      );
      if (openOverlay) close(openOverlay);
    });
  }

  global.IntranetModal = { open, close, isOpen, ANIM_MS };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindOverlayDismiss);
  } else {
    bindOverlayDismiss();
  }
})(window);
