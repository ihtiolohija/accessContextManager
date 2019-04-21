let resourceSchema = {
    name: {
        in: ['body'],
        isAlphanumeric: true
    },
    context: {
        in: ['body'],
        isString: true
    },
    ipRange: {
        optional: true,
        isArray: true
    },
    'ipRange.*': {
        isIPRange: true
    },
    location:{
        optional: true,
        matches: {
            options: /([a-zA-Z]\/[a-zA-Z])/,
            errorMessage: 'location format is invalid'
        }
    }
};

module.exports = {resourceSchema};