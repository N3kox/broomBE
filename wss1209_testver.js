//简易路由版
//12.9 电脑控制（鼠标左右键单击，字符串输入）
//12.5 bug fix
//12.1 细节整理
//9.5  wxlogin build,register(ClientVerify not within plz check before build)
//8.6  refactor
//8.4  t1-pool.end bug fixed. 
//7.31 basic function all done,another timer bug fix
//7.30 regFunction (require service/reg.js) ,Client-Server-Client Message Module
//7.27 popout&mask newClass bind room,search room
//7.26 student class function,class code join,quit class
//7.25 modify
//7.23 teacher class function,class code init(require /service/code.js)
//7.20 details
//7.19 md5,teacher login func ,setting page ,css changes
//7.16 git
//7.15 fix room changing bug(clearTimeout never occurs after onUnload). new package.json
//7.14 seat operator and page timer, server mysql update->8.0
//7.13 little changes and tiny fixes
//represent localhost:8080


var version = "0.0.2 revive";
var https = require('https');
var fs = require('fs')
var url = require('url');
var request = require('request');
var dec = require('./service/WXBizDataCrypt');
var dev = require('./service/deviceFunction');
const easyMonitor = require('easy-monitor');
easyMonitor('WECHAT MINI PROGRAM后端');
var currentComputer = null;
var controlPair = [];

//SSL
const options = {
    key: fs.readFileSync('./ssl/myKey.key'),
    cert: fs.readFileSync('./ssl/myCrt.crt')
}

var server = https.createServer(options, function (req, res) {
    res.end('localhost!\nWebsockets server running!\nfor wx mini app!');
});

function ClientVerify(info) {
    var ret = false;
    var params = url.parse(info.req.url, true).query;
    return true;
}//验证

var ws = require('ws');
var wss = new ws.Server({ server: server, verifyClient: ClientVerify });

var initPool = require('./service/initPool').init();
//createConnection not in use
//createpool using
//待定--集群连接池--处理高并发
const pool = initPool.getPool();
const query_async = initPool.query_async;

//微信小程序app必要信息
const appinfo = JSON.parse(fs.readFileSync('./config/app.json').toString()).data
console.log("同步:", appinfo)


server.listen(8080, '0.0.0.0', function listening() {
    console.log('-----------------\n服务器启动成功！\nlocalhost:8080\nfor微信小程序\n-----------------\n');
});


