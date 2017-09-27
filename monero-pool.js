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
    client.on('data', (data)=>this.onData(data));
    client.on('json', (json)=>this.onJson(json));
    client.on('close', ()=>this.onClose());
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

  onClose() {
    console.log('connection to pool closed');
  }

  request(method, params) {
    //console.log('request',method,params);
    return new Promise((resolve, reject)=>{
      var reqId = this.getRequestId();
      var req = {
        "jsonrpc": "2.0",
        "id": reqId,
        "method": method,
        "params": params
      };

      console.log('logging in', req);

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

  connect(cb){
    console.log('connecting to pool', this.config.pool);
    return this.client.connect(this.config.pool.port, this.config.pool.host, ()=>{
      // FIXME: should be able to reconnect
      console.log('monero pool connected !');
      if( cb ) cb();
      this.onConnect();
    });
  }
}

module.exports = MoneroPool;