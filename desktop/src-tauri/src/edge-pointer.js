(() => {
  const root = document.documentElement;
  const notify = (event, entered) => {
    if (event.pointerType !== 'mouse') return;
    window.__TAURI__.core.invoke('edge_pointer_boundary', { entered }).catch(() => {});
  };
  root.addEventListener('pointerenter', event => notify(event, true));
  root.addEventListener('pointerleave', event => notify(event, false));
  root.addEventListener('lostpointercapture', event => {
    if (event.pointerType !== 'mouse') return;
    const inside = event.clientX >= 0 && event.clientX < innerWidth
      && event.clientY >= 0 && event.clientY < innerHeight;
    notify(event, inside);
  });
})();
