const fs = require('fs');
const utils = require('loader-utils');

module.exports = function (...rest) {
    const options = utils.getOptions(this);
    const { suffix = 'js', name } = options;
    const callback = this.async();

    fs.mkdir('print', (recursive) => {
        if (!name) {
            return new Error('print-loader name参数无效');
        }

        const [source] = rest;

        fs.writeFile(`print/${name}.${suffix}`, source, function(err) {
            if(err) {
                return console.log(err);
            }
        });
    });
    callback(null, ...rest);
};

// module.exports.pitch = function(remainingRequest, precedingRequest, data) {
// };