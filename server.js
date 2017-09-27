"use strict";

const http = require("http");
const ws = require("ws");
const MoneroPool = require("./monero-pool");

const config = {
  http: {
    port: 8088
  },
  ws: {
    port: 8089
  },
  monero: {
    pool: {
      host: 'mine.moneropool.com', 
      port: 3333
    },
    // WALLET FROM CPUMINER DEV ;)
    wallet: '472haywQKoxFzf7asaQ4XKBc2foAY4ezk8HiN63ifW4iAbJiLnfmJfhHSR9XmVKw2WYPnszJV9MEHj9Z5WMK9VCNHaGLDmJ'
  }
}

function handleError(emitter) {
  emitter.on('error', (e)=>{
    console.log('got error', e);
  })
}

const wsServer = new ws.Server({port: config.ws.port});

const pool = new MoneroPool( config.monero );
pool.on('job', (job)=>{
  console.log('broadcasting job', job);
  wsServer.clients.forEach((client)=>{
    if (client.readyState === ws.OPEN) {
      client.send(JSON.stringify(job));
    }
  });
});

const httpServer = http.createServer((req,res)=>{
  // cors
  if( req.headers['origin'] ) {
    res.setHeader('Access-Control-Allow-Origin', req.headers['origin']);
  }

  const parts = req.url.split("/").slice(1);
  switch(parts[0]) {
    case 'monero':
      res.end(JSON.stringify(pool.getJob()));
      break;
    default:
      res.status = 400;
      res.end('Bad Request');
  }

});

pool.connect();
httpServer.listen(config.http.port, ()=>{
  console.log(`listening on ${config.port}`);
});

// fixme : doesn't necessarily have a job here
wsServer.on('connection', (socket)=>{
  socket.send( JSON.stringify(pool.getJob()) );
}); 


