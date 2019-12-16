//9.17 dialog
//8.6 basic interface done
//7.15 sql fitting---current_value-->temperature(not seat status)

var request = require("request");
let trid = 2;//temp

let init = require('./initPool').init();
const pool = init.getPool();

//type 硬件种类
//did deviceId
//api
//rid roomId
//delay cronJob delay

//到时候要用type判断硬件种类
//暂定type:
//1 -- 温度传感器
//2 -- 湿度传感器
//3 -- 红外线设备
//4 -- 舵机(忽略)

//设备分组问题？
//红外线设备对应座位问题？
const TYPE_INFRARED = 1;

let stream = function loop(type, did, api, rid, delay) {
	var CronJob = require('cron').CronJob;
	let time = `*/${delay} * * * * *`

	//替换
	//let deviceName = type + did;
	let deviceName = type + "1";
	switch (type) {
		case TYPE_INFRARED: {
			new CronJob(time, function () 	//run a time per 3 second 
			{
				//当前：温度传感器
				request({
					//替换deviceGroupID
					url: "http://api.heclouds.com/devices/deviceGroupID/datastreams/" + deviceName,
					method: "get",
					json: true,
					headers: {
						//替换
						'api-key': api,
					}
				}, function (error, response, body) {
					//let temp = body.data.current_value;
					var res = [{
						info_type: "set_temperature",
						errcode: 0,
					}];
					//替换
					pool.query(`update room set temperature = ${body.data.current_value} where rid = ${trid}`,
						function (err, result) {
							if (err) {
								res.errcode = 1;
								console.log('温度设置错误:', err.code);
							}
							console.log(result)
							console.log(res);
						});
				});
			}, null, true, 'Asia/Shanghai');
			break;
		}
	}


}//active

module.exports = {
	stream: stream
}