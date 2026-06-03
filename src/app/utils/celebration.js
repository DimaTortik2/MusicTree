import confetti from 'canvas-confetti';

export const showCongratulationsModal = () => {
  if (
    window.localStorage.getItem('course-completed') ||
    document.getElementById('pure-js-congratulations')
  ) {
    return;
  }
  window.localStorage.setItem('course-completed', 'true');

  console.log('Браузер:', window.navigator.userAgent);
  console.log('Текущий путь (BOM location):', window.location.pathname);

  const isMobile = window.innerWidth < 768;
  const spreadValue = isMobile ? 35 : 55;

  const duration = 3 * 1000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: spreadValue, 
      origin: { x: 0 },
      colors: ['#ec4899', '#8b5cf6', '#10b981', '#fef08a'],
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: spreadValue,
      origin: { x: 1 },
      colors: ['#ec4899', '#8b5cf6', '#10b981', '#fef08a'],
    });

    if (Date.now() < end) {
      // (BOM API) для плавной анимации
      window.requestAnimationFrame(frame);
    }
  };
  frame();

 

  const overlay = document.createElement('div');
  overlay.id = 'pure-js-congratulations';

  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, var(--background) 80%, transparent);
    backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    padding: 16px;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background-color: var(--surface);
    padding: 32px;
    border-radius: 24px;
    max-width: 450px;
    width: 100%;
    text-align: center;
    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
    transform: scale(0.95);
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    font-family: var(--font-sans);
    display: flex;
    flex-direction: column;
    gap: 16px;
  `;

  const title = document.createElement('h2');
  title.innerText = 'Вы прошли всё!';
  title.style.cssText = `
    color: var(--text);
    font-size: 1.5rem;
    font-weight: 500;
    margin: 0;
  `;

  const description = document.createElement('p');
  description.innerText =
    'Вы завершили абсолютно все уроки на музыкальном дереве! Поздравляю, желаю удачи, отпускаю Вас в свободный полёт!';
  description.style.cssText = `
    color: color-mix(in srgb, var(--text) 60%, transparent);
    font-size: 1rem;
    line-height: 1.5;
    margin: 0 0 8px 0;
  `;

  const button = document.createElement('button');
  button.innerText = 'Круто!';
  button.style.cssText = `
    background-color: var(--primary);
    color: #fff;
    border: 3px solid var(--primary);
    padding: 14px 40px;
    border-radius: 16px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s ease-in-out;
    font-family: inherit;
    align-self: center;
  `;

  button.onmouseenter = () => {
    button.style.backgroundColor = 'var(--accent)';
    button.style.borderColor = 'var(--accent)';
    button.style.transform = 'scale(1.02)';
  };
  button.onmouseleave = () => {
    button.style.backgroundColor = 'var(--primary)';
    button.style.borderColor = 'var(--primary)';
    button.style.transform = 'scale(1)';
  };
  button.onmousedown = () => (button.style.transform = 'scale(0.98)');
  button.onmouseup = () => (button.style.transform = 'scale(1.02)');

  const close = () => {
    overlay.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
    window.setTimeout(() => overlay.remove(), 300); 
  };

  button.onclick = close;
  overlay.onclick = (e) => {
    if (e.target === overlay) close();
  };

  card.appendChild(title);
  card.appendChild(description);
  card.appendChild(button);
  overlay.appendChild(card);

  document.body.appendChild(overlay);

  window.requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    card.style.transform = 'scale(1)';
  });
};
