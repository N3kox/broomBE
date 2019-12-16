//12.7 temp finish
let pi = require('./initPool').init();
let pool = pi.getPool();
let asy = pi.query_async;

const DEVICE_TEMPERATURE = 0;
const DEVICE_HUMIDITY = 1;
const DEVICE_SONIC = 0;
const DEVICE_RAY = 1;

//权值按照功率配置
const sonicWeight = 10;             //超声波传感器权值
const rayWeight = 5;              //红外线权值
const temperatureWeight = 3;    //温度权值
const humidityWeight = 3;       //湿度权值

//任务分配
//由于cpu核心数量小，for循环查找代替最小堆查找

function findMinIndex(ArrWeight, numCPUs) {
	let mindex = 0;
	let min = ArrWeight[0];
	for (let index = 1; index < numCPUs; index++) {
		if (ArrWeight[index] < min) {
			mindex = index;
			min = ArrWeight[index];
		}
	}
	return mindex;
}

let fetchDevice = async function (numCPUs) {
	let res = {};
	//权值数组
	let ArrWeight = [];
	for (let index = 0; index < numCPUs; index++)
		ArrWeight[index] = 0;

	//事项安排数组
	let Arr = new Array(numCPUs);
	for (let index = 0; index < numCPUs; index++)
		Arr[index] = new Array();
	//console.log(Arr);

	//mysql 表大小写bug fix
	let s1 = 'select * from roomdevice';
	let s2 = 'select * from seatdevice';
	let roomDevice = eval(await asy(s1));
	let seatDevice = eval(await asy(s2));
	//let taskLen = roomDevice.length + seatDevice.length;
	//console.log(roomDevice);

	//最小堆添加硬件访问列表
	roomDevice.forEach(element => {
		let index = findMinIndex(ArrWeight, numCPUs);
		switch (element.type) {
			case DEVICE_TEMPERATURE: {
				ArrWeight[index] += temperatureWeight;
				break;
			}
			case DEVICE_HUMIDITY: {
				ArrWeight[index] += humidityWeight;
				break;
			}
			default: {
				console.log(`unknown roomDevice type : ${element.type}`);
				break;
			}
		}
		element.division = 0;
		Arr[index].push(element);
	});

	seatDevice.forEach(element => {
		let index = findMinIndex(ArrWeight, numCPUs);
		switch (element.type) {
			case DEVICE_RAY: {
				ArrWeight[index] += rayWeight;
				break;
			}
			case DEVICE_SONIC: {
				ArrWeight[index] += sonicWeight;
				break;
			}
			default: {
				console.log(`unknown seatDevice type : ${element.type}`);
				break;
			}
		}
		element.division = 1; //seatDevice
		Arr[index].push(element);
	})

	pool.end();
	return Arr;
};


module.exports = {
	fetchDevice: fetchDevice
}

