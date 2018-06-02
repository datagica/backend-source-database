const murmurhash = require("murmurhash-v3");


const isObject = (value) => {
  const type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

const isString = (value) => (typeof value === 'string')


module.exports = {
  isObject: isObject,
  isString: isString
}
