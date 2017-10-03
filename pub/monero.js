/**
  Returns a Promise that resolves to the parsed JSON data
*/
function maybeJson(data) {
  return new Promise((resolve, reject)=>{
    try {
      var json = JSON.parse(data);
      resolve(json);
    }catch(e){
      reject(e);
    }
  });
}

/**
  Very basic UI (see index.html)
*/
class MinerUI {
  constructor($el) {
    this.$nonces = $el.querySelector("[data-nonces]");
    this.$hashes = $el.querySelector("[data-hashes]");
    this.$hashrate = $el.querySelector("[data-hashrate]");

    // last time 'setStats' was called
    this.prevStatTime = 0;
    // number of nonces submitted
    this.nonces = 0;
    // number of hashes generated
    this.totalHashes = 0;
    // number of hashes per second
    this.hashrate = 0;
  }

  /**
    Updates internal state based on stats object coming from the miner
    stats must contain `hashes` = number of hashes done
  */
  setStats( stats ) {
    var now = performance.now();
    this.totalHashes += stats.hashes;
    if(this.prevStatTime) {
      var delta = now-this.prevStatTime;
      this.hashrate = 1000 * stats.hashes / delta;
    }
    this.prevStatTime = now;
  }

  /**
    Refreshes the HTML view
  */
  update() {
    this.$nonces.textContent = this.nonces;
    this.$hashes.textContent = this.totalHashes;
    this.$hashrate.textContent = this.hashrate || 'N/A';
  }

}

/**
  Manages the connection to the pool via a WebSocket
*/
class CryptonightPool {

  /**
    Constructor
    @param url  Host and port to the websocket server
    @param events Callbacks for incoming requests, like "job" when a new job is received
  */
  constructor(url, events) {
    this.socket = new WebSocket(`ws://${url}/`);
    this.dispatcher = new RpcDispatcher(events);
    this.socket.onmessage = (event) => {
      return maybeJson(event.data)
        .then(data => {this.dispatcher.run(data);})
        .catch(error =>{console.error(error);});
    }
  }

  /**
    Submits a work (nonce) to the pool
  */
  submit(work) {
    this.socket.send(JSON.stringify({
      method: "submit",
      params: work
    }));
  }
}

/**
  Dispatches a JSON RPC request
*/
class RpcDispatcher {
  /**
    Constructor
    @param routes   Mapping of method name to callback, ex: {"job":(job)=>doSomething(job)}
  */
  constructor(routes) {
    this.routes = routes;
  }
  /**
    Calls the function from `routes` corresponding to the `json` RPC call
    @param json   A JSON RPC payload, must contain `method` and `params`
  */
  run(json) {
    var method = json.method;
    var route = this.routes[method];
    if( typeof route == 'function' ) {
      route(json.params);
    } else {
      console.warn('no route found', json);
    }
  }
}

/**
  Handles one mining thread, via a Worker
*/
class CryptonightThread {

  /**
    Constructor
    @param workerUrl  URL to the mining worker
    @param events   Callbacks for events coming from the miner.
    Events can be :
      * `stats` : Called each round, with params { hashes : number of hashes calculated }
      * `submit` : When the miner found a valid nonce
  */
  constructor(workerUrl, events) {
    this.worker = new Worker(workerUrl);
    this.dispatcher = new RpcDispatcher(events);

    this.worker.onmessage = (event) => this.dispatcher.run(event.data);
  }

  /**
    Sets the current job of this thread (typically received from a pool)
  */
  setJob(job) {
    this.worker.postMessage({
      method: "job",
      params: job
    });
  }

}



const ui = new MinerUI(document.body);

const pool = new CryptonightPool('localhost:8089', {
  job: (job) => thread.setJob(job)
});

const thread = new CryptonightThread('cryptonight-worker.js',{
  submit: (work) => {
    // submit work to the pool
    pool.submit(work);
    // increase number of nonces and refresh view
    ui.nonces++;
    ui.update();
  },
  stats: (stats) => {
    ui.setStats(stats);
    ui.update();
  }
});



