import { connectSocket, scheduleRender } from './state.js';
import { route, render } from './router.js';
import { initEvents } from './events.js';

window.addEventListener('hashchange', () => render());
connectSocket();
initEvents();
