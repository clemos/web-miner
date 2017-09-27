importScripts('web-miner.js');

const BLOB_LENGTH = 76;
const TARGET_LENGTH = 4;
const NONCE_OFFSET = 39;
const N_HASHES = 500; // make 100 hashes per round

const ptr = {
  blob: 0,
  target: 0
}

function hexToUint8Array(str){
  var a = [];
  for( var i=0; i<str.length; i+= 2 ) {
    a.push(parseInt(str.substr(i, 2),16));
  }
  return new Uint8Array(a);
}

function prepare(){
  ptr.blob = ptr.blob || Module._malloc(BLOB_LENGTH);
  ptr.target = ptr.target || Module._malloc(BLOB_LENGTH);
}

function extractNonce(){
  console.log('blob is', Module.HEAPU8.slice(ptr.blob, ptr.blob + BLOB_LENGTH));
  var nonceData = Module.HEAPU8.slice(ptr.blob+39, ptr.blob+39+4);
  console.log('nonce data',nonceData);
  var nonce = new Uint32Array(nonceData.buffer);
  console.log('nonce is', nonce);

  return nonce[0];
}

var working = false;

function work() {
  //extractNonce();

  var nonce = extractNonce();

  var max_hash = nonce+N_HASHES;

  console.log('performing',N_HASHES,' hashes, starting from', nonce);
  console.log('max_hash is', max_hash );

  var t0 = performance.now();
  var found = Module._test(ptr.blob, ptr.target, max_hash);
  var t1 = performance.now();
  var delta = (t1-t0);
  
  console.log('found:',found);
  console.log('hashrate', (1000*N_HASHES/delta) );

  if( working && !found ){
    setTimeout(work, 1);
  }

}

function doJob(job){
  prepare();

  console.log('decoding blob',job);
  var blob = hexToUint8Array(job.blob);
  var target = hexToUint8Array(job.target);
  
  console.assert(blob.byteLength == BLOB_LENGTH);
  console.assert(target.byteLength == TARGET_LENGTH);

  Module.HEAPU8.set(blob,ptr.blob);
  Module.HEAPU8.set(target,ptr.target);

  working = true;
  work();

  //extractNonce();

  // Module._free(blob_);
  // Module._free(target_);

  // run in a loop :|
  //setTimeout( function(){doJob(job);}, 100);

}

//'{"blob":"0606a598a9ce05f643ea17ace14b4f3d4a82e6e07f11951043cfb82eb389eb436d28f8368f30a40000000099502e45a7f50a4fa49f6d860517a15560debfd247abc76a8c799a7b918fb54e0a","job_id":"241163350990973","target":"169f0200"}';
//38 30 0 0
// 261e 
var TEST_JOB = '{"blob":"0606a598a9ce05f643ea17ace14b4f3d4a82e6e07f11951043cfb82eb389eb436d28f8368f30a4261e000099502e45a7f50a4fa49f6d860517a15560debfd247abc76a8c799a7b918fb54e0a","job_id":"241163350990973","target":"169f0200"}';

onmessage = function(e){  
  // e = {
  //   data : TEST_JOB
  // };
  console.log('got message',e);
  var job = JSON.parse(e.data);
  function next(){
    doJob(job);
  }
  try{
    next();
  }catch(e){
    console.log('not ready yet',e);
    setTimeout(next, 100);
  }
  
};
postMessage('hello !!');
