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

function sendJob(client, job) {
  client.send(JSON.stringify({
    method:"job",
    params: job
  }))
}

const wsServer = new ws.Server({port: config.ws.port});

const pool = new MoneroPool( config.monero );
pool.on('job', (job)=>{
  console.log('broadcasting job', job);
  wsServer.clients.forEach((client)=>{
    if (client.readyState === ws.OPEN) {
      sendJob(client, job);
    }
  });
});

pool.connect();

wsServer.on('connection', (client)=>{
  var job;
  if(job = pool.getJob()) {
    sendJob(client, job);  
  }
}); 


