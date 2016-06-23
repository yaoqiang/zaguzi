var utils = module.exports;

// control variable of func "myPrint"
var isPrintFlag = false;
// var isPrintFlag = true;

/**
 * Check and invoke callback function
 */
utils.invokeCallback = function(cb) {
    if(!!cb && typeof cb === 'function') {
        cb.apply(null, Array.prototype.slice.call(arguments, 1));
    }
};

/**
 * clone an object
 */
utils.clone = function(origin) {
    if(!origin) {
        return;
    }

    var obj = {};
    for(var f in origin) {
        if(origin.hasOwnProperty(f)) {
            obj[f] = origin[f];
        }
    }
    return obj;
};

utils.size = function(obj) {
    if(!obj) {
        return 0;
    }

    var size = 0;
    for(var f in obj) {
        if(obj.hasOwnProperty(f)) {
            size++;
        }
    }

    return size;
};

// print the file name and the line number ~ begin
function getStack(){
    var orig = Error.prepareStackTrace;
    Error.prepareStackTrace = function(_, stack) {
        return stack;
    };
    var err = new Error();
    Error.captureStackTrace(err, arguments.callee);
    var stack = err.stack;
    Error.prepareStackTrace = orig;
    return stack;
}

function getFileName(stack) {
    return stack[1].getFileName();
}

function getLineNumber(stack){
    return stack[1].getLineNumber();
}

utils.myPrint = function() {
    if (isPrintFlag) {
        var len = arguments.length;
        if(len <= 0) {
            return;
        }
        var stack = getStack();
        var aimStr = '\'' + getFileName(stack) + '\' @' + getLineNumber(stack) + ' :\n';
        for(var i = 0; i < len; ++i) {
            aimStr += arguments[i] + ' ';
        }
        console.log('\n' + aimStr);
    }
};
// print the file name and the line number ~ end



//
utils.getIpAddress = function (ipString) {
    var ipaddr = require('ipaddr.js');

    if (ipaddr.isValid(ipString)) {
        try {
            var addr = ipaddr.parse(ipString);
            if (ipaddr.IPv6.isValid(ipString) && addr.isIPv4MappedAddress()) {
                return addr.toIPv4Address().toString();
            }
            return addr.toNormalizedString();
        } catch (e) {
            return ipString;
        }
    }
    return 'unknown';
}


/////////////////////////////
///// validation 
/////////////////////////////
utils.mobileValidate = function (mobile) {
    return !!mobile.match(/^(0|86|17951)?(13[0-9]|15[012356789]|17[678]|18[0-9]|14[57])[0-9]{8}$/);
}


utils.replaceContent = function (content) {
    var sensitiveWords = ["毛主席","毛泽东","江泽民","胡锦涛","邓小平","习近平","傻逼","你妈","你妈逼","妈逼",
        "透你妈","透他妈","透你吗","透他吗","他妈的","你妈的","鸡巴","操","操你妈","操你爹"];
    var holdString = "**";
    sensitiveWords.forEach(function (word) {
       content = content.replace(word, holdString);
    });
    return content;
}

utils.setContent = function (str) {
    str = str.replace(/<\/?[^>]*>/g, '');
    str = str.replace(/[ | ]*\n/g, '');
    return str.replace(/\n[\s| | ]*\r/g, '');
}