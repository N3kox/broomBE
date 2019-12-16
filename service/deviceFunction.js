var request = require('request');
var deviceFunction = function(sInfo,did,api){
    console.log(did);
    console.log(api);
    request({
        url: `http://api.heclouds.com/cmds?device_id=${did}`,
        method: "post",
        json:true,
        headers: {
            'api-key': api,
            "content-type": "application/json",
        },
        body:sInfo
    }, function (error, response, body) {
        console.log(response.statusCode);
        console.log(body);
    });
}

module.exports={
    deviceFunction:deviceFunction
}