const len = 5
const tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

function buildCodeCore(){
    var code = '';
    for(var i = 0;i<len;i++){
        code += tab.charAt(Math.floor(Math.random()*36));
    }
    //console.log('code:'+code)
    return code; 
}

function buildCode(){
    return buildCodeCore();
}

exports.buildCode = buildCode;
