import { storePointer } from "../utils.js";

function resolveValue({ target }, setter) {
  let value;
  const name = target.name || target.getAttribute("name") || target.id;

  switch (target.type) {
    case "radio":
      if (!target.checked) return;
    // eslint-disable-next-line no-fallthrough
    case "checkbox":
      value = target.checked && target.value;
      break;
    default:
      value = target.value;
  }

  setter(name, value);
}

const stringCache = new Map();
const storeCache = new WeakMap();

export function set(property, value) {
  if (!property) {
    throw Error(`Target property must be set: ${property}`);
  }

  if (arguments.length === 2) {
    return host => {
      host[property] = value;
    };
  }

  if (typeof property === "object") {
    const store = storePointer.get(property);

    if (!store) {
      throw Error("Provided object must be a model instance of the store");
    }

    let fn = storeCache.get(property);

    if (!fn) {
      fn = (host, event) => {
        resolveValue(event, (name, nextValue) => {
          if (!name) {
            throw Error("'name' or 'id' property must be defined");
          }

          store.set(property, { [name]: nextValue });
        });
      };
      storeCache.set(property, fn);
    }

    return fn;
  }

  let fn = stringCache.get(property);

  if (!fn) {
    fn = (host, event) => {
      resolveValue(event, (name, nextValue) => {
        host[property] = nextValue;
      });
    };

    stringCache.set(property, fn);
  }

  return fn;
}

const promiseMap = new WeakMap();
export function resolve(promise, placeholder, delay = 200) {
  return (host, target) => {
    let timeout;

    if (placeholder) {
      timeout = setTimeout(() => {
        timeout = undefined;

        requestAnimationFrame(() => {
          placeholder(host, target);
        });
      }, delay);
    }

    promiseMap.set(target, promise);

    promise.then(template => {
      if (timeout) clearTimeout(timeout);

      if (promiseMap.get(target) === promise) {
        template(host, target);
        promiseMap.set(target, null);
      }
    });
  };
}
