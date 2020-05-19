function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}

function makeRandomId() {
  return `${s4()}${s4()}${s4()}${s4()}`;
}

const _lastIDs: string[] = [];

export function makeCorrelationId() {
  let id = makeRandomId();

  for (;;) {
    if (-1 === _lastIDs.indexOf(id)) {
      break;
    }
  }

  _lastIDs.unshift(id);
  if (_lastIDs.length > 5) {
    _lastIDs.pop();
  }

  // console.log(JSON.stringify(_lastIDs));

  return id;
}
