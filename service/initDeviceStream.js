//12.7 finish
//9.17 dialog
//8.6 basic interface done
//7.15 sql fitting---current_value-->temperature(not seat status)

var request = require("request");
let trid = 2;//temp

let init = require('./initPool').init();
const pool = init.getPool();

const DIVISION_ROOM = 0;
const DIVISION_SEAT = 1;

// url : `http://api.heclouds.com/devices/${did}/datastreams/${deviceName}`
// 'api-key' : api
//
let stream = function loop(deviceInfo, delay) {
	var CronJob = require('cron').CronJob;
	let time = `*/${delay} * * * * *`;
	//判断硬件种类（room / seat)
	console.log(deviceInfo);
	if (deviceInfo.division == DIVISION_ROOM) {
		if (deviceInfo.type == 0) {
			//温度传感器
			new CronJob(time, function () {
				request({
					//替换
					url: `http://api.heclouds.com/devices/${deviceInfo.did}/datastreams/${deviceInfo.devicename}`,
					method: "get",
					json: true,
					headers: {
						'api-key': deviceInfo.api,
					}
				}, function (error, response, body) {
					if (error) {
						console.log("error");
					} else {
						var res = [{
							info_type: "setTemperature",
							errcode: 0,
						}];
						console.log(`温度:${body.data.current_value}`);
						pool.query(`update room set temperature = ${body.data.current_value} where rid = ${deviceInfo.rid}`,
							function (err, result) {
								if (err) {
									res.errcode = 1;
									console.log('温度设置错误:', err.code);
								} else {
									console.log(`changedRows : ${result.changedRows}`);
								}
							});
					}
				});
			}, null, true, 'Asia/Shanghai');
		} else if (deviceInfo.type == 1) {
			//湿度传感器
			new CronJob(time, function () {
				request({
					//替换
					url: `http://api.heclouds.com/devices/${deviceInfo.did}/datastreams/${deviceInfo.devicename}`,
					method: "get",
					json: true,
					headers: {
						'api-key': deviceInfo.api,
					}
				}, function (error, response, body) {
					if (error) {
						console.log("error");
					} else {
						var res = [{
							info_type: "setHumidity",
							errcode: 0,
						}];
						console.log(`湿度:${body.data.current_value}`);
						pool.query(`update room set humidity = ${body.data.current_value} where rid = ${deviceInfo.rid}`,
							function (err, result) {
								if (err) {
									res.errcode = 1;
									console.log('湿度设置错误:', err.code);
								} else {
									console.log(`changedRows : ${result.changedRows}`);
								}
							});
					}
				});
			}, null, true, 'Asia/Shanghai');
		}

	} else if (deviceInfo.division == DIVISION_SEAT) {
		if (deviceInfo.type == 0) {
			//超声波传感器
			new CronJob(time, function () 	//run a time per 3 second 
			{
				request({
					url: `http://api.heclouds.com/devices/${deviceInfo.did}/datastreams/${deviceInfo.devicename}`,
					method: "get",
					json: true,
					headers: {
						'api-key': deviceInfo.api,
					}
				}, function (error, response, body) {
					if (error) {
						console.log("Sonic net error!!");
						console.log(error);
					} else {
						var res = [{
							info_type: "setSonicStatus",
							errcode: 0,
						}];
						console.log(`座椅${deviceInfo.sid}:${body.data.current_value}`);
						pool.query(`update seat set status = ${body.data.current_value} where sid = ${deviceInfo.sid} and stu_no is not null and rid = (select rid from classinfo where classinfo.rid = seat.rid and classinfo.reg = 1)`,
							function (err, result) {
								if (err) {
									res.errcode = 1;
									console.log('座位status设置错误:', err.code);
								}
								console.log(`changedRows : ${result.changedRows}`);
							});
					}
				});
			}, null, true, 'Asia/Shanghai');
		} else if (deviceInfo.type == 1) {
			//红外线传感器
			//略

		} else {
			console.log("unknown device");
		}
	} else {
		console.log("unknown device group");
		console.log(deviceInfo);
	}

}

module.exports = {
	stream: stream
}