wss.on('connection', function connection(ws) {
    console.log('wsserver connection confirmed!');
    let constInfo = {
        session_key: "",//session_key
        openid: ""//openid
    };
    ws.on('message', function (message) {

        switch (JSON.parse(message).info_type) {
            //主界面登陆处理
            case 'storageLogin': {
                console.log("storage login");
                let mes = JSON.parse(message);
                console.log(mes);
                let res = {
                    info_type: "storageLogin",
                    errcode: 0,
                    room: null,
                    usertype: "student"
                }
                let sql = 'select stu_no,name from stu where stu_no = ?';
                pool.query(sql, [mes.stu_no], function (err, result) {
                    if (err) {
                        console.log("#SQL ERR");
                    }
                    else {
                        let data = eval(result);
                        //此情况不可能发生
                        if (data.length == 0) {
                            res.errcode = 1;
                            //res.reason = 'noRegister';
                            ws.send(JSON.stringify(res));
                        }
                        else {
                            res.stu_no = mes.stu_no;
                            res.name = data[0].name;
                            let sql1 = "select roomid from stu join seat on stu.stu_no = seat.stu_no join room on seat.rid = room.rid where stu.stu_no = ?";
                            pool.query(sql1, [mes.stu_no], function (err, result1) {
                                if (err) {
                                    console.log("#SQL ERR");
                                    res.errcode = 1;
                                }
                                else {
                                    let room_data = eval(result1);
                                    if (JSON.stringify(room_data) != '[]') {
                                        res.room = room_data[0].roomid
                                    }
                                }
                                ws.send(JSON.stringify(res));
                            })
                        }
                    }
                })
                break;
            }
            case 'wxlogin':
            case 'islogged': {
                /*
                  9.6 no register fix
                  9.5 嵌入智能教室
                  8.11-openid授权登录已完成   
                  8.11-功能尚未完成
                  之后要利用openid判断用户是否注册
                  如证明用户已经授权注册（在库中有对应注册记录），则发送消息，允许前端进入index界面
                  反之，则通知前端用户尚未注册，要求用户注册
                */
                var mes = JSON.parse(message);

                //console.log("log:",mes);
                //console.log(`#login:receive code:${mes.code}`);
                //console.log(`#Wss:receive enc:${message.encryptedData}`);
                //console.log(`#Wss:receive iv:${message.iv}`);
                //console.log(`#Wss:appid ready:${appinfo.AppId}`)
                //console.log(`#Wss:appsecret ready:${appinfo.AppSecret}`)
                request({
                    url: `https://api.weixin.qq.com/sns/jscode2session?appid=${appinfo.AppId}&secret=${appinfo.AppSecret}&js_code=${mes.code}&grant_type=authorization_code`,
                    method: "GET",
                    JSON: true,
                    headers: {
                        "content-type": "application/json"
                    }
                }, function (err, response, body) {
                    if (err)
                        console.log(err);
                    else {
                        //console.log(`#login:Request:body:${body}`)
                        constInfo.session_key = JSON.parse(body).session_key;
                        constInfo.openid = JSON.parse(body).openid;
                        console.log(constInfo.openid);
                        //console.log(constInfo.openid);
                        let pc = new dec(appinfo.AppId, constInfo.session_key);
                        try {
                            //console.log("获取sessionkey:",constInfo.session_key)
                            //console.log("获取enc_data:",decodeURIComponent(message.encryptedData))
                            //console.log("获取iv:",decodeURIComponent(message.iv))
                            let decdata = pc.decryptData(decodeURIComponent(mes.encryptedData), decodeURIComponent(mes.iv));
                            //console.log('解密后data:',decdata);
                            //console.log(`#login:Dec解密完成`)
                            let sql = "select stu_no,name from stu where openid = ? ";
                            pool.query(sql, [decdata.openId], function (err, result) {
                                if (err) {
                                    console.log('#Sql err:', err)
                                }
                                else {
                                    let data = eval(result);
                                    //无注册响应
                                    if (data.length == 0) {
                                        var res = {
                                            info_type: mes.info_type == 'wxlogin' ? 'wxlogin' : 'islogged',
                                            errcode: 1,
                                            reason: 'noRegister'
                                        };
                                        ws.send(JSON.stringify(res));
                                    }
                                    else {
                                        var res = {
                                            info_type: mes.info_type == 'wxlogin' ? 'wxlogin' : 'islogged',
                                            errcode: 0,
                                            stu_no: data[0].stu_no,
                                            name: data[0].name,
                                            room: null,
                                            usertype: "student"
                                        };
                                        var sqlstatment_1 = "select roomid from stu join seat on stu.stu_no = seat.stu_no join room on seat.rid = room.rid where stu.stu_no = '" + res.stu_no + "'";
                                        //console.log(sqlstatment_1);
                                        pool.query(sqlstatment_1,
                                            function (err, result) {
                                                if (err) {
                                                    console.log('连接表错误:', err.code);
                                                }
                                                else {
                                                    //返回当前房间信息
                                                    var room_data = eval(result);
                                                    //console.log(room_data);

                                                    if (JSON.stringify(room_data) != '[]') {
                                                        res.room = room_data[0].roomid
                                                        console.log('ok')
                                                    }
                                                    else
                                                        res.room = null;
                                                }
                                                if (data.length == 0) {
                                                    res.errcode = 1;
                                                }
                                                //mysql查询异步
                                                //console.log(res)
                                                ws.send(JSON.stringify(res));
                                            })
                                    }
                                }
                            })
                        } catch (error) {
                            //console.log(`#login:login error:`, error);
                            //console.log(`#login:login error stack:`, error.stack);
                            let res = {
                                infoType: mes.info_type == 'wxlogin' ? 'wxlogin' : 'islogged',
                                errcode: 1,
                                reason: 'stm'//session time out
                            }
                        }
                    }
                })
                //ws.send(JSON.stringify({infoType:'code',errcode:0}));
                break;
            }
            case 'login':
                {
                    var mes = JSON.parse(message);
                    //检查是否为学生
                    pool.query('select * from stu where stu_no = ? and pwd = ?',
                        [mes.stuno, mes.password],
                        function (err, result) {
                            if (err) {
                                callback(err, null, null);
                                console.log("no user info");
                            }
                            else {
                                var res_data = eval(result);
                                if (JSON.stringify(res_data) != '[]') {
                                    var res = {
                                        info_type: "check_info_done",
                                        errcode: 0,
                                        name: res_data[0].name,
                                        //room需要通过多表查询获得
                                        //需要修改
                                        room: null,
                                        usertype: "student"
                                    };
                                    var sqlstatment_1 = "select roomid from stu join seat on stu.stu_no = seat.stu_no join room on seat.rid = room.rid where stu.stu_no = '" + mes.stuno + "'";
                                    //console.log(sqlstatment_1);
                                    pool.query(sqlstatment_1,
                                        function (err, result) {
                                            if (err) {
                                                console.log('连接表错误:', err.code);
                                            }
                                            else {
                                                //返回当前房间信息
                                                var room_data = eval(result);
                                                console.log(room_data);

                                                if (JSON.stringify(room_data) != '[]') {
                                                    res.room = room_data[0].roomid
                                                    console.log('ok')
                                                }
                                                else
                                                    res.room = null;
                                            }
                                            //mysql查询异步
                                            ws.send(JSON.stringify(res));
                                        })
                                    //console.log("id:",res_data[0].stu_id);
                                    //ws.send(JSON.stringify(res_data[0].stu_id));			
                                }
                                else {
                                    //console.log("teacher search")
                                    //检查是否为教师
                                    pool.query('select * from tea where tea_no = ? and pwd = ?', [mes.stuno, mes.password], function (err, result) {
                                        if (err) {
                                            callback(err, null, null);
                                            console.log("no user info");
                                        }
                                        else {
                                            var res_data = eval(result);
                                            if (JSON.stringify(res_data) != '[]') {
                                                var res = {
                                                    info_type: "check_info_done",
                                                    errcode: 0,
                                                    name: res_data[0].name,
                                                    //room需要通过多表查询获得
                                                    //需要修改
                                                    room: null,
                                                    usertype: "teacher"
                                                };
                                                ws.send(JSON.stringify(res));
                                            }
                                            else {
                                                var res = {
                                                    info_type: "check_info_done",
                                                    errcode: 1,
                                                };
                                                ws.send(JSON.stringify(res));
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    break;
                };
            //9.6 testing
            //注册模块尚未测试
            case 'register': {
                var mes = JSON.parse(message);
                checkStuNo = async function () {
                    var res = {
                        info_type: 'register',
                        errcode: 0
                    }
                    console.log("mes:" + mes);
                    let sql = "select * from stu where stu_no = '" + mes.stu_no + "'";
                    console.log("#SQL:" + sql);
                    var stuCheck = await query_async(sql);
                    //已经注册过
                    if (stuCheck.length > 0) {
                        res.errcode = 1;
                        res.errReason = 'reged';
                        ws.send(JSON.stringify(res));
                    }
                    //允许注册
                    else {
                        //请求openid
                        request({
                            url: `https://api.weixin.qq.com/sns/jscode2session?appid=${appinfo.AppId}&secret=${appinfo.AppSecret}&js_code=${mes.code}&grant_type=authorization_code`,
                            method: "GET",
                            JSON: true,
                            headers: {
                                "content-type": "application/json"
                            }
                        }, function (err, response, body) {
                            if (err) {
                                console.log("#HTTP request error!!");
                            }
                            else {
                                constInfo.session_key = JSON.parse(body).session_key;
                                constInfo.openid = JSON.parse(body).openid;
                                let pc = new dec(appinfo.AppId, constInfo.session_key);
                                try {
                                    let decdata = pc.decryptData(decodeURIComponent(mes.encryptedData), decodeURIComponent(mes.iv));
                                    let sql2 = "insert into stu (stu_no,pwd,openid) values (?,?,?)"
                                    pool.query(sql2, [mes.stu_no, mes.pwd, decdata.openId], function (err, result) {
                                        if (err) {
                                            console.log('#SQL error:', err);
                                            res.errcode = 1;
                                            res.errReason = 'sqlError';
                                        }
                                        ws.send(JSON.stringify(res));
                                    })
                                } catch (error) {
                                    //session time out
                                    res.errcode = 1;
                                    res.errReason = 'stm'
                                    ws.send(JSON.stringify(res));
                                }
                            }
                        })
                    }
                }();
                break;
            }
            case 'stu_multi':
                {
                    var mes = JSON.parse(message);
                    console.log("学生界面多消息处理测试：" + mes.info + "\nstatus:" + mes.status);
                    ws.send(JSON.stringify("derb"));
                    break;
                };

            case 'which_room':
                {
                    var mes = JSON.parse(message);
                    var statement = 'select room from stu where stu_no = ' + mes.stu_no;
                    pool.query(statement, function (err, result) {
                        if (err) {
                            callback(err, null, null);
                            console.log('err:', err.code);
                        }
                        else {
                            //res_data = eval(result);
                            //console.log("找到"+mes.stu_no+"学生的房间"+res_data[0].room);
                            var res_data = eval(result);
                            var res = {
                                info_type: 'found_room',
                                room: res_data[0].room,
                            }
                            ws.send(JSON.stringify(res));
                        }
                    });
                    break;
                };
            //获取全部房间总览
            //12.3 todo-locked情况下对教师提醒教室情况
            //12.3 重构，无可用座椅房间隐藏显示
            case 'require_classroom_info':
                {
                    fun = async function () {
                        var res = [{
                            info_type: "classroom_index",
                        }];
                        /**
                         * 新版12.3
                         * 学生查询仅返回有座位的房间信息
                         * 教师查询返回全部房间信息
                         */
                        var isStudent = JSON.parse(message).isStudent;
                        var sql = null;
                        if (isStudent) {//学生
                            sql = 'select room.roomid,room.rid,locked,count(*) as count from room right join seat on room.rid = seat.rid where seat.status = 0 group by rid;';
                        } else {//教师
                            sql = 'select room.roomid,room.rid,locked,count(sid) as count from room left join seat on room.rid = seat.rid group by rid';
                        }
                        var v = await query_async(sql);
                        v.forEach((value) => { res.push(eval(value)) });
                        console.log(res);
                        ws.send(JSON.stringify(res));

                        /**
                         * 旧版-全部房间信息返回（包括无座位房间）
                         */
                        /*
                        var w = 'select * from room';
                        var v = await query_async(w);
                        for (var i = 0; i < v.length; i++) {
                            var a = 'select count(*) as len from seat where rid = ' + v[i].rid + ' group by rid'
                            //console.log(a)
                            var count = await query_async(a)
                            //console.log(count)
                            if (JSON.stringify(count) != '[]')
                                v[i].count = count[0].len;
                            //处理无座位教室情况
                            else
                                v[i].count = 0;
                            res.push(eval(v[i]));
                        }
                        console.log(res);
                        ws.send(JSON.stringify(res));
                        */
                    }();
                    break;
                }

            // 这个要改
            case 'room_id': {
                var mes = JSON.parse(message);
                var reqseat = 'select humidity,temperature,sid,seat_row,seat_column,seat.status,stu_no from room join seat on room.rid = seat.rid where roomid =' + mes.room_id;
                pool.query(reqseat, function (err, result) {
                    if (err) {
                        callback(err, null, null);
                        console.log('err:', err.code);
                    }
                    else {
                        res_data = eval(result);
                        if (JSON.stringify(res_data) == '[]') {
                            //console.log("id:",res_data[0].stu_id);
                            var res = [{
                                info_type: "no_info",
                            }];
                            ws.send(JSON.stringify(res));
                        }
                        else {
                            var res = [{
                                info_type: "this_classroom_info",
                                humidity: res_data[0].humidity,
                                temperature: res_data[0].temperature,
                            }];
                            var room_detail = [];
                            for (var i = 0; i < res_data.length; i++) {
                                var datapush = {
                                    //id : res_data[i].id,
                                    seat_row: res_data[i].seat_row,
                                    seat_column: res_data[i].seat_column,
                                    status: res_data[i].status
                                }
                                //用户当前所占座位
                                if (res_data[i].stu_no == mes.stu_no)
                                    datapush.status = 2;
                                room_detail.push(datapush);
                            }
                            res.push(room_detail);
                            //console.log("aaaa:",res[1].classroom_info);
                            ws.send(JSON.stringify(res));
                            //console.log(res);
                        }

                    };
                });
                break;
            }

            //12.1 is null 防止多用户点击同一座位冲突
            //12.1 修复单用户点击不同座位均可占用问题
            //8.1bug--当多用户同时点击未占用座位时可能冲突（均处于开放态，均可以进入占用态）
            //ab用户均在占用座位showModal，a点击后b点击，座位属于b
            //8.2-temperary fix-update要求座位stu_no属性为null，此时用户界面无占座失败提醒，主界面出现当前房间错误
            //8.2-total fix-增加判断修改行数
            case 'take_seat': {
                var mes = JSON.parse(message);
                console.log("x:", mes.row);
                console.log("y:", mes.column);
                console.log("roomid:", mes.roomid);
                console.log("stu_no:", mes.stu_no);
                //console.log(sqlstatment);
                var resetStatment = 'update seat set status = 0, stu_no = null where stu_no = ?'; //重置用户为放下座位
                pool.query(resetStatment, [mes.stu_no], function (err, result) {
                    let res = [{
                        info_type: "take_seat_done",
                        errcode: 0,
                        errmsg: ''
                    }];
                    if (err) {
                        res[0].errcode = 1;
                        res[0].errmsg = 'resetSeatError';
                        console.log(`重置用户${mes.stu_no}座位错误`);
                        ws.send(JSON.stringify(res));
                    } else {
                        var sqlstatment = 'update seat set status = 1 , stu_no = ' + mes.stu_no + ' where seat_row = ' + mes.row +
                            ' and seat_column = ' + mes.column + ' and rid = (select rid from room where roomid = ' + mes.roomid + ' ) and stu_no is null ';
                        pool.query(sqlstatment, function (err, result) {
                            if (err) {
                                res[0].errcode = 1;
                                res[0].errmsg = 'updateError';
                            }
                            else if (result.affectedRows == 0 && result.changedRows == 0) {
                                res[0].errcode = 1;
                                res[0].errmsg = 'seatToken';
                            }
                            else {
                                console.log("修改stu内房间成功");
                            }
                            console.log(res);
                            ws.send(JSON.stringify(res));
                        });
                    }
                })

                //这里要写一个对其他ws分发刷新界面消息的方法
                //before aug--用定时刷新wx的座椅页面来替代
                //1201 定时刷新
                break;
            }

            case 'remove_seat': {
                var mes = JSON.parse(message);
                console.log(mes);
                var sqlstatment_1 = 'update seat set status = 0 , stu_no = null where seat_row = ' + mes.row +
                    ' and seat_column = ' + mes.column + ' and rid = (select rid from room where roomid = ' + mes.roomid + ' ) and stu_no = ' + mes.stu_no;
                var res = [{
                    info_type: "remove_seat",
                    errcode: 0,
                }];
                pool.query(sqlstatment_1,
                    function (err, result) {
                        if (err) {
                            res.errcode = 1;
                            console.log('离开座位错误:', err.code);
                        }
                        //console.log('离开座位');
                        ws.send(JSON.stringify(res));
                    });

                break;
            }
            case 'lockRoom': {
                var mes = JSON.parse(message);
                var sqlstatment_1 = 'update room set locked = 1, tea_no = ' + mes.tea_no + ' where roomid = ' + mes.roomid;
                var res = [{
                    info_type: "roomLocked",
                    errcode: 0,
                }];
                pool.query(sqlstatment_1,
                    function (err, result) {
                        if (err) {
                            res.errcode = 1;
                            console.log('教室锁定失败:', err.code);
                        }
                        ws.send(JSON.stringify(res));
                    });
                break;
            }
            case 'unlockRoom': {
                var mes = JSON.parse(message);
                var sqlstatment_1 = 'update room set locked = 0, tea_no = null where roomid = ' + mes.roomid + ' and tea_no = ' + mes.tea_no;
                var res = [{
                    info_type: "roomUnlocked",
                    errcode: 0,
                }];
                pool.query(sqlstatment_1,
                    function (err, result) {
                        if (err) {
                            res.errcode = 1;
                            console.log('教室解锁失败:', err.code);
                        }
                        ws.send(JSON.stringify(res));
                    });
                break;
            }
            case 'myClass': {
                var mes = JSON.parse(message);
                var sql = 'select cid,name,code from classinfo where tea_no = ' + mes.tea_no;
                var res = [{
                    info_type: "myClass",
                    errcode: 0,
                }];
                console.log(mes);
                pool.query(sql, function (err, result) {
                    if (err) {
                        res.errcode = 1;
                        console.log("查询课程失败", err.code);
                    }
                    else {
                        res_data = eval(result);
                        if (JSON.stringify(res_data) == '[]') {
                            //noinfo		
                        }
                        else {
                            var cinfo = [];
                            for (var i = 0; i < res_data.length; i++) {
                                var datapush = {
                                    cid: res_data[i].cid,
                                    name: res_data[i].name,
                                    code: res_data[i].code,
                                }
                                cinfo.push(datapush);
                            }
                            res.push(cinfo);
                        }
                        console.log(res);
                        //ws.send(JSON.stringify(res));
                    }
                    ws.send(JSON.stringify(res))
                })
                break;
            }
            case 'newClass': {
                var mes = JSON.parse(message);
                var c;
                var ok = true;
                let code = require('./service/code')
                let res = {
                    info_type: "newClass",
                    errcode: 0,
                };
                var func = async function () {
                    while (ok) {
                        c = code.buildCode();
                        var fs = "select cid from classinfo where code = '" + c + "'";
                        var fo = await query_async(fs)
                        if (JSON.stringify(fo) == '[]')
                            ok = false;
                        console.log("code:" + c);
                    }
                    var sql = "insert into classinfo (name,tea_no,code,reg,rid) values ('" + mes.name + "' , " + mes.tea_no + " , '" + c + "', 0 ,'" + mes.rid + "')"
                    pool.query(sql, function (err, result) {
                        if (err) {
                            res.errcode = 1;
                            console.log("新建班级失败", err.code);
                        }
                        ws.send(JSON.stringify(res));
                        console.log('sent')
                    })
                }()

                break;
            }
            case 'deleteClass': {
                var mes = JSON.parse(message);
                var sql = 'delete from classinfo where cid = ' + mes.cid + " and code = '" + mes.code + "'";
                console.log(sql)
                var res = {
                    info_type: 'deleteClass',
                    errcode: 0
                }
                pool.query(sql, function (err, result) {
                    if (err) {
                        res.errcode = 1;
                        console.log('删除classinfo失败:', err.code);
                    } else {
                        sql = 'delete from class where cid = ' + mes.cid
                        pool.query(sql, function (err, result) {
                            if (err) {
                                res.errcode = 1;
                                console.log('删除class失败', err.code);
                            }
                        })
                    }
                });
                ws.send(JSON.stringify(res));
                break;
            }
            case 'joinClass': {
                let mes = JSON.parse(message);
                var res = {
                    info_type: 'joinClass',
                    errcode: 0,
                    errtype: '',
                }
                let s1 = "select cid,name from classinfo where code = '" + mes.code + "'"
                pool.query(s1, function (err, result) {
                    if (err) {
                        //查找错误
                        res.errcode = 1;
                        res.errtype = 'dbError';
                        console.log(res.errtype)
                        ws.send(JSON.stringify(res));
                    } else {
                        let data = eval(result);
                        //console.log(data)
                        if (JSON.stringify(data) == '[]') {
                            //查询为空--不存在此班级
                            res.errcode = 1;
                            res.errtype = 'noSuchClass';
                            console.log(res.errtype)
                            ws.send(JSON.stringify(res));
                        }
                        else {
                            //有此班级
                            let s2 = "insert into class (cid,stu_no,snum,reg) values(" + data[0].cid + ", '" + mes.stu_no + "', 0 ,0)";
                            pool.query(s2, function (err, result) {
                                if (err) {
                                    res.errcode = 1;
                                    res.errtype = 'joinError';
                                    console.log(res.errtype)
                                }
                                ws.send(JSON.stringify(res));
                            })
                        }
                    }
                })
                break;
            }
            case 'myClassS': {
                var mes = JSON.parse(message);
                var sql = 'select classinfo.cid,name,code from classinfo join class on classinfo.cid = class.cid where stu_no=' + mes.stu_no;
                console.log(sql)
                var res = [{
                    info_type: "myClassS",
                    errcode: 0,
                }];
                pool.query(sql, function (err, result) {
                    if (err) {
                        res.errcode = 1;
                        console.log("查询课程失败", err.code);
                    }
                    else {
                        res_data = eval(result);
                        if (JSON.stringify(res_data) == '[]') {
                            //noinfo		
                        }
                        else {
                            var cinfo = [];
                            for (var i = 0; i < res_data.length; i++) {
                                var datapush = {
                                    cid: res_data[i].cid,
                                    name: res_data[i].name,
                                    code: res_data[i].code,
                                }
                                cinfo.push(datapush);
                            }
                            res.push(cinfo);
                        }
                        console.log(res);
                        ws.send(JSON.stringify(res));
                    }
                })
                break;
            }
            case 'quitClass': {
                let mes = JSON.parse(message);
                let sql = "delete from class where cid = '" + mes.cid + "' and stu_no = " + mes.stu_no;
                let res = {
                    info_type: 'quitClass',
                    errcode: 0,
                }
                pool.query(sql, function (err, result) {
                    if (err) {
                        res.errcode = 1;
                        console.log("quitclass error:", err)
                    }
                    ws.send(JSON.stringify(res));
                })
                break;
            }
            //12.2 bugfix
            case 'searchRoom': {
                let mes = JSON.parse(message);
                if (mes.roomid == null)
                    break;
                let sql = "select rid,roomid from room where roomid regexp '^" + mes.roomid + "'";
                let res = {
                    info_type: 'searchRoom',
                    errcode: 0,
                    roomList: []
                };
                //输入为空不搜索
                if (mes.roomid != '') {
                    pool.query(sql, function (err, result) {
                        if (err) {
                            res.errcode = 1;
                            console.log('searchRoom error:', err);
                        }
                        else {
                            data = eval(result);
                            if (JSON.stringify(data) == '[]') {
                                //noinfo
                            } else {
                                for (var i = 0; i < data.length; i++) {
                                    var datapush = {
                                        rid: data[i].rid,
                                        roomid: data[i].roomid
                                    }
                                    res.roomList.push(datapush);
                                }
                            }
                            console.log(res);
                        }
                        ws.send(JSON.stringify(res));
                    })
                }
            }
            case 'regTeacher': {
                let mes = JSON.parse(message);
                let sql = 'update classinfo set reg = ' + mes.reg + ' where cid = ' + mes.cid;
                let res = {
                    info_type: 'regTeacher',
                    errcode: 0,
                }
                pool.query(sql, function (err, result) {
                    if (err) {
                        res.errcode = 1;
                        console.log("reg change err:" + err);
                    }
                    ws.send(JSON.stringify(res));
                })
                break;
            }
            case 'regStudent': {
                let mes = JSON.parse(message);
                console.log(mes);
                let res = {
                    info_type: 'regStudent',
                    errcode: 0,
                }
                //判断一次课程签到状态
                let s1 = "select reg from classinfo where cid = " + mes.cid;
                let s2 = "update class set reg = 1 where stu_no = '" + mes.stu_no + "' and cid = " + mes.cid;
                pool.query(s1, function (err, result) {
                    if (err) {
                        res.errcode = 1;
                        console.log("查询状态err:", err)
                        ws.send(JSON.stringify(res))
                    }
                    else if (result[0].reg === 0) {
                        res.errcode = 2;
                        console.log('班级签到未开启');
                        ws.send(JSON.stringify(res))
                    }
                    else {
                        pool.query(s2, function (err, result) {
                            if (err) {
                                res.errcode = 1;
                                console.log(mes.stu_no, "签到失败:", err);
                            }
                            else {
                                console.log(mes.stu_no, '签到成功', res);
                            }
                            ws.send(JSON.stringify(res));
                        })
                    }
                })
                break;
            }
            //12.2 rebuild
            case 'regResult': {
                let mes = JSON.parse(message);
                console.log(mes);
                let f = require('./service/reg');
                //function赋值result，并重置reg状态
                f.func(mes.cid).then(result => {
                    console.log(result)
                    ws.send(JSON.stringify(result));
                })
                break;
            }
            case 'seatFunction': {
                //调用接口函数，发送http请求，返回boolean判断是否成功
                //row
                //column
                //operation

                let mes = JSON.parse(message);
                console.log(mes);
                let func = async function () {
                    let s1 = "select sid,status,did from seat where seat_row = '" + mes.row + "' and seat_column = '" + mes.column + "' and stu_no = '" + mes.stu_no + "'";
                    var seatInfo = await query_async(s1);
                    if (seatInfo.length > 0) {
                        let s = "s" + seatInfo[0].sid + ":";
                        s += seatInfo[0].status == 1 ? "3" : "1";
                        dev.deviceFunction(s, seatInfo[0].did, appinfo.api);
                        console.log("执行完成");
                        //1205 bug fix，通过request回调结果对库操作未完成
                        //1205 回调需要在封装一层
                        let st = seatInfo[0].status == 1 ? 3 : 1;
                        let s2 = "update seat set status = " + st + " where did = '" + seatInfo[0].did + "' and seat_row= '" + mes.row + "' and seat_column='" + mes.column + "' and stu_no = '" + mes.stu_no + "'";
                        await query_async(s2);
                        var res = [
                            {
                                info_type: 'seatFunction',
                                errcode: 0
                            }
                        ];
                        ws.send(JSON.stringify(res));
                    }
                    else {
                        //未找到座位
                        //暂无此情况发生场景
                    }
                }();
                break;
            }
            case 'computerWSConfirm': {
                console.log("Confirm computer ws connection");
                currentComputer = ws;
                let res = {
                    info_type: 'computerWSConfirm',
                    errcode: 0,
                }
                ws.send(JSON.stringify(res));
                break;
            }
            case 'startComputerControl': {
                console.log("start computer control");
                if (currentComputer == null) {
                    ws.send(JSON.stringify({
                        info_type: 'startComputerControl',
                        errcode: 1,
                        errReason: "noComputerWS"
                    }));
                } else {
                    /**
                     * NOW : 构建手机-电脑 Websocket pair
                     * TODO : 两者ws直接连接（微信小程序ws上限为2，可实现）,难点在于微信小程序要求wss连接，而一般电脑无ssl支持
                     * currentComputer 属性需要修改，无法应对不同电脑情况
                     */
                    controlPair.push({
                        user: ws,
                        computer: currentComputer
                    })
                    currentComputer.send(JSON.stringify({
                        info_type: 'checkReady',
                    }))
                }
                break;
            }
            case 'checkReady': {
                let mes = JSON.parse(message);
                let returnTarget = findUser(ws);
                if (mes.errcode == 0 && returnTarget != null) {
                    console.log("checkReady!!!");
                    returnTarget.send(JSON.stringify({
                        info_type: 'checkReady',
                        errcode: 0,
                    }))
                }
                break;
            }

            //无用户响应式移动,操作是否成功仅表现与鼠标是否移动
            case 'padMove': {
                let target = findComputer(ws);
                if (target != null) {
                    target.send(message);
                }
                break;
            }

            /**
             * 鼠标点击转发
             */
            case 'mouseClick': {
                console.log('mouseClick emit')
                let target = findComputer(ws);
                if(target != null){
                    target.send(message);
                }
                break;
            }

            /**
             * 字符串输入转发
             */
            case 'typeString': {
                console.log('typeString emit');
                let target = findComputer(ws);
                if(target != null){
                    target.send(message);
                }
                break;
            }

            /**
             * 12.10 单向断联通知用户和电脑
             * pair退出，通过方向向量direction检测消息传递方向
             * 正1为用户退出
             * 负1为电脑操作进程退出
             * 电脑检测到closePair消息时说明用户断开连接，返回至初始无连接状态
             * 用户检测到closePair消息时说明电脑断开连接，退出模拟操作页面
             */
            case 'closePair': {
                let mes = JSON.parse(message);
                let receiver = null;
                if (mes.direction == 1) {
                    receiver = findComputer(ws);
                } else if (mes.direction == -1) {
                    receiver = findUser(ws);
                }
                let res = {
                    info_type: 'closePair',
                }
                removePair(ws);  //移除pair
                if (receiver != null)
                    receiver.send(JSON.stringify(res));
                break;
            }

        }
        ws.on('close', function (code) {
            //模块化调用，删除匹配ws的pair记录
            removePair(this, controlPair);
        })
    });
});


function findUser(computer) {
    for (let i = 0; i < controlPair.length; i++)
        if (controlPair[i].computer == computer)
            return controlPair[i].user;
    return null;
}
function findComputer(user) {
    for (let i = 0; i < controlPair.length; i++)
        if (controlPair[i].user == user)
            return controlPair[i].computer;
    return null;
}


//12.8 模块化
//12.8 判断ws关闭方向并发送消息至未关闭一端
//12.7 bug1: fix
//12.7 bug1: pair删除失败
function removePair(entity, controlPair) {
    for (let i = 0; i < controlPair.length; i++) {
        if (controlPair[i].user == entity) {
            controlPair[i].computer.send(JSON.stringify({
                info_type: 'closePair'
            }))
            controlPair.splice(i, 1);
            console.log("移除user pair成功");
            break;
        } else if (controlPair[i].computer == entity) {
            controlPair[i].user.send(JSON.stringify({
                info_type: 'closePair'
            }))
            controlPair.splice(i, 1);
            console.log("移除computer pair成功");
            break;
        }
    }
}
/**
 * wss广播，未实装
 */
/*
wss.broadcast = function broadcast(ws){
    wss.clients.forEach(function bc(client){
        if(ws != client){
            client.send(JSON.stringify({
                infoType : 'broadcastTest',
                errcode : 0,
                wsInfo : ws
            }))
        }
    })
}
*/
