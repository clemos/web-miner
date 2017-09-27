
class Api {
  
  constructor( host, port, onJob ) {
    var ws = new WebSocket(`ws://${host}:${port}/monero`);
    ws.onmessage = function(e){
      console.log('got message', e);
      try {
        var json = JSON.parse(e.data);
        switch(json.method) {
          case 'job': 
            onJob(json.params);
            break;
          default:
            console.log('unknown message',e.data);
            break;
        }
      }catch(e){
        console.error('invalid message',e);
      }
    }
  }

  // monero() {
  //   return fetch( `http://${this.host}:${this.port}/monero` )
  //     .then((res)=>{
  //       return res.json();
  //     })
  // }
}

var worker = new Worker('worker.js');
worker.onmessage = function(e){
  console.log('got message from worker', e);
}

const api = new Api('localhost', 8089, (job)=>{
  var msg = JSON.stringify(job);
  console.log('posting', msg);
  worker.postMessage(msg);

  //console.log('blob length', blob.byteLength);


});
// api.monero()
//  .then(function(res){
//   console.log('got response', res);
//  });
