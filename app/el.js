
const el = module.exports = (what, attrs, children, ns) => {
  // Simple mechanism for defining DOM programatically

  if (attrs instanceof Array && !children) {
    children = attrs;
    attrs = null;
  }

  if (typeof what === 'string') {
    const m = what.match(  /^([\w-_]+)?(#[\w-_]*)?((?:.[\w-_]+)+)?$/  );
    if (!m)  throw new Error("Can't make elem from string: "+what)
    const [str, tag, id, classes] = m;
    // what = (attrs&&attrs.xmlns)
    what = (ns)
      ? document.createElementNS(ns, tag||'div')
      : document.createElement(tag||'div');
    if (id)  what.id = id;
    if (classes)  classes.split('.').map(x => x && what.classList.add(x));
  }
  if (!(what instanceof Element))  throw new Error("What's that?: "+what);

  if (attrs) {
    Object.entries(attrs).forEach( ([k,v]) =>
      typeof v === 'function'
        ? what.addEventListener (k,v)
        : what.setAttribute     (k,v)
      );
  }

  if (children) {

    if (!Array.isArray(children))  children = [children];
    children.forEach(x => {
      if (typeof x === 'string')  x = document.createTextNode(x);
      what.appendChild(x);
    })
  }

  return what;
}

el.select = (selector, ...a) => el(document.querySelector(selector), ...a);

el.withNs = ns => {
  const handler = {
    apply: function(target, thisArg, args) {
      args[3] = ns
      return target(...args);
    }
  };
  return new Proxy(el, handler);
}
