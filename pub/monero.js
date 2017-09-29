
class Api {
  
  constructor( host, port, onJson ) {
    this.ws = new WebSocket(`ws://${host}:${port}/monero`);
    this.ws.onmessage = function(e){
      console.log('got message', e);
      try {
        var json = JSON.parse(e.data);
        onJson(json);
      }catch(e){
        console.error('invalid message',e);
      }
    }
  }

  submit( work ) {
    this.ws.send(JSON.stringify({
      method: "submit",
      params: work
    }));
  }

  // monero() {
  //   return fetch( `http://${this.host}:${this.port}/monero` )
  //     .then((res)=>{
  //       return res.json();
  //     })
  // }
}

var worker = new Worker('worker.js');

const api = new Api('localhost', 8089, (json)=>{
  switch(json.method) {
    case 'job': 
      worker.postMessage(json);
      break;
    default:
      console.log('unknown message',json);
      break;
  }
  //console.log('blob length', blob.byteLength);
});

worker.onmessage = function(e){
  console.log('got message from worker', e);
  switch(e.data.method) {
    case "submit": 
      console.log('submitting work',e.data.params);
      api.submit(e.data.params);
      break;
  }
}

// api.monero()
//  .then(function(res){
//   console.log('got response', res);
//  });
