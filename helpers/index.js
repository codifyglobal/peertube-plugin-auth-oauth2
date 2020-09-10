const crypto = require('crypto');

function getRandomBytes(size) {
  return new Promise((res, rej) => {
    crypto.randomBytes(size, (err, buf) => {
      if (err) return rej(err);
      return res(buf);
    })
  })
}

module.exports = {
  getRandomBytes
};
