var WebSocket = require('ws');
var localUrl = "ws://localhost:83";
var serverUrl = "wss://bzpnb.xyz:8080";
var robot = require("robotjs");
robot.setMouseDelay(2);
var screenSize = robot.getScreenSize();
var screenHeight = screenSize.height;
var screenWidth = screenSize.width;
var moveUnit = 2.3;//鼠标移动速度基准单位


var ws = new WebSocket(serverUrl);

ws.onopen = function(){
	console.log('open confirmed');
	var obj = {
		info_type : 'computerWSConfirm',
		errcode : 0
	};
	ws.send(JSON.stringify(obj));
};

ws.onmessage = function(message){
	var mes = JSON.parse(message.data);
	let res = {
		info_type : mes.info_type,
		errcode : 0
	}
	switch(mes.info_type){
		case 'computerWSConfirm':{
			console.log('#Computer : ws handshake done');
			break;
		}
		case 'checkReady':{
			console.log("#Computer: Ready check done");
			ws.send(JSON.stringify(res));
			break;
		}
		
		case 'padMove':{
			let sx = mes.speedX,sy = mes.speedY;
			let mouse = robot.getMousePos();
			robot.moveMouse(Math.min(screenWidth,Math.max(0,mouse.x + moveUnit * sx)), Math.min(screenHeight,Math.max(0,mouse.y + moveUnit * sy)));
			break;
		}
		/**
		 * 点击事件接口
		 * mes.button : 'left', 'right'
		 * mes.double : true, false
		 */
		case 'mouseClick':{
			console.log(`mouse click :${mes.button}`);
			robot.mouseClick(mes.button,mes.double);
			break;
		}

		/**
		 * 字符串输入接口
		 * mes.content : string
		 * 当前为立刻输入，输入速度无限制，如需要可选择typeStringDelayed(string,cpm)
		 */
		case 'typeString':{
			console.log(mes);
			robot.typeString(mes.content);
			break;
		}

		/**
		 * 鼠标滚动接口,xy方向基于标准坐标轴
		 * mes.x : number
		 * mes.y : number
		 */
		case 'scrollMouse':{
			console.log('scollMouse')
			break;
		}

		/**
		 * 键盘点击接口
		 * mes.key : string Keyname(left / middle / right)
		 * mes.modified : string | array 辅助按键(alt,command/win,control,shift)
		 */
		case 'keyTap':{
			console.log('keyTap')
			break;
		}
		
		/**
		 * 键盘长按接口
		 * mes.key : string , Keyname(left / middle / right)
		 * mes.down : string , down or up
		 * mes.modifier : string | array , 辅助按键(alt,command/win,control,shift) 
		 */
		case 'keyToggle':{
			console.log('keyToggle')
			break;
		}

		/**
		 * 检测用户退出连接
		 */
		case 'closePair':{
			console.log("检测到用户连接关闭");
			break;
		}
	}
};

ws.onclose = function(){
	console.log("#Computer : server ws关闭");
};
