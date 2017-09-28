importScripts('web-miner.js');

const BLOB_LENGTH = 76;
const TARGET_LENGTH = 8*4;
const NONCE_OFFSET = 39;
const N_HASHES = 10; // make 100 hashes per round
const HASH_LENGTH = 32;

const ptr = {
  blob: 0,
  target: 0,
  hashes_done: 0,
  hash: 0
}

var blob, target, nonce;

var working = false;

function hexToUint8Array(str){
  var a = [];
  for( var i=0; i<str.length; i+= 2 ) {
    a.push(parseInt(str.substr(i, 2),16));
  }
  return new Uint8Array(a);
}

function uint8ArrayToHex(a){
  var s = "";
  for( var i=0; i<a.length; i+= 2 ) {
    s += ""+(a[i]).toString(16);
  }
  return s;
}

function prepare(){
  blob = blob || new Uint8Array(Module.HEAPU8.buffer, Module._blob_ptr(), BLOB_LENGTH);
  target = target || new Uint8Array(Module.HEAPU8.buffer, Module._target_ptr(), TARGET_LENGTH);
  nonce = new DataView(blob.buffer, blob.byteOffset+39, 8);
  
  ptr.hashes_done = ptr.hashes_done || Module._malloc(8);
  ptr.hash = ptr.hash || Module._malloc(HASH_LENGTH);
}



function extractHash(){
  var hashData = Module.HEAPU8.slice(ptr.hash, ptr.hash+HASH_LENGTH);
  return hashData;
}

function extractHashesDone(){
  var v = Module.getValue(ptr.hashes_done,"i64");
  return v;
}

function work() {
  //var nonce = extractNonce();
  // var max_hash = nonce.getUint32()+N_HASHES;

  //console.log('nonce is', new Uint8Array(nonce.buffer, nonce.byteOffset, 4));

  //console.log('performing',N_HASHES,' hashes, starting from', nonce.getUint32());
  // console.log('max_hash is', max_hash );

  var t0 = performance.now();
  var found = Module._cryptonight_work(N_HASHES, ptr.hashes_done);
  var t1 = performance.now();
  var delta = (t1-t0);
  
  //console.log('found:',found);
  var hashes_done = extractHashesDone();
  console.log('hashes done', hashes_done);
  console.log('hashrate', (1000*hashes_done/delta) );
  
  if( found ) {
    console.log("*** FOUND ***");
    console.log("extracting hash");
    console.log('hash before:', extractHash());
    Module._cryptonight_update_hash(ptr.hash);

    var hash = extractHash();
    console.log('hash:', hash);
    console.log('hash (hex):', uint8ArrayToHex(hash));
  }

  if( working && !found ){
    setTimeout(work,0);
  }
}

function onJob(job){
  prepare();

  var newJob = {
    blob: hexToUint8Array(job.blob),
    target: hexToUint8Array(job.target),
    job_id: job.job_id
  };
  
  blob.set(newJob.blob);
  
  target.fill(0);
  target.set(newJob.target, 7*4);

  console.log('blob is now', blob);
  
  console.assert(blob.byteLength == BLOB_LENGTH);
  console.assert(target.byteLength == TARGET_LENGTH);

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
  
  var next = ()=>console.log('nothing to do');
  
  switch(e.data.method){
    case "job": 
      next = ()=>onJob(e.data.params);
  }

  try{
    next();
  }catch(e){
    console.log('not ready yet',e);
    setTimeout(next, 100);
  }
  
};
