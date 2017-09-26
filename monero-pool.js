
module.exports = MoneroPool;

const Socket = require('net').Socket;

// TODO: implement "submit"
// FIXME: rename ?

function MoneroPool(config, _onJob) {

  const client = new Socket();

  var currentJob = null;

  function onConnect(){
    var q = JSON.stringify({
      "jsonrpc": "2.0",
      "id": "1",
      "method": "login",
      "params": {
        "login": config.wallet,
        "pass": "x", // FIXME: config
        "agent": "cpuminer"
      }
    });
    // FIXME: check login (with callback)
    console.log('logging in', q);
    client.write(q + '\r\n');
    client.on('data', (data)=>{
      try {
        var json = JSON.parse(data);
        if( json.result && json.result.job ) {
          return onJob( json.result.job );
        }
        switch ( json.method ) {
          case "job":
            return onJob( json.params );
            break;
          default:
            console.log('received unknown request', json );
        }
      } catch(e){
        console.log('failed to parse', data, e);
      }
    });
    client.on('close', ()=>{
      console.log('connection to pool closed');
    });
  }

  function onJob(job){
    console.log('got job', job);
    currentJob = job;
    if( _onJob ) {
      _onJob(job);
    }
  }

  this.getJob = function(){
    return currentJob;
  }

  this.connect = (cb) => {
    console.log('connecting to pool', config.pool);
    return client.connect(config.pool.port, config.pool.host, ()=>{
      console.log('monero pool connected !');
      if( cb ) cb();
      onConnect();
    });
  }
}