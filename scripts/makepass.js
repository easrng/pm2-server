#!/usr/bin/env node
import crypto from "crypto";
import sp from "sodium-plus";
const { SodiumPlus } = sp;
const sodium = await SodiumPlus.auto();
const password = crypto.randomBytes(25).toString("base64url");
const hash = await sodium.crypto_pwhash_str(
  password,
  sodium.CRYPTO_PWHASH_OPSLIMIT_INTERACTIVE,
  sodium.CRYPTO_PWHASH_MEMLIMIT_INTERACTIVE
);
console.log("pass:", password);
console.log("hash:", hash);
