//12.7 temp finish

let pi = require('./initPool').init();
const pool = pi.getPool();
let query_async = pi.query_async;

//12.2 rebuild
//双重判断
//需要在座位上且点击签到

//寻找下标，未找到返回-1
let findIndex = function (a, list) {
	let i = 0;
	for (i; i < list.length; i++) {
		if (list[i].stu_no == a)
			return i;
	}
	if (i == list.length)
		return -1;
}

//返回班级签到状态
//签到为1
//签到失败为0
//或者是未在座位上为0，未签到为-1？
let setStatus = function (a, list) {
	let index = findIndex(a, list);
	if (index != -1)
		list[index].status = 1;
}


let setOthers = function (list) {
	for (let i = 0; i < list.length; i++) {
		if (list[i].status === undefined) {
			list[i].status = 0;
		}
	}
}


let resetReg = async function (cid) {
	let s4 = 'update classinfo set reg = 0 where cid = ' + cid;
	let s5 = 'update class set reg = 0 where cid = ' + cid;
	pool.query(s4, function (err, result) {
		if (err) {
			console.log(err)
		} else {
			pool.query(s5, function (err, result) {
				if (err) {
					console.log(err)
				}
				//pool.end();
			})
		}
	});
}


let func = async function (cid) {
	if (cid == undefined)
		return null;
	let r = 'select name,rid from classinfo where cid = ' + cid;
	let ret = await query_async(r);
	let name = '';
	let rid = '';

	//异步处理获取rid，如cid错误无法获取rid情况下，返回为空签到表
	if (ret.length > 0) {
		rid = ret[0].rid;
		name = ret[0].name;
	}
	else {
		return {
			info_type: 'regResult',
			errcode: 1,
		}
	}

	//顺序查询
	//三查询可重构
	let s1 = 'select stu_no from seat where rid = ' + rid + ' and status = 1'//座位上的
	let s2 = 'select class.stu_no,name from class left join stu on class.stu_no = stu.stu_no where cid = ' + cid//班级全体
	let s3 = 'select stu_no from class where reg = 1 and cid = ' + cid//点击签到的
	let seatList = await query_async(s1);
	let list = await query_async(s2);
	let regList = await query_async(s3);

	//对象数组标准对象:{stu_no:stu_no, status:judge?1:0}
	//遍历，签到成功对象status=1
	for (let i = 0; i < seatList.length; i++) {
		for (let j = 0; j < regList.length; j++) {
			if (seatList[i].stu_no == regList[j].stu_no) {
				setStatus(seatList[i].stu_no, list);
				break;
			}
		}
	}
	//签到失败对象status=0
	setOthers(list);

	//获取签到表部分结束
	//重置签到状态reg（班级签到状态+成员签到信息）
	resetReg(cid);

	let backData = {
		info_type: 'regResult',
		errcode: 0,
		name: name,
		result: list
	}
	return backData;
};

module.exports = {
	func: func
}
