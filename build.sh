#!/bin/sh
emcc src/cryptonight-miner.c \
third-party/cpuminer-multi/crypto/hash.c \
third-party/cpuminer-multi/crypto/c_keccak.c \
third-party/cpuminer-multi/crypto/c_skein.c \
third-party/cpuminer-multi/crypto/c_blake256.c \
third-party/cpuminer-multi/crypto/c_groestl.c \
third-party/cpuminer-multi/crypto/aesb.c \
third-party/cpuminer-multi/crypto/c_jh.c \
third-party/cpuminer-multi/crypto/oaes_lib.c \
third-party/cpuminer-multi/crypto/aesb.c \
-s WASM=1 \
-o pub/cryptonight-miner.js \
-s NO_EXIT_RUNTIME=1 \
-I third-party/cpuminer-multi/ \
-O1 \
-D NOASM=1