exports.hexToBuffer = async function(hex) {
    if(hex.length % 2 === 1) hex = '0' + hex;
    return new Buffer.from(hex, 'hex');
};

exports.sleep = async function (ms) {
    return new Promise(res => {
        setTimeout(function() {
            res();
        }, ms);
    });
}