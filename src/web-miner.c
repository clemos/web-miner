#include <stdio.h>
#include <emscripten/emscripten.h>

#include "algo/cryptonight.c"
#include "miner.h"

bool aes_ni_supported = true;
struct work_restart *work_restart = NULL; 
int opt_n_threads = 1;
struct work work = {{0}};
uint64_t hashes_done = 0;
uint32_t* nonceptr = (uint32_t*) (((char*)work.data) + 39);

char *abin2hex(const unsigned char *p, size_t len)
{
  char *s = (char*) malloc((len * 2) + 1);
  if (!s)
    return NULL;
  bin2hex(s, p, len);
  return s;
}

bool hex2bin(unsigned char *p, const char *hexstr, size_t len)
{
  char hex_byte[3];
  char *ep;

  hex_byte[2] = '\0';

  while (*hexstr && len) {
    if (!hexstr[1]) {
      //applog(LOG_ERR, "hex2bin str truncated");
      return false;
    }
    hex_byte[0] = hexstr[0];
    hex_byte[1] = hexstr[1];
    *p = (unsigned char) strtol(hex_byte, &ep, 16);
    if (*ep) {
      //applog(LOG_ERR, "hex2bin failed on '%s'", hex_byte);
      return false;
    }
    p++;
    hexstr += 2;
    len--;
  }

  return(!len) ? true : false;
/*  return (len == 0 && *hexstr == 0) ? true : false; */
}

// compute the diff ratio between a found hash and the target
double hash_target_ratio(uint32_t* hash, uint32_t* target)
{
  double dhash;

  // FIXME wtf
  return dhash;
}

// store the share ratio in work struct
void work_set_target_ratio(struct work* work, uint32_t* hash)
{
  // only if the option is enabled (to reduce cpu usage)
  if (work) {
    work->shareratio = hash_target_ratio(hash, work->target);
    work->sharediff = work->targetdiff * work->shareratio;
    
    EM_ASM({console.log("share diff",$0,$1)}, work->sharediff, work->shareratio);
  }
}

#ifdef __cplusplus
extern "C" {
#endif

uint32_t* EMSCRIPTEN_KEEPALIVE blob_ptr() {
  return work.data;
}

uint32_t* EMSCRIPTEN_KEEPALIVE target_ptr() {
  return work.target;
}

int EMSCRIPTEN_KEEPALIVE cryptonight_work( 
  uint32_t max_hashes, 
  uint64_t* hashes_done,  
  uchar* hash,
  char* job_id) {

  work_restart = (struct work_restart*) calloc(opt_n_threads, sizeof(*work_restart));
  
  uint32_t max_nonce = *nonceptr + max_hashes;

   // run scan 
  *hashes_done = 0;
  int rc = 0;
  rc = scanhash_cryptonight(0, &work, max_nonce, hashes_done);

  return rc;
}

int EMSCRIPTEN_KEEPALIVE cryptonight_update_hash( uchar* hash ) {
  cryptonight_hash(hash, work.data, 76);

  return 1;
}

#ifdef __cplusplus
}
#endif