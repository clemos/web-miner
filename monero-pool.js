"use strict";

const Socket = require('net').Socket;
const EventEmitter = require('events');

// TODO: implement "submit"
// FIXME: rename ?

class MoneroPool extends EventEmitter {

  constructor(config){
    super();
    this.currentJob = null;
    this.currentReqId = 0;
    this.config = config;
    
    var client = this.client = new Socket();
    client.setTimeout(300*1000); // 300 seconds, like cpu-miner FIXME: set in config?
    client.on('data', (data)=>this.onData(data));
    client.on('json', (json)=>this.onJson(json));
    client.on('close', ()=>{
      console.log('socket closed');
    });
    client.on('timeout', ()=>{
      console.log('socket timed out');
      console.log('reconnecting...');
      this.client.destroy();
      this.connect();
    });
    client.on('end', ()=>{
      console.log('socket ended');
    });
  }
   
  getRequestId() {
    return "" + (++this.currentReqId);
  }

  onData(buffer) {
    try{
      var json = JSON.parse(buffer.toString());
      this.client.emit('json', json);
    }catch(e){
      console.error('Invalid json data: '+buffer.toString(), e);
    }
  }

  onJson(data) {
    console.log('JSON =>',data);
    if(data.method) {
      switch(data.method) {
        case 'job': 
          this.onJob(data.params);
          break;
        default:
          console.error('Unknown command', data);
          break;
      }
    }
  }

  request(method, params) {
    console.log('request',method,params);
    return new Promise((resolve, reject)=>{
      var reqId = this.getRequestId();
      var req = {
        "jsonrpc": "2.0",
        "id": reqId,
        "method": method,
        "params": params
      };

      // register listener
      var onJson;
      onJson = (res)=>{
        //console.log('res',res);
        if (res.id==reqId) {
          this.client.removeListener('json', onJson);
          if(res.error || !res.result) {
            return reject(res.error);
          } else {
            return resolve(res.result);
          }
        }
      };

      this.client.on('json', onJson);
      this.write(req);
    });
  }

  write(data) {
    return this.client.write(JSON.stringify(data) + '\r\n');
  }

  onConnect(){
    console.log('connected, logging in');
    this.request('login', {
        "login": this.config.wallet,
        "pass": "x", // FIXME: config
        "agent": "cpuminer"
      })
      .then((res)=>{
        console.log('got login response',res);
        this.clientId = res.id;
        if( res.job ) {
          this.onJob(res.job);
        }
      });
  }

  onJob(job){
    this.currentJob = job;
    this.emit("job", job);
  }

  getJob(){
    return this.currentJob;
  }

  submit(work){
    console.log('** submitting **');
    return this.request('submit', {
      id: this.clientId,
      job_id: work.job_id,
      nonce: work.nonce,
      result: work.result
    })
    .then((res)=>{
      console.log('got submit response',res);
    })
    .catch((res)=>{
      console.log('got submit error',res);
      // FIXME: sometimes returns { error: { code: -1, message: 'Unauthenticated' } } }
      // in which case a reconnection is probably necessary (?)
    });
  }

  connect() {
    console.log('connecting to pool', this.config.pool);
    return this.client.connect(this.config.pool.port, this.config.pool.host, ()=>{
      this.onConnect();
    });
  }

  destroy() {
    return this.client.destroy();
  }
}

module.exports = MoneroPool;