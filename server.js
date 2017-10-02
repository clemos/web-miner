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
      host: 'localhost', 
      port: 3333
    },
    // WALLET FROM CPUMINER DEV ;)
    //wallet: '472haywQKoxFzf7asaQ4XKBc2foAY4ezk8HiN63ifW4iAbJiLnfmJfhHSR9XmVKw2WYPnszJV9MEHj9Z5WMK9VCNHaGLDmJ'
    wallet:'44pSi62rfqMd6Wc8atWs4oBfbTmQXjFxzg16GMqrXwwy5yaKqAfEvew1wZspP5vbDW1dVafopfxjmcjjHxqh6mheU15mJ9o'
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

wsServer.on('connection', (client)=>{
  var pool = new MoneroPool(config.monero);
  pool.on('job', (job)=>{
    sendJob(client, job);
  });

  pool.connect();
  client.on('message', (message)=>{
    try {
      var json = JSON.parse(message);
      switch(json.method) {
        case 'submit':
          console.log('submitting work',json.params);
          pool.submit(json.params).then((res)=>{
            console.log('done submitting work',res);
          });
          break;
      }
    }catch(e){
      console.error('invalid message from client',message,e);
    }
  });

  client.on('close',()=>{
    console.log('ws: connection closed');
    pool.destroy();
  });

}); 


