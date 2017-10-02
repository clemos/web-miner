
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


var prevStatTime;
var nonces = 0;
var totalHashes = 0;
var $nonces = document.getElementById("nonces");
var $hashes = document.getElementById("hashes");
var $hashrate = document.getElementById("hashrate");
function updateView(stats) {
  $nonces.textContent = nonces;
  if( stats ) {
    totalHashes += stats.hashes;
    $hashes.textContent = totalHashes;
    if( prevStatTime ) {
      var now = performance.now();
      var delta = now-prevStatTime;
      var hashrate = 1000 * stats.hashes / delta;
      $hashrate.textContent = hashrate;
    }
  }
}

var worker = new Worker('cryptonight-worker.js');

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
      api.submit(e.data.params);
      nonces++;
      updateView();
      break;
    case "stats":
      updateView(e.data.params);
      prevStatTime = performance.now();
      break;
      
  }
}

// api.monero()
//  .then(function(res){
//   console.log('got response', res);
//  });
