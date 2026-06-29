const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createElement(id) {
  return {
    id,
    innerHTML: '',
    value: '',
    children: [],
    dataset: {},
    className: '',
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    appendChild(child) {
      this.children.push(child);
    },
    reset() {
      this.value = '';
    },
    classList: {
      add() {},
      remove() {}
    },
    closest() {
      return null;
    },
  };
}

function createDocument() {
  const elements = new Map();
  const document = {
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, createElement(id));
      }
      return elements.get(id);
    },
    dispatchDOMContentLoaded() {
      this.listeners.DOMContentLoaded();
    },
  };

  return { document, elements };
}

function runSignupFlow() {
  const { document } = createDocument();
  const context = {
    document,
    console,
    setTimeout: (fn) => fn(),
    clearTimeout: () => {},
    fetch: null,
  };

  const activityResponses = [
    {
      'Chess Club': {
        description: 'Chess',
        schedule: 'Fridays',
        max_participants: 12,
        participants: ['existing@example.com'],
      },
    },
    {
      'Chess Club': {
        description: 'Chess',
        schedule: 'Fridays',
        max_participants: 12,
        participants: ['existing@example.com', 'new@example.com'],
      },
    },
  ];

  let activityFetches = 0;
  context.fetch = async (url, options = {}) => {
    if (url === '/activities') {
      activityFetches += 1;
      return {
        ok: true,
        json: async () => activityResponses[activityFetches - 1] || activityResponses[activityResponses.length - 1],
      };
    }

    if (url.includes('/signup')) {
      return {
        ok: true,
        json: async () => ({ message: 'Signed up' }),
      };
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  vm.createContext(context);
  const script = fs.readFileSync(path.join(__dirname, '..', 'src', 'static', 'app.js'), 'utf8');
  vm.runInContext(script, context);
  document.dispatchDOMContentLoaded();

  const emailInput = document.getElementById('email');
  const activitySelect = document.getElementById('activity');
  const signupForm = document.getElementById('signup-form');

  emailInput.value = 'new@example.com';
  activitySelect.value = 'Chess Club';

  return { signupForm, activityFetches, document };
}

const { signupForm, activityFetches, document } = runSignupFlow();

signupForm.listeners.submit({ preventDefault() {} });

assert.strictEqual(activityFetches, 2, 'Expected activities to be fetched again after a successful signup');
assert.match(document.getElementById('activities-list').innerHTML, /new@example.com/, 'Expected the updated participant list to be rendered');
console.log('Signup refresh regression test passed');
