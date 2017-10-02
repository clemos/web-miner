importScripts('cryptonight-miner.js');

const BLOB_LENGTH = 76;
const TARGET_LENGTH = 8*4;
const NONCE_OFFSET = 39;
const N_HASHES = 10; // make 100 hashes per round
const HASH_LENGTH = 32;

var nonce;
var currentJob = {};
var pendingJob;

var working = false;
var ready = false;

function hexToUint8Array(str){
  var a = [];
  for( var i=0; i<str.length; i+= 2 ) {
    a.push(parseInt(str.substr(i, 2),16));
  }
  return new Uint8Array(a);
}

function uint8ArrayToHex(a){
  var s = "";
  for( var i=0; i<a.length; i++ ) {
    var ch = (a[i]).toString(16);
    while(ch.length<2) ch = '0'+ch;
    s += ch;
  }
  return s;
}

function dataViewToHex(dv) {
  var s = "";
  for( var i=0; i<dv.byteLength; i++ ) {
    var ch = dv.getUint8(i).toString(16);
    while(ch.length<2) ch = '0'+ch;
    s += ch;
  }
  return s;
}

function prepare(){
  currentJob.blob = currentJob.blob || new Uint8Array(Module.HEAPU8.buffer, Module._get_blob_ptr(), BLOB_LENGTH);
  currentJob.target = currentJob.target || new Uint8Array(Module.HEAPU8.buffer, Module._get_target_ptr(), TARGET_LENGTH);
  
  // FIXME: optim
  nonce = new DataView(currentJob.blob.buffer, currentJob.blob.byteOffset+39, 4);

  ready = true;
}

function work() {
  var found = Module._do_scan(N_HASHES);
  var hashes_done = Module._get_hashes_done();
  
  if( found ) {
    submitWork();
  }

  if( working ){
    setTimeout(work,0);
  }

  postMessage({
    method: "stats",
    params: {
      hashes: hashes_done
    }
  });
}

function submitWork() {

  var hash_ptr = Module._update_current_hash();
  var hash = new Uint8Array(Module.HEAPU8.buffer, hash_ptr, HASH_LENGTH);

  var params = {
    job_id: currentJob.job_id,
    nonce: dataViewToHex(nonce),
    result: uint8ArrayToHex(hash)
  };

  postMessage({
    method: "submit",
    params: params
  });

  // increment nonce to continue working
  // FIXME: can we find another nonce and submit it with the same job_id ? I don't think so
  nonce.setUint32(0,nonce.getUint32(0,true)+1,true);
}

function onJob(job){

  pendingJob = job;
  if( !ready ) return;

  currentJob.job_id = job.job_id;
  currentJob.blob.set( hexToUint8Array(job.blob) );
  currentJob.target.fill(0);
  currentJob.target.set(hexToUint8Array(job.target), 7*4);

  pendingJob = null;
  working = true; 
}

//'{"blob":"0606a598a9ce05f643ea17ace14b4f3d4a82e6e07f11951043cfb82eb389eb436d28f8368f30a40000000099502e45a7f50a4fa49f6d860517a15560debfd247abc76a8c799a7b918fb54e0a","job_id":"241163350990973","target":"169f0200"}';
//38 30 0 0
// 261e 
var TEST_JOB = '{"blob":"0606a598a9ce05f643ea17ace14b4f3d4a82e6e07f11951043cfb82eb389eb436d28f8368f30a4261e000099502e45a7f50a4fa49f6d860517a15560debfd247abc76a8c799a7b918fb54e0a","job_id":"241163350990973","target":"169f0200"}';
var TEST_RESULT = '{"job_id":"241163350990973","nonce":"261e0000","result":"ccf63c4e3b22c27f7fcfc2f14facc3e583710f11578b8fb91d568a950e4a0100"}';

onmessage = function(e){  
  switch(e.data.method){
    case "job": 
      onJob(e.data.params);
  }
};

function init(){
  try{
    prepare();
    if(pendingJob) {
      onJob(pendingJob);
    }
    work();
  }catch(e){
    console.log('failed',e);
    setTimeout(init, 1);
  }
}

init();

