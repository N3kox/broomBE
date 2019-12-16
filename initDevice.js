//12.7 temp finish
/*
    设备数据获取初始化js
    进程数量=本机cpu核心数量
    可读取initDeviceConfig作为基本配置
    进程负载尽可能均匀（权值分配最优-暂定传感器权值5，舵机权值1）

*/

const cluster = require('cluster')
const numCPUs = require('os').cpus().length

/*
//多核处理测试
function fibonacci (n) {
    return n === 0? 0: n === 1 ? 1 : fibonacci(n - 1) + fibonacci(n - 2)
 }
*/

let initDevice = function(){
    if(cluster.isMaster){
        let fetchDevice = require('./service/fetchDevice').fetchDevice(numCPUs).then(result=>{
            let index = 0;
            for(;index<numCPUs;index++){
                let mes  = {
                    deviceInfo : result[index]
                }
                //console.log(mes)
                const worker = cluster.fork();
                worker.send(mes);
            }
            cluster.on('message',(worker,message,handle)=>{
                //主线程处理子线程消息
                console.log(`[Main] Worker-${worker.id} end work with message : ${message}`);
                if(--index==0)
                    cluster.disconnect();
            })
            cluster.on('exit',(worker,code,signal)=>{
                //主线程处理子线程销毁
                
            })
            
            
        });
    }else if(cluster.isWorker){
        process.on('message', (mes)=>{
            console.log(`[Worker] pid-${process.pid} start`);
            var job = require('./service/initDeviceStream')
            if(mes.deviceInfo.length == 0){
                process.send('进程无任务');
            }else{
                let ind = 0;
                mes.deviceInfo.forEach((element=>{
                    job.stream(element,3);
                }))
                /*
                while(ind < mes.deviceInfo.length){
                    setTimeout(()=>{
                        console.log(mes.deviceInfo[ind]);
                        job.stream(mes.deviceInfo[ind],3);
                    },1000);
                    ind++;
                }
                */
                console.log("进程任务启动任务完成")
            }
        })
    }
}();
