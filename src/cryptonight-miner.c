#include <stdio.h>
#include <emscripten/emscripten.h>

#include "algo/cryptonight.c"
#include "miner.h"

bool aes_ni_supported = true;
struct work_restart *work_restart = NULL; 
int opt_n_threads = 1;
struct work work = {{0}};
uint64_t* hashes_done;
uchar* hash;
uint32_t* nonceptr = (uint32_t*) (((char*)work.data) + 39);

void work_set_target_ratio(struct work* work, uint32_t* hash)
{
  // no op
}

#ifdef __cplusplus
extern "C" {
#endif

int main() {
  work_restart = (struct work_restart*) calloc(opt_n_threads, sizeof(*work_restart));
  hashes_done = malloc(8);
}

// return the current blob pointer
uint32_t* EMSCRIPTEN_KEEPALIVE get_blob_ptr() {
  return work.data;
}

// return the current target pointer
uint32_t* EMSCRIPTEN_KEEPALIVE get_target_ptr() {
  return work.target;
}

// return the number of hashes done (reset every time "scan" is run)
uint64_t EMSCRIPTEN_KEEPALIVE get_hashes_done() {
  return *hashes_done;
}

// computes at most "max_hashes", and returns 1 if a valid nonce is found
int EMSCRIPTEN_KEEPALIVE do_scan(uint32_t max_hashes) {
  
  uint32_t max_nonce = *nonceptr + max_hashes - 2;
  // run scan 
  *hashes_done = 0;
  int rc = 0;
  rc = scanhash_cryptonight(0, &work, max_nonce, hashes_done);

  return rc;
}

// updates current hash and returns its pointer
uchar* EMSCRIPTEN_KEEPALIVE update_current_hash() {
  cryptonight_hash(hash, work.data, 76);
  return hash;
}

#ifdef __cplusplus
}
#endif